"""
Fingerprint engine — wraps the Shazam algorithm for Django/DRF.
"""

import numpy as np
import librosa
import hashlib
from scipy.ndimage import maximum_filter, generate_binary_structure, iterate_structure

# ── Parameters ───────────────────────────────────────────────────────────────
SAMPLE_RATE       = 22050
N_FFT             = 4096
HOP_LENGTH        = 512
N_MELS            = 128
PEAK_NEIGHBORHOOD = 20
MIN_AMPLITUDE_DB  = -60
FAN_VALUE         = 15
MIN_TIME_DELTA    = 1
MAX_TIME_DELTA    = 200


def _load_audio(path):
    y, _ = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    return y


def _spectrogram(y):
    S = librosa.feature.melspectrogram(
        y=y, sr=SAMPLE_RATE, n_fft=N_FFT,
        hop_length=HOP_LENGTH, n_mels=N_MELS, power=2.0
    )
    return librosa.power_to_db(S, ref=np.max)


def _get_peaks(S_db):
    struct       = generate_binary_structure(2, 1)
    neighborhood = iterate_structure(struct, PEAK_NEIGHBORHOOD)
    local_max    = maximum_filter(S_db, footprint=neighborhood) == S_db
    background   = S_db < MIN_AMPLITUDE_DB
    detected     = local_max & ~background
    freq_idxs, time_idxs = np.where(detected)
    peaks = list(zip(time_idxs.tolist(), freq_idxs.tolist()))
    peaks.sort(key=lambda x: (x[0], x[1]))
    return peaks


def _hash_peaks(peaks):
    hashes = []
    for i, (t1, f1) in enumerate(peaks):
        for j in range(1, FAN_VALUE + 1):
            if i + j >= len(peaks):
                break
            t2, f2 = peaks[i + j]
            dt = t2 - t1
            if dt < MIN_TIME_DELTA:
                continue
            if dt > MAX_TIME_DELTA:
                break
            raw = f"{f1}|{f2}|{dt}"
            h   = hashlib.sha1(raw.encode()).hexdigest()[:20]
            hashes.append((h, t1))
    return hashes


def fingerprint_file_path(song):
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

    # Replace old fingerprints
    Fingerprint.objects.filter(song=song).delete()

    batch = [
        Fingerprint(song=song, hash_value=h, offset=offset)
        for h, offset in hashes
    ]
    Fingerprint.objects.bulk_create(batch, batch_size=5000)

    song.fingerprinted   = True
    song.save(update_fields=['fingerprinted', 'duration_seconds'])

    return len(batch)


def fingerprint_bytes_data(audio_bytes):
    """
    Fingerprint raw bytes (uploaded query audio).
    Returns list of (hash_str, offset).
    """
    import io
    y, _ = librosa.load(io.BytesIO(audio_bytes), sr=SAMPLE_RATE, mono=True)
    S     = _spectrogram(y)
    peaks = _get_peaks(S)
    return _hash_peaks(peaks)
