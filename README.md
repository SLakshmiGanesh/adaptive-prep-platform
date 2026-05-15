# 🧠 Adaptive Prep Platform v2 — Elite AI Learning Platform

> Adaptive learning for **JEE · NEET · GATE · UPSC · CAT · GMAT · GRE · Semester**  
> Powered by Bayesian Knowledge Tracing · IRT Quizzes · RAG AI Tutor · SM-2 Spaced Repetition

---

## ✨ What's New in v2

| Feature | Detail |
|---------|--------|
| **GATE Support** | Numerical answer type, engineering subjects, CS/EC/EE topics |
| **Working AI Tutor** | Full SSE streaming with real OpenAI GPT-4o-mini + RAG retrieval |
| **Self-Customizable Plan** | Add/remove topics, adjust time, toggle strategies, regenerate |
| **Exam-specific prompts** | JEE, NEET, GATE, UPSC, CAT each get specialized tutoring style |
| **Analytics page** | Radar charts, bar charts, subject breakdown, weakest/strongest topics |
| **8 exam types** | JEE, NEET, GATE, UPSC, CAT, GMAT, GRE, Semester |
| **Obsidian design system** | Phosphor green + dark void aesthetic, elite UI |
| **Confidence intervals** | Score prediction with CI bounds + percentile |
| **Topic search** | Full-text search when building custom plans |

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+, Python 3.11+, Docker

### 2. Clone & setup
```bash
git clone https://github.com/you/adaptive-prep-platform
cd adaptive-prep-platform

# Install everything
make install
```

### 3. Environment
```bash
cd backend
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY (required for AI tutor)
```

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000 (already set)
```

### 4. Start databases
```bash
make db       # starts PostgreSQL + Redis via Docker
make migrate  # creates all tables
make seed     # seeds 60+ topics for all exams
```

### 5. Run
```bash
# Terminal 1
make dev       # FastAPI on :8000

# Terminal 2
make frontend  # Next.js on :3000
```

Open **http://localhost:3000** → Register → Choose your exam → Start studying

---

## 📁 Project Structure

```
adaptive-prep-platform/
├── frontend/
│   ├── app/
│   │   ├── page.tsx               ← Landing page
│   │   ├── auth/page.tsx          ← Login + 2-step register with exam picker
│   │   ├── dashboard/page.tsx     ← Main command center
│   │   ├── quiz/page.tsx          ← Adaptive quiz (MCQ + GATE numerical)
│   │   ├── tutor/page.tsx         ← Streaming AI tutor (WORKING)
│   │   ├── plan/page.tsx          ← Customizable study plan
│   │   ├── revisions/page.tsx     ← SM-2 spaced repetition
│   │   ├── analytics/page.tsx     ← Deep analytics with charts
│   │   ├── leaderboard/page.tsx   ← Global XP rankings
│   │   └── profile/page.tsx       ← Settings + exam config
│   ├── components/
│   │   ├── HeatMap.tsx            ← Topic mastery heatmap with tooltip
│   │   ├── ProgressChart.tsx      ← Recharts area chart
│   │   └── StudyFeed.tsx          ← Daily plan feed
│   ├── lib/api.ts                 ← Typed API client + streaming tutor
│   └── app/globals.css            ← Obsidian design system
│
├── backend/
│   ├── main.py                    ← FastAPI app
│   ├── db.py                      ← Async PostgreSQL + Redis
│   ├── models/orm.py              ← SQLAlchemy models
│   ├── routers/
│   │   ├── auth.py                ← Register, login, JWT
│   │   ├── quiz.py                ← IRT selection, BKT update, GATE numerical
│   │   ├── study_plan.py          ← Plan builder, customize, complete
│   │   ├── tutor.py               ← WORKING streaming RAG tutor
│   │   ├── analytics.py           ← Heatmap, prediction, trends
│   │   ├── gamification.py        ← XP, levels, badges, leaderboard
│   │   └── topics.py              ← Topic listing, search, mastery
│   └── scripts/
│       └── seed_all_exams.py      ← 60+ topics across all 8 exams
│
└── docker-compose.yml
```

---

## 🤖 AI Tutor Setup

The tutor requires an OpenAI API key. It works with:
- `gpt-4o-mini` (recommended — cheap + fast)
- `gpt-4o` (more powerful)
- Any OpenAI-compatible endpoint

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Adding your study materials to RAG:**
```bash
cd backend
python -m scripts.ingest_docs \
  --file /path/to/ncert_physics_ch12.txt \
  --source "NCERT Physics Ch12" \
  --topic-id <uuid-from-db>
```

---

## 📡 API Reference

### Auth
```
POST /auth/register   { email, password, name, exam_target, exam_date, weekly_goal_hours }
POST /auth/login      { username, password } → { access_token }
GET  /auth/me         → UserProfile
```

### Quiz
```
GET  /quiz/next?topic_id=  → Question (IRT-selected, supports numerical for GATE)
POST /quiz/submit          { question_id, answer, time_taken_sec, confidence }
GET  /quiz/history         → [Attempt]
```

### Study Plan
```
GET  /plan/today?hours=4         → [PlanItem] (priority-scored)
POST /plan/customize             { topic_ids, hours, focus_weak, include_revisions }
POST /plan/complete              { topic_id, duration_min }
PATCH /plan/goal                 { weekly_goal_hours }
GET  /plan/revisions             → [RevisionItem]
```

### AI Tutor (SSE)
```
POST /tutor/ask    { question, topic_id?, topic_name?, exam_target?, history[] }
     → text/event-stream   data: chunk\n\n  ...  data: [SOURCES][...]\n\n
GET  /tutor/history → [{ question, topic, timestamp }]
```

### Analytics
```
GET  /analytics/heatmap        → [HeatCell] (topic mastery matrix)
GET  /analytics/predict        → PredictionOut (score + CI + percentile)
GET  /analytics/mastery-trend  → [MasteryTrend]
GET  /analytics/subjects       → [{ subject, topic_count }]
```

### Topics
```
GET  /topics               → [Topic] filtered by exam_target
GET  /topics/search?q=     → [Topic] full-text search
GET  /topics/mastery       → [{ id, name, subject, mastery }]
```

### Gamification
```
GET  /gamification/stats        → { xp, level, streak, accuracy, badges }
GET  /gamification/badges       → [{ id, name, icon, earned }]
GET  /gamification/leaderboard  → [{ rank, name, xp, level }]
```

---

## 🎨 Design System

The UI uses the **Obsidian Intelligence** design system:

- **Background**: Near-black void (#050507)
- **Accent**: Phosphor Green (#00ff88) — the color of intelligence
- **Secondary**: Electric Violet (#7c3aed)
- **Font**: Geist (UI) + Instrument Serif (content) + Geist Mono (numbers)
- **Grid background**: Subtle phosphor grid lines
- **Glow effects**: Contextual box-shadows on active elements

All CSS variables are in `frontend/app/globals.css`.

---

## 🏗️ Deployment

### Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL to your Railway backend URL
```

### Railway (Backend)
```bash
cd backend
railway login && railway init && railway up
# Add env vars in Railway dashboard
# Add PostgreSQL and Redis services
```

---

## 📊 Exam Configuration

| Exam | Max Score | Marking | Subjects |
|------|-----------|---------|----------|
| JEE | 360 | +4/-1 | Physics, Chemistry, Math |
| NEET | 720 | +4/-1 | Physics, Chemistry, Biology |
| GATE | 100 | +1/-0.33 | Core subject + Engg Maths + Aptitude |
| UPSC | 200 | +2/-0.66 | GS 1-4 + CSAT |
| CAT | 300 | +3/-1 | VARC + DILR + QA |
| GMAT | 800 | +1/0 | Verbal + Quant + IR + AWA |
| GRE | 340 | +1/0 | Verbal + Quant + AWA |
| Semester | 100 | +1/0 | Core subjects |

---

## 🔬 AI/ML Algorithms

### Bayesian Knowledge Tracing
```
P(known | correct) = P(correct|known) × P(known) / P(correct)
P(known_new) = P(known_posterior) + (1 - P(known_posterior)) × P_learn
```

### IRT Question Selection (2PL)
```
P(correct | θ, a, b) = 1 / (1 + e^(-a(θ - b)))
Fisher Info I(θ) = a² × P × (1 - P)   → maximize this
```

### SM-2 Spaced Repetition
```
If quality ≥ 3:  interval_n = interval_{n-1} × EF
                 EF = EF + 0.1 - (5-q)(0.08 + (5-q)×0.02)
Else:           interval = 1, reset repetitions
```

### Score Prediction
```
p_correct = weighted_mastery_across_topics
raw_score = p_correct × correct_mark + (1-p_correct)×0.45 × wrong_mark
predicted  = (raw_score / correct_mark) × max_score
```

---

## 📜 License

MIT — build freely.
