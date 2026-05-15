"""
routers/quiz.py — Adaptive quiz: IRT question selection, BKT update, GATE numerical
"""

import json, math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import Question, Attempt, MasterySnapshot, Topic, User
from routers.auth import get_current_user

router = APIRouter()

# ── BKT ───────────────────────────────────────────────────────────────────────

P_LEARN = 0.15
P_SLIP  = 0.10
P_GUESS = 0.20

def bkt_update(p_known: float, correct: bool) -> float:
    p_obs_k  = (1 - P_SLIP)  if correct else P_SLIP
    p_obs_nk = P_GUESS        if correct else (1 - P_GUESS)
    numer = p_obs_k * p_known
    denom = numer + p_obs_nk * (1 - p_known)
    posterior = numer / denom if denom > 0 else p_known
    return max(0.0, min(1.0, posterior + (1 - posterior) * P_LEARN))

# ── IRT ───────────────────────────────────────────────────────────────────────

def mastery_to_theta(m: float) -> float:
    p = max(0.01, min(0.99, m))
    return max(-3.0, min(3.0, math.log(p / (1 - p))))

def fisher_info(theta: float, a: float, b_diff: float) -> float:
    b = max(-3.0, min(3.0, math.log(max(0.01, min(0.99, b_diff)) / (1 - max(0.01, min(0.99, b_diff))))))
    p = 1 / (1 + math.exp(-a * (theta - b)))
    return a ** 2 * p * (1 - p)

# ── Schemas ───────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    question_id: str
    topic_id: str
    topic_name: str
    subject: str
    text: str
    options: list[dict]
    difficulty: float
    difficulty_label: str
    question_type: str   # mcq | numerical | msq

class SubmitBody(BaseModel):
    question_id: str
    answer: str
    time_taken_sec: int
    confidence: Optional[int] = None

class SubmitRes(BaseModel):
    correct: bool
    correct_answer: str
    explanation: Optional[str]
    new_mastery: float
    mastery_delta: float
    xp_gained: int
    time_rank: str   # fast | normal | slow

# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_mastery(user_id: str, topic_id: str, db: AsyncSession) -> float:
    res = await db.execute(
        select(MasterySnapshot.mastery)
        .where(MasterySnapshot.user_id == user_id, MasterySnapshot.topic_id == topic_id)
        .order_by(desc(MasterySnapshot.recorded_at)).limit(1)
    )
    val = res.scalar_one_or_none()
    return val if val is not None else 0.10

async def save_mastery(user_id: str, topic_id: str, mastery: float, db: AsyncSession):
    db.add(MasterySnapshot(user_id=user_id, topic_id=topic_id, mastery=mastery))

def diff_label(d: float) -> str:
    if d < 0.33: return "Easy"
    if d < 0.67: return "Medium"
    return "Hard"

def check_numerical(user_ans: str, correct_ans: str, tolerance: float = 0.01) -> bool:
    """GATE numerical: accept within 1% relative tolerance."""
    try:
        u = float(user_ans.strip())
        c = float(correct_ans.strip())
        if c == 0:
            return abs(u) < tolerance
        return abs(u - c) / abs(c) <= tolerance
    except (ValueError, ZeroDivisionError):
        return user_ans.strip().lower() == correct_ans.strip().lower()

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/next", response_model=QuestionOut)
async def next_question(
    topic_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"quiz:next:{current_user.id}:{topic_id}"
    cached = await redis.get(cache_key)
    if cached:
        return QuestionOut(**json.loads(cached))

    mastery = await get_mastery(current_user.id, topic_id, db)
    theta   = mastery_to_theta(mastery)

    # Exclude recently attempted questions
    recent_raw = await redis.lrange(f"recent_q:{current_user.id}", 0, 29)

    res = await db.execute(
        select(Question, Topic.name.label("tn"), Topic.subject.label("sub"))
        .join(Topic, Question.topic_id == Topic.id)
        .where(
            Question.topic_id == topic_id,
            ~Question.id.in_(recent_raw) if recent_raw else True,
        )
        .limit(60)
    )
    rows = res.all()

    if not rows:
        raise HTTPException(404, "No questions available for this topic. Add more questions via the seed script.")

    candidates = [
        {
            "id": r.Question.id,
            "text": r.Question.text,
            "options": r.Question.options,
            "difficulty": r.Question.difficulty,
            "discrimination": r.Question.discrimination,
            "question_type": r.Question.question_type,
            "topic_name": r.tn,
            "subject": r.sub,
        }
        for r in rows
    ]

    # IRT: pick question maximizing Fisher information at student's theta
    best = max(candidates, key=lambda q: fisher_info(theta, q["discrimination"], q["difficulty"]))

    out = QuestionOut(
        question_id=best["id"],
        topic_id=topic_id,
        topic_name=best["topic_name"],
        subject=best["subject"],
        text=best["text"],
        options=[{"id": o["id"], "text": o["text"]} for o in (best["options"] or [])],
        difficulty=best["difficulty"],
        difficulty_label=diff_label(best["difficulty"]),
        question_type=best["question_type"],
    )

    await redis.setex(cache_key, 30, out.model_dump_json())
    await redis.lpush(f"recent_q:{current_user.id}", best["id"])
    await redis.ltrim(f"recent_q:{current_user.id}", 0, 29)

    return out


@router.post("/submit", response_model=SubmitRes)
async def submit_answer(
    body: SubmitBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    res = await db.execute(select(Question).where(Question.id == body.question_id))
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(404, "Question not found")

    # Check correctness (numerical vs MCQ)
    if question.question_type == "numerical":
        correct = check_numerical(body.answer, question.correct_answer)
    else:
        correct = body.answer.strip().upper() == question.correct_answer.strip().upper()

    # BKT update
    old_mastery = await get_mastery(current_user.id, question.topic_id, db)
    new_mastery = bkt_update(old_mastery, correct)
    await save_mastery(current_user.id, question.topic_id, new_mastery, db)

    # Save attempt
    db.add(Attempt(
        user_id=current_user.id,
        question_id=body.question_id,
        correct=correct,
        time_taken_sec=body.time_taken_sec,
        confidence=body.confidence,
    ))

    # XP calculation
    diff_bonus  = int(question.difficulty * 10)
    base_xp     = 10 if correct else 2
    speed_bonus = 5 if body.time_taken_sec < 30 and correct else 0
    conf_bonus  = 5 if (body.confidence or 0) >= 4 and correct else 0
    xp_gained   = base_xp + diff_bonus + speed_bonus + conf_bonus

    current_user.xp += xp_gained

    # Time rank
    if body.time_taken_sec < 30:   time_rank = "fast"
    elif body.time_taken_sec < 90: time_rank = "normal"
    else:                          time_rank = "slow"

    # Invalidate caches
    await redis.delete(f"quiz:next:{current_user.id}:{question.topic_id}")
    await redis.delete(f"mastery:{current_user.id}")
    await redis.delete(f"heatmap:{current_user.id}")

    return SubmitRes(
        correct=correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        new_mastery=round(new_mastery, 4),
        mastery_delta=round(new_mastery - old_mastery, 4),
        xp_gained=xp_gained,
        time_rank=time_rank,
    )


@router.get("/history")
async def history(
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Attempt, Topic.name.label("tn"), Question.difficulty)
        .join(Question, Attempt.question_id == Question.id)
        .join(Topic, Question.topic_id == Topic.id)
        .where(Attempt.user_id == current_user.id)
        .order_by(desc(Attempt.attempted_at))
        .limit(limit)
    )
    return [
        {
            "question_id": r.Attempt.question_id,
            "topic_name": r.tn,
            "correct": r.Attempt.correct,
            "time_taken_sec": r.Attempt.time_taken_sec,
            "difficulty": r.difficulty,
            "attempted_at": r.Attempt.attempted_at.isoformat(),
        }
        for r in res.all()
    ]
