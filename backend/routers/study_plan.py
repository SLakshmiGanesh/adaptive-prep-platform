"""
routers/study_plan.py — Daily study plan generation + revision scheduling
"""

import json
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Topic, MasterySnapshot, RevisionSchedule, StudySession
from services.recommender import StudyPlanner
from services.spaced_rep import SpacedRepetition
from routers.auth import get_current_user

router = APIRouter()
planner = StudyPlanner()
sr = SpacedRepetition()


class PlanItem(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    duration_min: int
    session_type: str      # study | revision | quiz
    priority: float
    current_mastery: float
    revision_due: bool


class CompleteBody(BaseModel):
    topic_id: str
    duration_min: int
    session_type: str = "study"


class RevisionItem(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    due_date: str
    days_overdue: int
    interval_days: int
    current_mastery: float


@router.get("/today", response_model=list[PlanItem])
async def get_today_plan(
    hours: float = Query(4.0, ge=0.5, le=12.0, description="Available study hours"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"plan:today:{current_user.id}:{date.today()}"
    cached = await redis.get(cache_key)
    if cached:
        return [PlanItem(**item) for item in json.loads(cached)]

    # Load all topics for this exam target
    topics_result = await db.execute(
        select(Topic).where(
            Topic.exam_targets.contains([current_user.exam_target])
            if current_user.exam_target else True
        )
    )
    topics = topics_result.scalars().all()

    # Load mastery for each topic
    mastery_map: dict[str, float] = {}
    for topic in topics:
        result = await db.execute(
            select(MasterySnapshot.mastery)
            .where(
                MasterySnapshot.user_id == current_user.id,
                MasterySnapshot.topic_id == topic.id,
            )
            .order_by(desc(MasterySnapshot.recorded_at))
            .limit(1)
        )
        mastery_map[topic.id] = result.scalar_one_or_none() or 0.1

    # Get due revisions
    due_revisions_result = await db.execute(
        select(RevisionSchedule).where(
            RevisionSchedule.user_id == current_user.id,
            RevisionSchedule.next_revision <= date.today(),
        )
    )
    due_topic_ids = {r.topic_id for r in due_revisions_result.scalars().all()}

    # Build plan
    topic_data = [
        {
            "id": t.id,
            "name": t.name,
            "subject": t.subject,
            "weight": t.weight,
            "mastery": mastery_map.get(t.id, 0.1),
            "revision_due": t.id in due_topic_ids,
        }
        for t in topics
    ]

    plan = planner.build_plan(topic_data, hours_available=hours)

    plan_items = [
        PlanItem(
            topic_id=item["id"],
            topic_name=item["name"],
            subject=item["subject"],
            duration_min=item["duration_min"],
            session_type="revision" if item["revision_due"] else "study",
            priority=round(item["priority"], 3),
            current_mastery=round(item["mastery"], 3),
            revision_due=item["revision_due"],
        )
        for item in plan
    ]

    # Cache for 1 hour
    await redis.setex(cache_key, 3600, json.dumps([i.model_dump() for i in plan_items]))
    return plan_items


@router.post("/complete", status_code=200)
async def complete_session(
    body: CompleteBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    session = StudySession(
        user_id=current_user.id,
        topic_id=body.topic_id,
        duration_min=body.duration_min,
        session_date=date.today(),
        session_type=body.session_type,
    )
    db.add(session)

    # Award XP for study time
    current_user.xp += body.duration_min // 5  # 1 XP per 5 min

    # Invalidate plan cache
    await redis.delete(f"plan:today:{current_user.id}:{date.today()}")

    return {"message": "Session logged", "xp_gained": body.duration_min // 5}


@router.get("/revisions", response_model=list[RevisionItem])
async def get_due_revisions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RevisionSchedule, Topic)
        .join(Topic, RevisionSchedule.topic_id == Topic.id)
        .where(RevisionSchedule.user_id == current_user.id)
        .order_by(RevisionSchedule.next_revision)
    )
    rows = result.all()

    today = date.today()
    items = []
    for r, t in rows:
        mastery_result = await db.execute(
            select(MasterySnapshot.mastery)
            .where(
                MasterySnapshot.user_id == current_user.id,
                MasterySnapshot.topic_id == t.id,
            )
            .order_by(desc(MasterySnapshot.recorded_at))
            .limit(1)
        )
        mastery = mastery_result.scalar_one_or_none() or 0.1
        days_overdue = max(0, (today - r.next_revision).days)

        items.append(RevisionItem(
            topic_id=t.id,
            topic_name=t.name,
            subject=t.subject,
            due_date=r.next_revision.isoformat(),
            days_overdue=days_overdue,
            interval_days=r.interval_days,
            current_mastery=round(mastery, 3),
        ))
    return items
