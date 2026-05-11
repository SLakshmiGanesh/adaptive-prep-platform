# 🧠 Adaptive Prep Platform — AI-Powered Personalized Learning Platform

> A production-grade adaptive learning system for JEE, NEET, UPSC, and university exams.  
> Built with Next.js · FastAPI · PostgreSQL · Redis · OpenAI · pgvector

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14)                  │
│  Dashboard · Quiz · AI Tutor · Auth · Analytics          │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│                API GATEWAY (FastAPI)                      │
│  JWT Auth · Rate Limiting · Redis Event Bus              │
└──┬──────────┬──────────┬──────────┬────────────┬────────┘
   │          │          │          │            │
   ▼          ▼          ▼          ▼            ▼
  SKM      Recomm.   Spaced    Assessment    AI Tutor
Bayesian   Engine     Rep       IRT Quiz      RAG+LLM
  KT       Planner   SM-2      Selector      Pipeline
   │          │          │          │            │
   └──────────┴──────────┴──────────┴────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│          DATABASE LAYER                                   │
│  PostgreSQL + pgvector    Redis Cache + Pub/Sub          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) | SSR, streaming, React Server Components |
| Styling | Tailwind CSS + CSS Variables | Design system |
| Backend | FastAPI (Python 3.11) | Async API, WebSocket support |
| Auth | JWT + bcrypt | Stateless authentication |
| Primary DB | PostgreSQL 16 | Relational data, attempts, sessions |
| Vector DB | pgvector extension | Embedding similarity search (RAG) |
| Cache | Redis 7 | Real-time recommendations, session cache |
| AI/LLM | OpenAI GPT-4o-mini | Tutor responses |
| Embeddings | text-embedding-3-small | Document + question embeddings |
| Deployment | Vercel (FE) + Railway (BE) | Zero-downtime deploys |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 16 with pgvector extension
- Redis 7
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/yourname/adaptive-prep-platform
cd adaptive-prep-platform

# Frontend
cd frontend
npm install

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**backend/.env**
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/adaptiveprep
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
ENVIRONMENT=development
```

### 3. Database Setup

```bash
# Install pgvector
psql -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd backend
alembic upgrade head

# Seed initial data
python scripts/seed_topics.py
python scripts/seed_questions.py
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure

```
adaptive-prep-platform/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Landing page
│   │   ├── dashboard/page.tsx      # Main dashboard
│   │   ├── quiz/page.tsx           # Adaptive quiz
│   │   ├── tutor/page.tsx          # AI Tutor chat
│   │   └── auth/page.tsx           # Login / Register
│   ├── components/
│   │   ├── HeatMap.tsx             # Topic mastery visualization
│   │   ├── StudyFeed.tsx           # Adaptive task feed
│   │   ├── ProgressChart.tsx       # Performance over time
│   │   └── QuizCard.tsx            # Quiz question card
│   └── lib/
│       └── api.ts                  # Typed API client
│
├── backend/
│   ├── main.py                     # FastAPI app entry point
│   ├── db.py                       # Async SQLAlchemy + Redis
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py                 # Register, login, refresh
│   │   ├── quiz.py                 # IRT quiz selection + submit
│   │   ├── study_plan.py           # Daily plan generation
│   │   └── tutor.py                # Streaming AI tutor
│   ├── services/
│   │   ├── skm.py                  # Bayesian Knowledge Tracing
│   │   ├── recommender.py          # Study plan optimizer
│   │   ├── spaced_rep.py           # SM-2 spaced repetition
│   │   └── predictor.py            # Score prediction model
│   └── models/
│       └── orm.py                  # SQLAlchemy ORM models
│
└── ai/
    ├── knowledge_model/
    │   └── bayesian_kt.py          # Full BKT implementation
    ├── recommendation/
    │   └── engine.py               # Priority scoring engine
    ├── tutor/
    │   ├── rag.py                  # RAG pipeline
    │   └── embeddings.py           # Embedding utilities
    └── assessment/
        └── irt.py                  # Item Response Theory
```

---

## 🧠 AI Engine — How It Works

### Student Knowledge Model (SKM)

Each student is represented as a vector of topic mastery scores (0–1):

```
Student = {
  "Thermodynamics":  0.72,
  "Kinematics":      0.45,
  "Organic Chem":    0.31,
  "Calculus":        0.88,
  ...
}
```

Mastery updates after every quiz attempt using **Bayesian Knowledge Tracing**:

```
P(known | correct) = P(correct | known) × P(known)
                     ─────────────────────────────
                           P(correct)
```

### Spaced Repetition (SM-2)

Revision intervals grow exponentially based on recall quality:
- Quality 5 (perfect): interval × ease_factor
- Quality 3 (pass): shorter interval
- Quality < 3 (fail): reset to 1 day

### IRT Question Selection

Questions are selected to maximize **Fisher Information** at the student's current ability level. The optimal question is at difficulty = student ability (50% success probability).

### RAG Tutor Pipeline

```
User question
     ↓
Embed with text-embedding-3-small
     ↓
pgvector similarity search (top-3 chunks)
     ↓
Inject context into GPT-4o-mini prompt
     ↓
Stream response to frontend
```

---

## 🗄️ Database Schema

See `backend/models/orm.py` for full SQLAlchemy models.

Key tables:
- `users` — profiles, exam targets, exam dates
- `topics` — hierarchical subject tree
- `questions` — with IRT params and embeddings
- `attempts` — every quiz answer with timing
- `mastery_snapshots` — time-series of mastery per topic
- `revision_schedule` — SM-2 computed next-review dates
- `study_sessions` — logged study time
- `predictions` — score forecasts

---

## 🔌 API Reference

### Auth
```
POST /auth/register     { email, password, name, exam_target, exam_date }
POST /auth/login        { email, password } → { access_token }
GET  /auth/me           → UserProfile
```

### Quiz
```
GET  /quiz/next?topic_id=   → Question (IRT-selected)
POST /quiz/submit           { question_id, answer, time_taken_sec, confidence }
GET  /quiz/history          → [Attempt]
```

### Study Plan
```
GET  /plan/today            → [{ topic, duration_min, type, priority }]
POST /plan/complete         { topic_id, duration_min }
GET  /plan/revisions        → [{ topic, due_date, interval_days }]
```

### Tutor (Streaming)
```
POST /tutor/ask             { question, topic_id } → SSE stream
GET  /tutor/history         → [{ question, answer, timestamp }]
```

### Analytics
```
GET  /analytics/mastery     → [{ topic, mastery, trend, last_updated }]
GET  /analytics/predict     → { score, weak_topics, strong_topics }
GET  /analytics/heatmap     → [{ topic, subject, mastery, attempts }]
```

---

## 🚢 Deployment

### Vercel (Frontend)

```bash
cd frontend
npx vercel --prod
```

Set env vars in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your Railway backend URL

### Railway (Backend)

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

cd backend
railway init
railway up
```

Add env vars in Railway dashboard. Railway auto-detects Python and runs `uvicorn`.

**railway.toml:**
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2"
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/ -v --asyncio-mode=auto

# Frontend
cd frontend
npm run test
npm run type-check
```

---

## 📈 Phase Roadmap

| Phase | Duration | Features |
|-------|----------|----------|
| **Phase 1 — MVP** | Week 1–2 | Auth, static quiz, basic dashboard |
| **Phase 2 — Intelligence** | Week 3–4 | BKT mastery, recommendations, adaptive quiz |
| **Phase 3 — AI Tutor** | Week 5 | RAG pipeline, streaming LLM, history |
| **Phase 4 — Optimization** | Week 6 | Spaced repetition, score prediction, polish |

---

## 🏆 Elite Differentiators

- [ ] Reinforcement learning for plan optimization (future)
- [ ] Gamification: XP, streaks, leaderboard
- [ ] Multi-cohort comparison (percentile ranks)
- [ ] Voice AI tutor (Web Speech API + TTS)
- [ ] Offline-first PWA (service workers)

---

## 📜 License

MIT — build freely, credit appreciated.
