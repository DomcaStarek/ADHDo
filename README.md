# 🧹 ADHDo — "Tinder for Cleaning"
> **Virtual body-doubling and accountability web app tailored for people with ADHD.**

Users upload photos of rooms/spaces they need to clean, swipe through cleaning challenges, match on mutual likes, and motivate each other with a synchronized body-doubling sprint timer and live 1-on-1 chat.

---

## 🏗️ Architecture & Tech Stack

```
   Client (Web SPA & Mobile-first)
        │
   [React 19 + TypeScript + Tailwind CSS + Lucide Icons]
        │
        ▼ HTTPS / WSS
   [FastAPI Backend Application (Python 3.12)]
   ├── Security: Argon2id Hashing + JWT (Access & Refresh Tokens)
   ├── Matching Engine & Feed Recommendation
   ├── WebSocket 1-on-1 Real-time Body-Doubling Chat
   └── Media Storage Provider (Local dev / S3 abstraction)
        │
        ▼ asyncpg
   [PostgreSQL Database (SQLAlchemy 2.0 Async + Alembic Migrations)]
```

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2 (asyncpg), Alembic, Pydantic V2, Argon2-cffi, PyJWT, WebSockets.
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, Web Audio API, Canvas Confetti.
- **Database:** PostgreSQL (with indexed UUID primary keys, JSONB preferences, unique pairwise match constraints).

---

## ⚡ Quick Start

### 1. Database & Backend Setup

Ensure PostgreSQL is running locally on port `5432` with database `adhdo_db` (or run `docker compose up -d db`).

```bash
cd backend

# 1. Activate Virtual Environment
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# 2. Apply Alembic Migrations
alembic upgrade head

# 3. Seed Realistic ADHD Cleaning Challenges
python scripts/seed_demo_data.py

# 4. Start the FastAPI Development Server
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite Development Server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Running Automated Tests

Run the full async test suite against PostgreSQL:

```bash
cd backend
.\venv\Scripts\pytest -v
```

All test cases verify:
- Argon2 password hashing & JWT token rotation.
- Challenge creation & photo upload abstraction.
- Feed discovery excluding swiped/self/blocked users.
- Mutual like detection triggering instant Matches.
- Direct messaging and block/unmatch safety flows.

---

## 📱 Pre-Configured Demo Accounts

For instant testing without signing up:
- **Email:** `test@adhdo.app`
- **Password:** `Password123!`
- *(Or click the **"Quick Demo Login"** button on the login screen).*

Maya (`maya@adhdo.app`) has already liked Alex's task in the seed data, so swiping right on Maya's "Studio Glitter Bomb" triggers an immediate **Match & Confetti Celebration**!
