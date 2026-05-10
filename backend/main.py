from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth, quiz, study_plan, tutor


app = FastAPI(title="Adaptive Prep Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])
app.include_router(study_plan.router, prefix="/api/study-plan", tags=["study-plan"])
app.include_router(tutor.router, prefix="/api/tutor", tags=["tutor"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
