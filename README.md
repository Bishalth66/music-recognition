# 🎵 Music Recognition

A Shazam-like music recognition web application with a **Django REST Framework** backend and a **Next.js** frontend. Upload or record audio and identify the song playing.

---

## 📁 Project Structure

```
music-recognition/
├── shazam_app/      # DRF backend — audio processing & recognition API
└── front-end/       # Next.js frontend — user interface
```

---

## 🚀 Features

- 🎙️ Identify songs from audio input
- 🐍 Django REST Framework backend for audio fingerprinting and matching
- ⚛️ Next.js-powered frontend for a responsive UI
- 🔗 Full-stack integration between the recognition engine and the web interface

---

## 🛠️ Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Backend   | Python, Django REST Framework   |
| Frontend  | Next.js, TypeScript             |
| Algorithm | Audio fingerprinting (Shazam-inspired) |

---

## ⚙️ Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- pip & npm (or yarn)

---

### Backend Setup (`shazam_app`)

```bash
# Clone the repository
git clone https://github.com/Bishalth66/music-recognition.git
cd music-recognition/shazam_app

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

The backend will be running at `http://localhost:8000`.

---

### Frontend Setup (`front-end`)

```bash
cd ../front-end

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be running at `http://localhost:3000`.

---

## 🎧 Usage

1. Open the app in your browser.
2. Upload an audio file or record a short clip.
3. The app will analyze the audio and return the matching song details.
   

---

## 👤 Author

**Bishalth66** — [GitHub Profile](https://github.com/Bishalth66)
