"""
main.py — FastAPI application entry point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from db import engine, Base, close_redis, settings
from routers import auth, quiz, study_plan, tutor, analytics, gamification, realtime


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: close Redis
    await close_redis()


app = FastAPI(
    title="Adaptive Prep Platform API",
    description="AI-powered adaptive learning system for JEE, NEET, UPSC",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth.router,         prefix="/auth",         tags=["auth"])
app.include_router(quiz.router,         prefix="/quiz",         tags=["quiz"])
app.include_router(study_plan.router,   prefix="/plan",         tags=["plan"])
app.include_router(tutor.router,        prefix="/tutor",        tags=["tutor"])
app.include_router(analytics.router,    prefix="/analytics",    tags=["analytics"])
app.include_router(gamification.router, prefix="/gamification", tags=["gamification"])
app.include_router(realtime.router,                             tags=["realtime"])


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
