# Makefile — Adaptive Prep Platform dev shortcuts

.PHONY: help dev-backend dev-frontend dev db-up db-down seed test lint clean

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  dev           Start everything (Docker DB + backend + frontend)"
	@echo "  dev-backend   Start FastAPI server only"
	@echo "  dev-frontend  Start Next.js dev server only"
	@echo "  db-up         Start PostgreSQL + Redis via Docker Compose"
	@echo "  db-down       Stop Docker services"
	@echo "  migrate       Run Alembic migrations"
	@echo "  seed          Seed topics and questions"
	@echo "  test          Run backend tests"
	@echo "  lint          Lint frontend TypeScript"
	@echo "  clean         Remove build artifacts"

# ── Database ──────────────────────────────────────────────────────────────────

db-up:
	docker compose up postgres redis -d

db-down:
	docker compose down

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && python scripts/seed_topics.py

# ── Backend ───────────────────────────────────────────────────────────────────

dev-backend:
	cd backend && uvicorn main:app --reload --port 8000

install-backend:
	cd backend && pip install -r requirements.txt

# ── Frontend ──────────────────────────────────────────────────────────────────

dev-frontend:
	cd frontend && npm run dev

install-frontend:
	cd frontend && npm install

# ── Combined dev ─────────────────────────────────────────────────────────────

dev: db-up
	@echo "Starting backend and frontend..."
	@make dev-backend & make dev-frontend

# ── Tests ─────────────────────────────────────────────────────────────────────

test:
	cd backend && pytest tests/ -v

test-watch:
	cd backend && pytest tests/ -v --tb=short -f

# ── Lint ──────────────────────────────────────────────────────────────────────

lint:
	cd frontend && npm run type-check && npm run lint

# ── Deploy ────────────────────────────────────────────────────────────────────

deploy-frontend:
	cd frontend && npx vercel --prod

deploy-backend:
	cd backend && railway up

# ── RAG ingestion ─────────────────────────────────────────────────────────────

ingest:
	@echo "Usage: make ingest FILE=path/to/notes.txt SOURCE='NCERT Physics Ch1'"
	cd backend && python -m ai.tutor.embeddings --file $(FILE) --source "$(SOURCE)"

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf frontend/.next frontend/node_modules 2>/dev/null || true
