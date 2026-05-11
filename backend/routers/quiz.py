"""
routers/quiz.py — Adaptive quiz: IRT question selection + attempt submission
"""

import json
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import Question, Attempt, MasterySnapshot, Topic, User
from services.skm import BayesianKT
from ai.assessment.irt import select_question_irt
from routers.auth import get_current_user

router = APIRouter()
kt = BayesianKT()


# ── Schemas ────────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    question_id: str
    topic_id: str
    topic_name: str
    text: str
    options: list[dict]
    difficulty: float


class SubmitBody(BaseModel):
    question_id: str
    answer: str           # option id e.g. "A" | "B" | "C" | "D"
    time_taken_sec: int
    confidence: Optional[int] = None  # 1–5


class SubmitResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: Optional[str]
    new_mastery: float
    mastery_delta: float
    xp_gained: int


class AttemptOut(BaseModel):
    question_id: str
    topic_name: str
    correct: bool
    time_taken_sec: int
    attempted_at: str


# ── Helpers ────────────────────────────────────────────────────────────────────

async def get_current_mastery(user_id: str, topic_id: str, db: AsyncSession) -> float:
    """Get most recent mastery snapshot, default to 0.1."""
    result = await db.execute(
        select(MasterySnapshot.mastery)
        .where(MasterySnapshot.user_id == user_id, MasterySnapshot.topic_id == topic_id)
        .order_by(desc(MasterySnapshot.recorded_at))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row if row is not None else 0.1


async def save_mastery(user_id: str, topic_id: str, mastery: float, db: AsyncSession):
    snapshot = MasterySnapshot(user_id=user_id, topic_id=topic_id, mastery=mastery)
    db.add(snapshot)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/next", response_model=QuestionOut)
async def get_next_question(
    topic_id: str = Query(..., description="UUID of topic to quiz on"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    # Check Redis cache first
    cache_key = f"quiz:next:{current_user.id}:{topic_id}"
    cached = await redis.get(cache_key)
    if cached:
        return QuestionOut(**json.loads(cached))

    # Get student ability from mastery
    mastery = await get_current_mastery(current_user.id, topic_id, db)

    # Load candidate questions (exclude recently attempted)
    recent_ids_raw = await redis.lrange(f"recent_q:{current_user.id}", 0, 19)
    recent_ids = [r for r in recent_ids_raw]

    result = await db.execute(
        select(Question, Topic.name.label("topic_name"))
        .join(Topic, Question.topic_id == Topic.id)
        .where(
            Question.topic_id == topic_id,
            ~Question.id.in_(recent_ids) if recent_ids else True,
        )
        .limit(50)
    )
    rows = result.all()

    if not rows:
        raise HTTPException(404, "No questions available for this topic")

    candidates = [
        {"id": r.Question.id, "difficulty": r.Question.difficulty,
         "text": r.Question.text, "options": r.Question.options,
         "topic_name": r.topic_name}
        for r in rows
    ]

    selected = select_question_irt(ability=mastery, candidates=candidates)

    out = QuestionOut(
        question_id=selected["id"],
        topic_id=topic_id,
        topic_name=selected["topic_name"],
        text=selected["text"],
        options=[{"id": o["id"], "text": o["text"]} for o in selected["options"]],
        difficulty=selected["difficulty"],
    )

    # Cache for 30s to prevent double-fetch
    await redis.setex(cache_key, 30, out.model_dump_json())

    # Track recent questions (rolling window of 20)
    await redis.lpush(f"recent_q:{current_user.id}", selected["id"])
    await redis.ltrim(f"recent_q:{current_user.id}", 0, 19)

    return out


@router.post("/submit", response_model=SubmitResponse)
async def submit_answer(
    body: SubmitBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    # Load question with correct answer
    result = await db.execute(select(Question).where(Question.id == body.question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(404, "Question not found")

    correct = body.answer == question.correct_answer

    # Save attempt
    attempt = Attempt(
        user_id=current_user.id,
        question_id=body.question_id,
        correct=correct,
        time_taken_sec=body.time_taken_sec,
        confidence=body.confidence,
    )
    db.add(attempt)

    # Update Bayesian Knowledge Tracing
    old_mastery = await get_current_mastery(current_user.id, question.topic_id, db)
    new_mastery = kt.update(old_mastery, correct)
    await save_mastery(current_user.id, question.topic_id, new_mastery, db)

    # Award XP
    xp_gained = 10 if correct else 2
    if body.confidence and correct and body.confidence >= 4:
        xp_gained += 5  # bonus for confident correct answer
    current_user.xp += xp_gained

    # Invalidate cached next question
    await redis.delete(f"quiz:next:{current_user.id}:{question.topic_id}")
    # Invalidate mastery cache
    await redis.delete(f"mastery:{current_user.id}")

    return SubmitResponse(
        correct=correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        new_mastery=round(new_mastery, 4),
        mastery_delta=round(new_mastery - old_mastery, 4),
        xp_gained=xp_gained,
    )


@router.get("/history", response_model=list[AttemptOut])
async def get_history(
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt, Topic.name.label("topic_name"))
        .join(Question, Attempt.question_id == Question.id)
        .join(Topic, Question.topic_id == Topic.id)
        .where(Attempt.user_id == current_user.id)
        .order_by(desc(Attempt.attempted_at))
        .limit(limit)
    )
    rows = result.all()
    return [
        AttemptOut(
            question_id=r.Attempt.question_id,
            topic_name=r.topic_name,
            correct=r.Attempt.correct,
            time_taken_sec=r.Attempt.time_taken_sec,
            attempted_at=r.Attempt.attempted_at.isoformat(),
        )
        for r in rows
    ]
