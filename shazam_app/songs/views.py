from __future__ import annotations

import io
import subprocess
from collections import defaultdict

import librosa
import numpy as np
import soundfile as sf
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from songs.fingerprint import fingerprint_bytes_data
from songs.models import Fingerprint, Song, UserSongInteraction

# ── Tuning constants ──────────────────────────────────────────────────────────

SAMPLE_RATE           = 44_100
MIN_CLIP_DURATION_SEC = 3.0    # reject clips shorter than this
MIN_FINGERPRINTS      = 20     # reject clips with too few hashes
MIN_VOTES             = 5      # absolute vote floor
MIN_CONFIDENCE        = 0.05   # composite confidence floor (0–1)

# Noise-gate: frames whose RMS is below this fraction of the clip peak are silence
VAD_THRESHOLD            = 0.02
# Spectral gate: noise floor estimated from the quietest N% of STFT frames
SPECTRAL_GATE_PERCENTILE = 10
SPECTRAL_GATE_FACTOR     = 1.5   # multiply estimated noise floor by this


# ── Audio utilities ───────────────────────────────────────────────────────────

def convert_to_wav(audio_bytes: bytes) -> bytes:
    """Convert any FFmpeg-readable audio to 44 100 Hz mono 16-bit WAV bytes."""
    command = [
        "ffmpeg", "-y",
        "-i", "pipe:0",
        "-ar", str(SAMPLE_RATE),
        "-ac", "1",
        "-sample_fmt", "s16",
        "-f", "wav",
        "pipe:1",
    ]
    proc = subprocess.run(
        command,
        input=audio_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace")
        raise ValueError(f"FFmpeg conversion failed: {stderr[-500:]}")
    return proc.stdout


def spectral_gate(y: np.ndarray, sr: int) -> np.ndarray:
    n_fft = 2048
    hop   = n_fft // 4
    stft  = librosa.stft(y, n_fft=n_fft, hop_length=hop)
    mag, phase = np.abs(stft), np.angle(stft)

    frame_power = mag.mean(axis=0)
    noise_mask  = frame_power < np.percentile(frame_power, SPECTRAL_GATE_PERCENTILE)
    noise_profile = (
        mag[:, noise_mask].mean(axis=1, keepdims=True)
        if noise_mask.any()
        else mag.mean(axis=1, keepdims=True) * 0.1
    )

    mag_gated = np.maximum(mag - noise_profile * SPECTRAL_GATE_FACTOR, 0.0)
    return librosa.istft(mag_gated * np.exp(1j * phase), hop_length=hop)


def voice_activity_trim(y: np.ndarray, sr: int) -> np.ndarray:
    """
    Strip leading/trailing silence with a simple energy VAD.
    Falls back to the original array if trimming would make the clip too short.
    """
    frame_len = int(sr * 0.025)
    hop_len   = frame_len // 2
    rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop_len)[0]

    if rms.max() == 0:
        return y

    active = rms > (rms.max() * VAD_THRESHOLD)
    if not active.any():
        return y

    first   = int(np.argmax(active)) * hop_len
    last    = int(len(active) - 1 - np.argmax(active[::-1])) * hop_len + frame_len
    trimmed = y[first:last]
    return trimmed if len(trimmed) > sr * MIN_CLIP_DURATION_SEC else y


def normalize_audio(y: np.ndarray) -> np.ndarray:
    """Peak-normalize to ±0.95 so volume differences don't affect fingerprinting."""
    peak = np.abs(y).max()
    return y / peak * 0.95 if peak > 1e-6 else y


def preprocess_audio(wav_bytes: bytes) -> bytes:
    """
    Full noise-reduction pipeline applied to query audio before fingerprinting:
      1. Load WAV
      2. Validate duration and loudness
      3. Voice-activity trim
      4. Spectral gate
      5. Peak normalization
      6. Return cleaned WAV bytes
    """
    y, sr = librosa.load(io.BytesIO(wav_bytes), sr=SAMPLE_RATE, mono=True)

    if len(y) / sr < MIN_CLIP_DURATION_SEC:
        raise ValueError(
            f"Clip is too short ({len(y)/sr:.1f}s). "
            f"Minimum required: {MIN_CLIP_DURATION_SEC}s."
        )

    if np.sqrt(np.mean(y ** 2)) < 1e-4:
        raise ValueError("Audio is too silent to fingerprint.")

    y = voice_activity_trim(y, sr)
    y = spectral_gate(y, sr)
    y = normalize_audio(y)

    out = io.BytesIO()
    sf.write(out, y, sr, subtype="PCM_16", format="WAV")
    return out.getvalue()


# ── Confidence scoring ────────────────────────────────────────────────────────

def compute_confidence(
    best_votes: int,
    second_votes: int,
    total_query_hashes: int,
    matching_hashes: int,
) -> float:
    """
    Composite confidence score in [0, 1].

    Components
    ──────────
    peak_ratio  (40 %) — how dominant the winner is vs the runner-up.
                          Protects against two songs scoring nearly the same.
    coverage    (35 %) — what fraction of query hashes matched anything in the
                          DB.  Low coverage = noisy or very short clip.
    density     (25 %) — votes per query hash, normalised.  Rewards clips where
                          many hashes align, not just a lucky burst of matches.
    """
    peak_ratio = (
        min(best_votes / (second_votes + 1e-9), 10.0) / 10.0
        if second_votes > 0
        else 1.0
    )
    coverage = min(matching_hashes / max(total_query_hashes, 1), 1.0)
    density  = min(best_votes / max(total_query_hashes * 0.3, 1), 1.0)

    return peak_ratio * 0.40 + coverage * 0.35 + density * 0.25


# ── View ──────────────────────────────────────────────────────────────────────

class RecognizeView(APIView):
    """
    POST /api/recognize/
    Body (multipart/form-data):
        audio  — audio file (any format FFmpeg can read: mp3, wav, ogg, m4a …)

    Returns the best matching song or a 'no match' response.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request) -> Response:
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response(
                {"error": 'No audio file provided. Send a file under the key "audio".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_bytes = audio_file.read()
        if not raw_bytes:
            return Response(
                {"error": "Uploaded file is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 1. Convert to standardised WAV ───────────────────────────────────
        try:
            wav_bytes = convert_to_wav(raw_bytes)
        except ValueError as exc:
            return Response(
                {"error": f"Audio conversion failed: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # ── 2. Noise pre-processing ──────────────────────────────────────────
        try:
            clean_wav = preprocess_audio(wav_bytes)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except Exception as exc:
            return Response(
                {"error": f"Audio pre-processing error: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # ── 3. Fingerprint ───────────────────────────────────────────────────
        try:
            query_hashes: list[tuple[str, int]] = fingerprint_bytes_data(clean_wav)
        except Exception as exc:
            return Response(
                {"error": f"Fingerprinting failed: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not query_hashes or len(query_hashes) < MIN_FINGERPRINTS:
            return Response(
                {
                    "error": (
                        f"Too few fingerprints extracted ({len(query_hashes or [])})."
                        " The clip may be too quiet, too short, or heavily distorted."
                    )
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # ── 4. Build multi-offset query map ──────────────────────────────────
        #
        # A hash can appear at multiple time offsets in the same clip
        # (e.g. a repeating drum pattern).  Storing hash → [t0, t1, …] ensures
        # every occurrence casts its vote in the histogram.
        # The original {h: t} dict literal silently kept only the LAST offset.
        #
        query_offset_map: dict[str, list[int]] = defaultdict(list)
        for h, t in query_hashes:
            query_offset_map[h].append(t)

        hash_strings = list(query_offset_map.keys())

        # ── 5. Database lookup ───────────────────────────────────────────────
        db_matches = (
            Fingerprint.objects
            .filter(hash_value__in=hash_strings)
            .values("hash_value", "offset", "song_id")
        )

        # ── 6. Shazam-style delta histogram ──────────────────────────────────
        #
        # delta = db_offset − query_offset
        # For the correct song, all matching (hash, db_offset, query_offset)
        # triples produce the same delta (= clip's start position in the track).
        # We count those clusters; the song with the tallest cluster wins.
        #
        histogram: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
        matched_hash_set: set[str] = set()

        for row in db_matches:
            h    = row["hash_value"]
            q_ts = query_offset_map.get(h)
            if not q_ts:
                continue
            matched_hash_set.add(h)
            for q_t in q_ts:
                delta = row["offset"] - q_t
                histogram[row["song_id"]][delta] += 1

        if not histogram:
            return Response({"match": False, "message": "No match found."})

        # ── 7. Rank candidates ───────────────────────────────────────────────
        song_scores = {
            sid: max(deltas.values()) for sid, deltas in histogram.items()
        }
        ranked = sorted(song_scores.items(), key=lambda kv: kv[1], reverse=True)

        best_song_id, best_votes = ranked[0]
        second_votes             = ranked[1][1] if len(ranked) > 1 else 0

        # ── 8. Confidence gate ───────────────────────────────────────────────
        if best_votes < MIN_VOTES:
            return Response(
                {
                    "match":      False,
                    "message":    "No confident match found.",
                    "best_votes": best_votes,
                }
            )

        confidence = compute_confidence(
            best_votes=best_votes,
            second_votes=second_votes,
            total_query_hashes=len(query_hashes),
            matching_hashes=len(matched_hash_set),
        )

        if confidence < MIN_CONFIDENCE:
            return Response(
                {
                    "match":      False,
                    "message":    "Match confidence too low.",
                    "confidence": round(confidence, 4),
                }
            )

        # ── 9. Return result ─────────────────────────────────────────────────
        song = Song.objects.get(pk=best_song_id)

        return Response(
            {
                "match": True,
                "song": {
                    "id":               song.pk,
                    "title":            song.title,
                    "artist":           song.artist,
                    "album":            song.album,
                    "duration_seconds": song.duration_seconds,
                    'lyrics' : song.lyrics
                },
                "confidence":     round(confidence, 4),
                "votes":          best_votes,
                "matched_hashes": len(matched_hash_set),
                "total_hashes":   len(query_hashes),
            }
        )


def serialize_user(user: User) -> dict:
    return {
        "id": user.pk,
        "username": user.username,
        "email": user.email,
    }


def serialize_interaction(interaction: UserSongInteraction) -> dict:
    song = interaction.song
    return {
        "songId": song.pk,
        "title": song.title,
        "artist": song.artist,
        "album": song.album,
        "lyrics": song.lyrics,
        "durationSeconds": song.duration_seconds,
        "favorite": interaction.favorite,
        "rating": interaction.rating,
        "note": interaction.note,
        "playlist": interaction.playlist,
        "updatedAt": interaction.updated_at.isoformat(),
    }


def auth_response(user: User) -> Response:
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": serialize_user(user)})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"error": "That username is already taken."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        return auth_response(user)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request) -> Response:
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return auth_response(user)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        return Response({"user": serialize_user(request.user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InteractionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        interactions = (
            UserSongInteraction.objects
            .filter(user=request.user)
            .select_related("song")
        )
        return Response(
            {"interactions": [serialize_interaction(item) for item in interactions]}
        )

    def post(self, request) -> Response:
        song_id = request.data.get("songId")
        if not song_id:
            return Response(
                {"error": "songId is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            song = Song.objects.get(pk=song_id)
        except Song.DoesNotExist:
            return Response(
                {"error": "Song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        rating = request.data.get("rating")
        try:
            rating = int(rating) if rating not in (None, "") else 0
        except (TypeError, ValueError):
            return Response(
                {"error": "Rating must be a number from 0 to 5."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if rating < 0 or rating > 5:
            return Response(
                {"error": "Rating must be between 0 and 5."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        interaction, _ = UserSongInteraction.objects.update_or_create(
            user=request.user,
            song=song,
            defaults={
                "favorite": bool(request.data.get("favorite", False)),
                "rating": rating,
                "note": request.data.get("note", ""),
                "playlist": request.data.get("playlist", ""),
            },
        )

        return Response(serialize_interaction(interaction))


class InteractionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, song_id: int) -> Response:
        UserSongInteraction.objects.filter(
            user=request.user,
            song_id=song_id,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
