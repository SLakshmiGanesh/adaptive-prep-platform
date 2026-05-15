"""
routers/analytics.py — Heatmap, prediction, mastery trend, subject breakdown
"""

import json, math
from datetime import datetime, timedelta, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import Integer, cast, select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Topic, MasterySnapshot, Attempt, Question, Prediction
from routers.auth import get_current_user

router = APIRouter()

# ── Exam scoring config ───────────────────────────────────────────────────────

EXAM_CFG = {
    "JEE":      {"max": 360,  "correct": 4,  "wrong": -1,   "total_q": 90},
    "NEET":     {"max": 720,  "correct": 4,  "wrong": -1,   "total_q": 180},
    "GATE":     {"max": 100,  "correct": 1,  "wrong": -0.33,"total_q": 65},
    "UPSC":     {"max": 200,  "correct": 2,  "wrong": -0.66,"total_q": 100},
    "CAT":      {"max": 300,  "correct": 3,  "wrong": -1,   "total_q": 66},
    "GMAT":     {"max": 800,  "correct": 1,  "wrong": 0,    "total_q": 80},
    "GRE":      {"max": 340,  "correct": 1,  "wrong": 0,    "total_q": 80},
    "semester": {"max": 100,  "correct": 1,  "wrong": 0,    "total_q": 100},
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class HeatCell(BaseModel):
    topic_id: str; topic_name: str; subject: str
    mastery: float; accuracy: float
    total_attempts: int; correct_attempts: int
    trend: float; mastery_label: str

class MasteryTrend(BaseModel):
    date: str; avg_mastery: float
    topics_covered: int; study_minutes: int

class SubjectBreak(BaseModel):
    subject: str; mastery: float; score: float

class PredictionOut(BaseModel):
    predicted_score: float; max_score: float; percentile: float
    confidence_low: float; confidence_high: float
    weak_topics: list[dict]; strong_topics: list[dict]
    days_to_exam: Optional[int]
    weighted_mastery: float
    subject_breakdown: list[dict]

def mastery_label(m: float) -> str:
    if m < 0.20: return "Critical"
    if m < 0.40: return "Weak"
    if m < 0.60: return "Developing"
    if m < 0.80: return "Proficient"
    return "Mastered"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/heatmap", response_model=list[HeatCell])
async def heatmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"heatmap:{current_user.id}"
    cached = await redis.get(cache_key)
    if cached:
        return [HeatCell(**c) for c in json.loads(cached)]

    # All topics
    topics_res = await db.execute(select(Topic))
    topics = {t.id: t for t in topics_res.scalars().all()}

    # Latest mastery per topic (subquery approach)
    mastery_res = await db.execute(
        select(
            MasterySnapshot.topic_id,
            func.max(MasterySnapshot.recorded_at).label("latest"),
        )
        .where(MasterySnapshot.user_id == current_user.id)
        .group_by(MasterySnapshot.topic_id)
    )
    latest_times = {r.topic_id: r.latest for r in mastery_res.all()}

    mastery_map: dict[str, float] = {}
    for tid, latest in latest_times.items():
        res = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == current_user.id,
                   MasterySnapshot.topic_id == tid,
                   MasterySnapshot.recorded_at == latest)
            .limit(1)
        )
        mastery_map[tid] = res.scalar_one_or_none() or 0.0

    # 7-day-ago mastery for trend
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    old_mastery: dict[str, float] = {}
    for tid in mastery_map:
        res = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == current_user.id,
                   MasterySnapshot.topic_id == tid,
                   MasterySnapshot.recorded_at <= week_ago)
            .order_by(desc(MasterySnapshot.recorded_at)).limit(1)
        )
        old_mastery[tid] = res.scalar_one_or_none() or mastery_map[tid]

    # Attempt stats
    stats_res = await db.execute(
        select(
            Question.topic_id,
            func.count(Attempt.id).label("total"),
            func.sum(cast(Attempt.correct, Integer)).label("correct_count"),
        )
        .join(Question, Attempt.question_id == Question.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Question.topic_id)
    )
    stats_map = {r.topic_id: {"total": r.total, "correct": int(r.correct_count or 0)}
                 for r in stats_res.all()}

    cells = []
    for tid, mastery in mastery_map.items():
        t = topics.get(tid)
        if not t: continue
        st = stats_map.get(tid, {"total": 0, "correct": 0})
        acc = st["correct"] / st["total"] if st["total"] > 0 else 0.0
        trend = mastery - old_mastery.get(tid, mastery)
        cells.append(HeatCell(
            topic_id=tid, topic_name=t.name, subject=t.subject,
            mastery=round(mastery, 3), accuracy=round(acc, 3),
            total_attempts=st["total"], correct_attempts=st["correct"],
            trend=round(trend, 3), mastery_label=mastery_label(mastery),
        ))

    cells.sort(key=lambda x: x.mastery)
    await redis.setex(cache_key, 300, json.dumps([c.model_dump() for c in cells]))
    return cells


@router.get("/mastery-trend", response_model=list[MasteryTrend])
async def mastery_trend(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    res = await db.execute(
        select(
            func.date(MasterySnapshot.recorded_at).label("day"),
            func.avg(MasterySnapshot.mastery).label("avg_m"),
            func.count(func.distinct(MasterySnapshot.topic_id)).label("topics"),
        )
        .where(MasterySnapshot.user_id == current_user.id,
               MasterySnapshot.recorded_at >= since)
        .group_by(func.date(MasterySnapshot.recorded_at))
        .order_by(func.date(MasterySnapshot.recorded_at))
    )
    rows = res.all()

    # Also get study minutes per day
    mins_res = await db.execute(
        select(
            func.cast(func.date(func.cast(MasterySnapshot.recorded_at, func.Date())), func.String()).label("day"),
            func.sum(func.literal(0)).label("mins"),  # placeholder - join with sessions
        )
        .where(MasterySnapshot.user_id == current_user.id,
               MasterySnapshot.recorded_at >= since)
        .group_by(func.date(MasterySnapshot.recorded_at))
    )

    return [
        MasteryTrend(
            date=str(r.day),
            avg_mastery=round(float(r.avg_m), 3),
            topics_covered=int(r.topics),
            study_minutes=0,  # enriched by frontend if needed
        )
        for r in rows
    ]


@router.get("/predict", response_model=PredictionOut)
async def predict_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"predict:{current_user.id}"
    cached = await redis.get(cache_key)
    if cached:
        return PredictionOut(**json.loads(cached))

    # Gather mastery vector with topic weights
    res = await db.execute(
        select(
            MasterySnapshot.topic_id,
            func.max(MasterySnapshot.recorded_at).label("latest"),
        )
        .where(MasterySnapshot.user_id == current_user.id)
        .group_by(MasterySnapshot.topic_id)
    )
    latest_times = {r.topic_id: r.latest for r in res.all()}

    if not latest_times:
        raise HTTPException(status_code=404,
            detail="No mastery data. Complete at least 10 quiz questions first.")

    mastery_data = []
    for tid, lt in latest_times.items():
        mres = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == current_user.id,
                   MasterySnapshot.topic_id == tid,
                   MasterySnapshot.recorded_at == lt)
        )
        m = mres.scalar_one_or_none() or 0.0

        tres = await db.execute(select(Topic).where(Topic.id == tid))
        t = tres.scalar_one_or_none()
        if t:
            mastery_data.append((tid, m, t.weight, t.name, t.subject))

    cfg = EXAM_CFG.get(current_user.exam_target or "semester", EXAM_CFG["semester"])
    max_score = cfg["max"]

    total_weight = sum(w for _, _, w, _, _ in mastery_data) or 1.0
    weighted_mastery = sum(m * w for _, m, w, _, _ in mastery_data) / total_weight

    # Negative-marking aware score model
    p_correct = weighted_mastery
    p_wrong   = (1 - weighted_mastery) * 0.45
    raw_score_ratio = p_correct * cfg["correct"] + p_wrong * cfg["wrong"]
    raw_score_ratio = max(0, raw_score_ratio / cfg["correct"])
    predicted = round(raw_score_ratio * max_score, 1)
    predicted = max(0, min(max_score, predicted))

    # Confidence interval
    std = math.sqrt(sum((m - weighted_mastery) ** 2 for _, m, _, _, _ in mastery_data) / max(1, len(mastery_data)))
    ci_half = max_score * std * 0.28
    ci_low  = max(0, round(predicted - ci_half, 1))
    ci_high = min(max_score, round(predicted + ci_half, 1))

    # Percentile (sigmoid)
    mid = max_score * 0.5
    percentile = round(100 / (1 + math.exp(-(predicted - mid) / (max_score * 0.1))), 1)

    # Weak / strong
    sorted_topics = sorted(mastery_data, key=lambda x: x[1])
    weak   = [{"id": t[0], "name": t[3], "mastery": round(t[1], 3)} for t in sorted_topics[:6] if t[1] < 0.55]
    strong = [{"id": t[0], "name": t[3], "mastery": round(t[1], 3)} for t in sorted_topics[-6:] if t[1] > 0.65]

    # Subject breakdown
    subject_map: dict[str, list[float]] = {}
    for _, m, w, _, subj in mastery_data:
        subject_map.setdefault(subj, []).append(m)
    breakdown = [
        {"subject": s, "mastery": round(sum(ms) / len(ms), 3),
         "score": round((sum(ms) / len(ms)) * max_score / len(subject_map), 1)}
        for s, ms in subject_map.items()
    ]

    # Days to exam
    days_to_exam = None
    if current_user.exam_date:
        days_to_exam = max(0, (current_user.exam_date - date.today()).days)

    # Persist
    db.add(Prediction(
        user_id=current_user.id,
        predicted_score=predicted,
        max_score=max_score,
        weak_topics=weak,
        strong_topics=strong,
        subject_breakdown=breakdown,
        confidence_interval={"low": ci_low, "high": ci_high},
    ))

    out = PredictionOut(
        predicted_score=predicted, max_score=max_score, percentile=percentile,
        confidence_low=ci_low, confidence_high=ci_high,
        weak_topics=weak, strong_topics=strong,
        days_to_exam=days_to_exam, weighted_mastery=round(weighted_mastery, 3),
        subject_breakdown=breakdown,
    )
    await redis.setex(cache_key, 3600, out.model_dump_json())
    return out


@router.get("/subjects")
async def subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Topic.subject, func.count(Topic.id).label("topic_count"))
        .where(Topic.exam_targets.contains([current_user.exam_target or "JEE"]))
        .group_by(Topic.subject)
        .order_by(Topic.subject)
    )
    return [{"subject": r.subject, "topic_count": r.topic_count} for r in res.all()]

