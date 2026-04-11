from collections import defaultdict
import subprocess
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from songs.fingerprint import fingerprint_bytes_data
from songs.models import Fingerprint, Song


class RecognizeView(APIView):
    """
    POST /api/recognize/
    Body (multipart/form-data):
        audio  — audio file (any format librosa can read: mp3, wav, ogg, m4a …)

    Returns the best matching song or a 'no match' response.
    """
    parser_classes = [MultiPartParser, FormParser]

    #Use ffmpeg to change into wav 
    def convert_bytes_to_wav(self,audio_bytes):
        command = [
            "ffmpeg",
            "-i", "pipe:0",
            "-ar", "44100",
            "-ac", "1",
            "-f", "wav",
            "pipe:1"
        ]

        process = subprocess.run(
            command,
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )

        return process.stdout

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response(
                {'error': 'No audio file provided. Send a file under the key "audio".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 1. Fingerprint the incoming clip ──────────────────────────────
        
        raw_bytes = audio_file.read()
        audio_bytes=self.convert_bytes_to_wav(raw_bytes)

        try:
            query_hashes = fingerprint_bytes_data(audio_bytes)
        except Exception as exc:
            return Response(
                {'error': f'Could not process audio: {exc}'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not query_hashes:
            return Response(
                {'error': 'No fingerprints could be extracted from the clip.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # ── 2. Look up matching hashes in the database ────────────────────
        hash_strings = [h for h, _ in query_hashes]
        query_offset_map = {h: t for h, t in query_hashes}  # hash → query offset

        db_matches = (
            Fingerprint.objects
            .filter(hash_value__in=hash_strings)
            .select_related('song')
            .values('hash_value', 'offset', 'song_id', 'song__title',
                    'song__artist', 'song__album', 'song__duration_seconds')
        )

        # ── 3. Align by offset difference (Shazam histogram) ──────────────
        # For each (song_id, delta) count votes; the winning delta wins.
        # delta = db_offset - query_offset  (should cluster around a constant
        # for the true match regardless of where in the song the clip started)
        histogram: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))

        for row in db_matches:
            q_offset  = query_offset_map.get(row['hash_value'])
            if q_offset is None:
                continue
            delta = row['offset'] - q_offset
            histogram[row['song_id']][delta] += 1

        if not histogram:
            return Response({'match': False, 'message': 'No match found.'})

        # ── 4. Pick the song with the most aligned votes ──────────────────
        best_song_id = max(
            histogram,
            key=lambda sid: max(histogram[sid].values()),
        )
        best_votes = max(histogram[best_song_id].values())

        # Confidence threshold — tune to taste
        MIN_VOTES = 5
        if best_votes < MIN_VOTES:
            return Response({'match': False, 'message': 'No confident match found.',
                             'best_votes': best_votes})

        song = Song.objects.get(pk=best_song_id)

        return Response({
            'match':    True,
            'song': {
                'id':               song.pk,
                'title':            song.title,
                'artist':           song.artist,
                'album':            song.album,
                'duration_seconds': song.duration_seconds,
            },
            'confidence': best_votes,   # raw vote count; higher = more certain
        })
