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
