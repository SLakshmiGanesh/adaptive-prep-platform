"""
main.py — FastAPI entry point (Adaptive Prep Platform v2)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from db import engine, Base, close_redis, settings
from routers import auth, quiz, study_plan, tutor, analytics, gamification, topics


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'mcq'"))
        await conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb"))
        await conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS source VARCHAR(200)"))
        await conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()"))
        await conn.execute(text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0"))
        await conn.execute(text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal_hours INTEGER DEFAULT 20"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS level_title VARCHAR(50) DEFAULT 'Novice'"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS earned_badges JSONB DEFAULT '[]'::jsonb"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ"))
    yield
    await close_redis()


app = FastAPI(
    title="Adaptive Prep Platform API v2",
    description="Adaptive learning for JEE · NEET · GATE · UPSC · CAT",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://adaptiveprep.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/auth",         tags=["auth"])
app.include_router(quiz.router,         prefix="/quiz",         tags=["quiz"])
app.include_router(study_plan.router,   prefix="/plan",         tags=["plan"])
app.include_router(tutor.router,        prefix="/tutor",        tags=["tutor"])
app.include_router(analytics.router,    prefix="/analytics",    tags=["analytics"])
app.include_router(gamification.router, prefix="/gamification", tags=["gamification"])
app.include_router(topics.router,       prefix="/topics",       tags=["topics"])


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "version": "2.0.0", "environment": settings.ENVIRONMENT}


@app.get("/", tags=["meta"])
async def root():
    return {"message": "Adaptive Prep Platform API v2", "docs": "/docs"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
