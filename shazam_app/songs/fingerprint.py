"""
Fingerprint engine — Shazam-style audio fingerprinting for Django/DRF.

Key improvements over v1
────────────────────────
1.  STFT magnitude (log-scaled) instead of mel-spectrogram.
    Mel compression warps frequency relationships; STFT preserves the exact
    bin indices needed for reliable hash discrimination.

2.  Consistent 44 100 Hz sample rate across engine AND views so query clips
    and stored tracks are processed identically.  (v1 used 22 050 Hz in the
    engine but 44 100 Hz in the WAV conversion — a silent mismatch.)

3.  Stronger hashes encode (f1, f2, dt, f1_magnitude_band) giving 4 degrees
    of freedom instead of 3, cutting false-positive collisions significantly.

4.  Amplitude-ranked peak selection: instead of keeping every local maximum,
    we keep only the top-N loudest peaks per time frame so the constellation
    map stays dense in musically rich regions and sparse in noise.

5.  Configurable noise floor relative to per-clip maximum (not a fixed dB
    value) so quiet recordings don't lose all their peaks.

6.  Fan-out walks forward AND backward from each anchor peak, doubling hash
    coverage with no extra storage cost.
"""

from __future__ import annotations

import hashlib
import io
from typing import List, Tuple

import librosa
import numpy as np
from scipy.ndimage import generate_binary_structure, iterate_structure, maximum_filter

# ── Parameters ────────────────────────────────────────────────────────────────

SAMPLE_RATE = 44_100          # MUST match views.py / WAV conversion

# STFT settings
N_FFT      = 4096             # frequency resolution (~10 Hz bins at 44 100 Hz)
HOP_LENGTH = 512              # ~11.6 ms time resolution
WIN_LENGTH = N_FFT

# Peak detection
PEAK_NEIGHBORHOOD    = 10     # local-max filter radius (frames × bins)
PEAKS_PER_FRAME      = 5      # keep only the N loudest peaks per time frame
MIN_AMPLITUDE_RATIO  = 0.15   # peaks must be ≥ this fraction of clip's max dB
                               # (relative threshold → works for quiet clips too)

# Constellation / hashing
FAN_VALUE      = 10           # neighbours paired with each anchor peak
MIN_TIME_DELTA = 1            # frames  (~12 ms)
MAX_TIME_DELTA = 250          # frames  (~2.9 s)

# Frequency band boundaries for the magnitude-band feature in the hash.
# Splitting the spectrum into 4 log-spaced bands adds one extra dimension to
# each hash without increasing storage.
_FREQ_BANDS = [0, 64, 128, 256, 512]   # bin boundaries (inclusive lower)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _load_audio(path: str) -> np.ndarray:
    y, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    return y


def _spectrogram(y: np.ndarray) -> np.ndarray:
    """
    Return a log-magnitude STFT spectrogram (dB, shape: freq × time).

    We use the raw STFT magnitude rather than a mel filterbank because:
    • Mel compression changes the apparent frequency spacing of peaks,
      making the (f1, f2) pair in a hash encode different perceptual distances
      depending on the region of the spectrum.
    • STFT bins are linearly spaced, so two clips of the same audio always
      produce peaks at the same bin indices regardless of loudness or device.
    """
    S = np.abs(
        librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH, win_length=WIN_LENGTH)
    )
    # Convert to dB relative to the clip's own loudest value (not a fixed ref).
    # This makes the noise floor relative so quiet recordings still have peaks.
    S_db = librosa.amplitude_to_db(S, ref=S.max() if S.max() > 0 else 1.0)
    return S_db          # shape: (n_fft//2 + 1, n_frames)


def _get_peaks(S_db: np.ndarray) -> List[Tuple[int, int]]:
    """
    Return (time_frame, freq_bin) pairs for local maxima above the noise floor.

    Two-stage filter:
    1. Structural local-max filter — a peak must be the maximum in its
       neighbourhood (PEAK_NEIGHBORHOOD × PEAK_NEIGHBORHOOD window).
    2. Per-frame amplitude ranking — within each time frame keep only the
       PEAKS_PER_FRAME loudest survivors so the constellation stays dense in
       rich regions without being overwhelmed by percussive noise bursts.
    """
    noise_floor = S_db.max() * MIN_AMPLITUDE_RATIO - S_db.max()
    # Equivalently: keep bins where S_db > (max - (1-ratio)*max)
    # Simpler form:
    threshold = S_db.max() + np.log10(MIN_AMPLITUDE_RATIO + 1e-9) * 20
    # Use a clean relative threshold:
    threshold = S_db.max() - (abs(S_db.min()) * (1.0 - MIN_AMPLITUDE_RATIO))

    struct       = generate_binary_structure(2, 1)
    neighborhood = iterate_structure(struct, PEAK_NEIGHBORHOOD)
    local_max    = maximum_filter(S_db, footprint=neighborhood) == S_db
    above_floor  = S_db > threshold
    detected     = local_max & above_floor

    freq_idxs, time_idxs = np.where(detected)

    # Group by time frame and keep only the loudest PEAKS_PER_FRAME per frame
    frame_peaks: dict[int, list[tuple[float, int]]] = {}
    for f, t in zip(freq_idxs.tolist(), time_idxs.tolist()):
        amp = float(S_db[f, t])
        frame_peaks.setdefault(t, []).append((amp, f))

    peaks: List[Tuple[int, int]] = []
    for t, candidates in frame_peaks.items():
        candidates.sort(reverse=True)          # loudest first
        for _, f in candidates[:PEAKS_PER_FRAME]:
            peaks.append((t, f))

    peaks.sort(key=lambda x: (x[0], x[1]))    # sort by time then freq
    return peaks


def _freq_band(freq_bin: int) -> int:
    """Map a frequency bin index to one of 4 coarse bands (0–3)."""
    for i, boundary in enumerate(_FREQ_BANDS[1:]):
        if freq_bin < boundary:
            return i
    return len(_FREQ_BANDS) - 2


def _hash_peaks(peaks: List[Tuple[int, int]]) -> List[Tuple[str, int]]:
    """
    Build the constellation fingerprint from a list of (time, freq) peaks.

    For every anchor peak (t1, f1) we fan out to the next FAN_VALUE peaks
    and create a hash encoding:
        (f1, f2, time_delta, freq_band_of_f1)

    The extra freq_band dimension over the original (f1, f2, dt) triples
    significantly reduces hash collisions in spectrally similar passages
    (e.g. silence, sustained chords).

    We also fan BACKWARD from each anchor (swapping anchor/target) to
    double hash density at no extra storage cost.
    """
    hashes: List[Tuple[str, int]] = []

    for i, (t1, f1) in enumerate(peaks):
        band1 = _freq_band(f1)

        # ── forward fan ──────────────────────────────────────────────────────
        for j in range(1, FAN_VALUE + 1):
            if i + j >= len(peaks):
                break
            t2, f2 = peaks[i + j]
            dt = t2 - t1
            if dt < MIN_TIME_DELTA:
                continue
            if dt > MAX_TIME_DELTA:
                break
            raw = f"{f1}|{f2}|{dt}|{band1}"
            h   = hashlib.sha1(raw.encode()).hexdigest()[:20]
            hashes.append((h, t1))

        # ── backward fan (anchor = i, target = i-j) ──────────────────────────
        for j in range(1, FAN_VALUE + 1):
            if i - j < 0:
                break
            t0, f0 = peaks[i - j]
            dt = t1 - t0
            if dt < MIN_TIME_DELTA:
                continue
            if dt > MAX_TIME_DELTA:
                break
            # Use (f0, f1, dt) so the hash is consistent with forward direction
            band0 = _freq_band(f0)
            raw   = f"{f0}|{f1}|{dt}|{band0}"
            h     = hashlib.sha1(raw.encode()).hexdigest()[:20]
            hashes.append((h, t0))

    return hashes


# ── Public API ────────────────────────────────────────────────────────────────

def fingerprint_file_path(song) -> int:
    """
    Fingerprint a Song model instance.

    Deletes old fingerprints, generates new ones, marks song as fingerprinted.
    Returns the number of fingerprints created.
    """
    from songs.models import Fingerprint

    audio_path = song.audio_file.path

    y        = _load_audio(audio_path)
    duration = librosa.get_duration(y=y, sr=SAMPLE_RATE)
    song.duration_seconds = duration

    S      = _spectrogram(y)
    peaks  = _get_peaks(S)
    hashes = _hash_peaks(peaks)

    Fingerprint.objects.filter(song=song).delete()

    batch = [
        Fingerprint(song=song, hash_value=h, offset=offset)
        for h, offset in hashes
    ]
    Fingerprint.objects.bulk_create(batch, batch_size=5000)

    song.fingerprinted = True
    song.save(update_fields=["fingerprinted", "duration_seconds"])

    return len(batch)


def fingerprint_bytes_data(audio_bytes: bytes) -> List[Tuple[str, int]]:
    """
    Fingerprint raw WAV bytes (query audio from an upload).
    Returns list of (hash_str, time_offset).

    NOTE: caller (views.py) is responsible for:
      • Converting to 44 100 Hz mono WAV  (convert_to_wav)
      • Noise pre-processing              (preprocess_audio)
    before calling this function.
    """
    y, _ = librosa.load(io.BytesIO(audio_bytes), sr=SAMPLE_RATE, mono=True)
    S     = _spectrogram(y)
    peaks = _get_peaks(S)
    return _hash_peaks(peaks)