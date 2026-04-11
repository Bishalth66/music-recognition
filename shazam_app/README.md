# Shazam-like Song Recognition — Django REST Framework

## Project Structure

```
shazam_app/
├── manage.py
├── requirements.txt
├── shazam_project/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── songs/
    ├── __init__.py
    ├── apps.py          ← registers signals
    ├── models.py        ← Song, Fingerprint
    ├── signals.py       ← auto-fingerprint on Song save
    ├── fingerprint.py   ← Shazam engine
    ├── views.py         ← RecognizeView (DRF)
    ├── admin.py         ← full admin panel
    ├── urls.py
    └── migrations/
        └── 0001_initial.py
```

## Setup

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Admin Panel — Adding Songs

1. Go to `http://127.0.0.1:8000/admin/`
2. Log in with your superuser credentials
3. Open **Songs → Add Song**, fill in title/artist/album and upload an audio file
4. Click **Save** — fingerprinting runs automatically in the background via Django signals
5. The Song row will show `Fingerprinted ✓` and the fingerprint count once complete

> **Re-fingerprint**: Select songs and use the **"Re-fingerprint selected songs"** action
> if you ever need to regenerate hashes (e.g. after changing engine parameters).

## API — Recognize Endpoint

### `POST /api/recognize/`

**Content-Type**: `multipart/form-data`

| Field   | Type | Description                          |
|---------|------|--------------------------------------|
| `audio` | File | Audio clip (mp3, wav, ogg, m4a, ...) |

### Match found
```json
{
  "match": true,
  "song": {
    "id": 3,
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "album": "A Night at the Opera",
    "duration_seconds": 354.3
  },
  "confidence": 142
}
```

### No match
```json
{
  "match": false,
  "message": "No confident match found.",
  "best_votes": 2
}
```

### Frontend fetch example
```js
const formData = new FormData();
formData.append('audio', audioBlob, 'clip.wav');

const res = await fetch('http://127.0.0.1:8000/api/recognize/', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
console.log(data);
```

## How It Works

1. **Fingerprinting (on save)**
   - Audio → mel-spectrogram → local peak detection → combinatorial hashing
   - ~thousands of `(hash, offset)` pairs stored in `Fingerprint` table per song

2. **Recognition (on POST)**
   - Incoming clip gets the same treatment → query hashes extracted
   - DB lookup: find all stored fingerprints matching any query hash
   - Offset-alignment histogram: `delta = db_offset − query_offset`
   - Song whose histogram peak is highest wins
   - `confidence` = vote count; tune `MIN_VOTES` in `views.py` if needed

## Tuning

| Constant           | File             | Effect                                  |
|--------------------|------------------|-----------------------------------------|
| `FAN_VALUE`        | fingerprint.py   | More hashes = better recall, slower DB  |
| `PEAK_NEIGHBORHOOD`| fingerprint.py   | Fewer peaks = faster, less robust       |
| `MIN_VOTES`        | views.py         | Higher = fewer false positives          |

## Production Notes

- Replace SQLite with **PostgreSQL** for large song libraries (the `hash_value` index is critical for speed)
- Run fingerprinting in a **Celery task** instead of a synchronous signal for large files
- Set `CORS_ALLOWED_ORIGINS` to your frontend domain instead of `CORS_ALLOW_ALL_ORIGINS = True`
- Set `SECRET_KEY` and `DEBUG = False` in production
