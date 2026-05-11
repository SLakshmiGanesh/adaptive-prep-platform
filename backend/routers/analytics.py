"""
routers/analytics.py — Mastery heatmaps, score prediction, performance trends
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Topic, MasterySnapshot, Attempt, Question, Prediction
from services.predictor import ScorePredictor
from routers.auth import get_current_user

router = APIRouter()
predictor = ScorePredictor()


class HeatmapCell(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    mastery: float
    total_attempts: int
    correct_attempts: int
    accuracy: float
    trend: float  # mastery change over last 7 days


class MasteryTrend(BaseModel):
    date: str
    avg_mastery: float
    topics_covered: int


class PredictionOut(BaseModel):
    predicted_score: float
    max_score: float
    percentile: float
    confidence_low: float
    confidence_high: float
    weak_topics: list[dict]
    strong_topics: list[dict]
    days_to_exam: int | None


@router.get("/heatmap", response_model=list[HeatmapCell])
async def get_heatmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"heatmap:{current_user.id}"
    cached = await redis.get(cache_key)
    if cached:
        return [HeatmapCell(**c) for c in json.loads(cached)]

    # Get all topics
    topics_result = await db.execute(select(Topic))
    topics = {t.id: t for t in topics_result.scalars().all()}

    # Get latest mastery per topic
    mastery_result = await db.execute(
        select(
            MasterySnapshot.topic_id,
            MasterySnapshot.mastery,
        )
        .where(MasterySnapshot.user_id == current_user.id)
        .distinct(MasterySnapshot.topic_id)
        .order_by(MasterySnapshot.topic_id, desc(MasterySnapshot.recorded_at))
    )
    mastery_map = {r.topic_id: r.mastery for r in mastery_result.all()}

    # 7-day-old mastery for trend
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    old_mastery_result = await db.execute(
        select(MasterySnapshot.topic_id, MasterySnapshot.mastery)
        .where(
            MasterySnapshot.user_id == current_user.id,
            MasterySnapshot.recorded_at <= week_ago,
        )
        .distinct(MasterySnapshot.topic_id)
        .order_by(MasterySnapshot.topic_id, desc(MasterySnapshot.recorded_at))
    )
    old_mastery_map = {r.topic_id: r.mastery for r in old_mastery_result.all()}

    # Attempt stats per topic
    attempt_stats = await db.execute(
        select(
            Question.topic_id,
            func.count(Attempt.id).label("total"),
            func.sum(func.cast(Attempt.correct, func.Integer())).label("correct_count"),
        )
        .join(Question, Attempt.question_id == Question.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Question.topic_id)
    )
    stats_map = {r.topic_id: {"total": r.total, "correct": r.correct_count or 0}
                 for r in attempt_stats.all()}

    cells = []
    for topic_id, mastery in mastery_map.items():
        topic = topics.get(topic_id)
        if not topic:
            continue
        stats = stats_map.get(topic_id, {"total": 0, "correct": 0})
        accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0.0
        old_m = old_mastery_map.get(topic_id, mastery)
        trend = mastery - old_m

        cells.append(HeatmapCell(
            topic_id=topic_id,
            topic_name=topic.name,
            subject=topic.subject,
            mastery=round(mastery, 3),
            total_attempts=stats["total"],
            correct_attempts=stats["correct"],
            accuracy=round(accuracy, 3),
            trend=round(trend, 3),
        ))

    cells.sort(key=lambda x: x.mastery)
    await redis.setex(cache_key, 300, json.dumps([c.model_dump() for c in cells]))
    return cells


@router.get("/predict", response_model=PredictionOut)
async def get_prediction(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"predict:{current_user.id}"
    cached = await redis.get(cache_key)
    if cached:
        return PredictionOut(**json.loads(cached))

    # Gather mastery vector
    mastery_result = await db.execute(
        select(MasterySnapshot.topic_id, MasterySnapshot.mastery, Topic.weight, Topic.name)
        .join(Topic, MasterySnapshot.topic_id == Topic.id)
        .where(MasterySnapshot.user_id == current_user.id)
        .distinct(MasterySnapshot.topic_id)
        .order_by(MasterySnapshot.topic_id, desc(MasterySnapshot.recorded_at))
    )
    mastery_data = mastery_result.all()

    if not mastery_data:
        raise HTTPException(404, "Not enough data for prediction. Complete some quizzes first.")

    prediction = predictor.predict(
        mastery_vector=[(r.topic_id, r.mastery, r.weight, r.name) for r in mastery_data],
        exam_target=current_user.exam_target,
        exam_date=current_user.exam_date,
    )

    # Save prediction to DB
    pred_record = Prediction(
        user_id=current_user.id,
        predicted_score=prediction["score"],
        max_score=prediction["max_score"],
        weak_topics=prediction["weak_topics"],
        strong_topics=prediction["strong_topics"],
        confidence_interval={"low": prediction["ci_low"], "high": prediction["ci_high"]},
    )
    db.add(pred_record)

    out = PredictionOut(
        predicted_score=prediction["score"],
        max_score=prediction["max_score"],
        percentile=prediction["percentile"],
        confidence_low=prediction["ci_low"],
        confidence_high=prediction["ci_high"],
        weak_topics=prediction["weak_topics"],
        strong_topics=prediction["strong_topics"],
        days_to_exam=prediction.get("days_to_exam"),
    )

    await redis.setex(cache_key, 3600, out.model_dump_json())
    return out


@router.get("/mastery-trend", response_model=list[MasteryTrend])
async def get_mastery_trend(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(MasterySnapshot.recorded_at).label("day"),
            func.avg(MasterySnapshot.mastery).label("avg_mastery"),
            func.count(func.distinct(MasterySnapshot.topic_id)).label("topics"),
        )
        .where(
            MasterySnapshot.user_id == current_user.id,
            MasterySnapshot.recorded_at >= since,
        )
        .group_by(func.date(MasterySnapshot.recorded_at))
        .order_by(func.date(MasterySnapshot.recorded_at))
    )
    return [
        MasteryTrend(
            date=str(r.day),
            avg_mastery=round(float(r.avg_mastery), 3),
            topics_covered=r.topics,
        )
        for r in result.all()
    ]
