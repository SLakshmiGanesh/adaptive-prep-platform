"""
routers/topics.py — Topic listing, search, and mastery summary
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.orm import Topic, MasterySnapshot, User
from routers.auth import get_current_user

router = APIRouter()


@router.get("")
async def list_topics(
    subject: str | None = Query(None),
    exam: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Topic)
    if subject:
        q = q.where(Topic.subject == subject)
    if exam:
        q = q.where(Topic.exam_targets.contains([exam]))
    elif current_user.exam_target:
        q = q.where(Topic.exam_targets.contains([current_user.exam_target]))

    res = await db.execute(q.order_by(Topic.subject, Topic.order_index))
    return [
        {"id": t.id, "name": t.name, "subject": t.subject,
         "weight": t.weight, "difficulty_baseline": t.difficulty_baseline,
         "exam_targets": t.exam_targets}
        for t in res.scalars().all()
    ]


@router.get("/search")
async def search_topics(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Topic)
        .where(Topic.name.ilike(f"%{q}%"))
        .limit(20)
    )
    return [
        {"id": t.id, "name": t.name, "subject": t.subject,
         "weight": t.weight, "difficulty_baseline": t.difficulty_baseline}
        for t in res.scalars().all()
    ]


@router.get("/mastery")
async def topic_mastery(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All topics with their latest mastery for the current user."""
    # Get all topics for this user's exam
    topics_res = await db.execute(
        select(Topic)
        .where(Topic.exam_targets.contains([current_user.exam_target or "JEE"]))
        .order_by(Topic.subject, Topic.name)
    )
    topics = topics_res.scalars().all()

    result = []
    for t in topics:
        mres = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == current_user.id,
                   MasterySnapshot.topic_id == t.id)
            .order_by(desc(MasterySnapshot.recorded_at)).limit(1)
        )
        mastery = mres.scalar_one_or_none() or 0.0
        result.append({
            "id": t.id, "name": t.name, "subject": t.subject,
            "mastery": round(mastery, 3), "weight": t.weight,
        })

    return result
