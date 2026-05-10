# Adaptive Prep Platform

Major-project starter for an AI-assisted adaptive learning platform. The implementation follows the attached architecture:

- Frontend: Next.js dashboard, quiz workspace, recommendations, topic heatmaps, AI tutor panel
- API Gateway: FastAPI REST service
- AI Engine: knowledge model, adaptive recommender, spaced repetition, tutor response, score predictor
- Data: in-memory seed repository for MVP, designed to move to PostgreSQL/Redis later
- External services: optional OpenAI/vector database integration points

## Project Structure

```text
learning-engine/
  backend/      FastAPI learning engine API
  frontend/     Next.js App Router frontend
  ai/           Standalone learning intelligence modules
  docs/         Architecture and project documentation
```

## Run The Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`

## Run The Frontend

Install Node.js 20.9+ first if it is not already available.

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

The frontend expects the backend at `http://localhost:8000`. You can override it with:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

## MVP Features

- Student overview with readiness score and projected exam score
- Topic mastery heatmap from attempt history
- Adaptive next-question selection
- Quiz submission with mastery update
- Recommendation feed
- Spaced revision queue
- AI tutor endpoint with local fallback response
- Architecture and roadmap documentation

## Next Milestones

1. Replace in-memory data with PostgreSQL tables.
2. Add JWT authentication.
3. Add Redis for event bus, rate limiting, and async jobs.
4. Add OpenAI tutor explanations and pgvector document retrieval.
5. Add instructor analytics and admin question upload.
