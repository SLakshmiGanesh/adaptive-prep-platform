.PHONY: help dev db seed migrate test lint

help:
	@echo "Adaptive Prep Platform v2 — Dev Commands"
	@echo ""
	@echo "  make db        Start PostgreSQL + Redis (Docker)"
	@echo "  make migrate   Run Alembic migrations"
	@echo "  make seed      Seed all exam topics + sample questions"
	@echo "  make dev       Start backend dev server"
	@echo "  make frontend  Start Next.js dev server"
	@echo "  make test      Run backend tests"

db:
	docker compose up postgres redis -d

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && python scripts/seed_all_exams.py

dev:
	cd backend && uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test:
	cd backend && pytest tests/ -v

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/.next 2>/dev/null || true
