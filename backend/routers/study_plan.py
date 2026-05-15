"""
routers/study_plan.py — Daily plan generation, customization, session logging
"""

import json
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Topic, MasterySnapshot, RevisionSchedule, StudySession
from routers.auth import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class PlanItem(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    duration_min: int
    session_type: str
    priority: float
    current_mastery: float
    revision_due: bool
    reason: str
    completed: bool = False

class CompleteBody(BaseModel):
    topic_id: str
    duration_min: int
    session_type: str = "study"

class CustomizeBody(BaseModel):
    topic_ids: list[str]
    hours: float = 4.0
    focus_weak: bool = True
    include_revisions: bool = True

class GoalBody(BaseModel):
    weekly_goal_hours: int

class RevisionItem(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    due_date: str
    days_overdue: int
    interval_days: int
    current_mastery: float

# ── Priority scoring ──────────────────────────────────────────────────────────

def compute_priority(mastery: float, weight: float, revision_due: bool,
                     last_studied_days: int, focus_weak: bool) -> tuple[float, str]:
    gap      = 1.0 - mastery
    urgency  = 1.6 if revision_due else 1.0
    recency  = max(0.3, min(1.0, last_studied_days / 3.0))

    if focus_weak:
        score = urgency * gap * weight * recency
    else:
        score = urgency * weight * recency

    reasons = []
    if revision_due:       reasons.append("revision due")
    if mastery < 0.30:     reasons.append("critical gap")
    elif mastery < 0.55:   reasons.append("needs work")
    if weight > 1.5:       reasons.append("high weightage")

    return round(score, 4), " · ".join(reasons) or "standard"

def allocate_minutes(mastery: float, revision_due: bool, budget: int) -> int:
    base = 15 + int(35 * (1.0 - mastery))
    if revision_due: base = int(base * 1.2)
    alloc = max(15, min(60, base, budget))
    return (alloc // 5) * 5  # round to nearest 5

# ── Shared plan builder ───────────────────────────────────────────────────────

async def build_plan_items(
    user: User,
    db: AsyncSession,
    hours: float = 4.0,
    topic_ids: Optional[list[str]] = None,
    focus_weak: bool = True,
    include_revisions: bool = True,
) -> list[PlanItem]:

    # Load topics
    query = select(Topic)
    if topic_ids:
        query = query.where(Topic.id.in_(topic_ids))
    elif user.exam_target:
        query = query.where(Topic.exam_targets.contains([user.exam_target]))

    topics_res = await db.execute(query)
    topics = topics_res.scalars().all()

    # Latest mastery per topic
    mastery_map: dict[str, float] = {}
    for t in topics:
        res = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == user.id, MasterySnapshot.topic_id == t.id)
            .order_by(desc(MasterySnapshot.recorded_at)).limit(1)
        )
        mastery_map[t.id] = res.scalar_one_or_none() or 0.10

    # Due revisions
    rev_res = await db.execute(
        select(RevisionSchedule.topic_id)
        .where(RevisionSchedule.user_id == user.id,
               RevisionSchedule.next_revision <= date.today())
    )
    due_ids = {r[0] for r in rev_res.all()}

    # Last studied (days ago)
    today = date.today()
    last_study_map: dict[str, int] = {}
    for t in topics:
        res = await db.execute(
            select(func.max(StudySession.session_date))
            .where(StudySession.user_id == user.id, StudySession.topic_id == t.id)
        )
        last = res.scalar_one_or_none()
        last_study_map[t.id] = (today - last).days if last else 999

    # Score and sort
    scored = []
    for t in topics:
        m = mastery_map[t.id]
        rev_due = t.id in due_ids
        if m >= 0.92 and not rev_due: continue
        if not include_revisions and rev_due: continue
        priority, reason = compute_priority(
            m, t.weight, rev_due, last_study_map[t.id], focus_weak
        )
        scored.append((t, m, rev_due, priority, reason))

    scored.sort(key=lambda x: x[3], reverse=True)

    # Allocate time
    budget = int(hours * 60)
    plan: list[PlanItem] = []

    for t, m, rev_due, priority, reason in scored:
        if budget < 15: break
        dur = allocate_minutes(m, rev_due, budget)
        if dur < 15: continue
        stype = "revision" if rev_due else ("study" if m < 0.5 else "practice")
        plan.append(PlanItem(
            topic_id=t.id, topic_name=t.name, subject=t.subject,
            duration_min=dur, session_type=stype,
            priority=priority, current_mastery=round(m, 3),
            revision_due=rev_due, reason=reason,
        ))
        budget -= dur

    return plan

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/today", response_model=list[PlanItem])
async def today_plan(
    hours: float = Query(4.0, ge=0.5, le=12.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = f"plan:today:{current_user.id}:{date.today()}:{hours}"
    cached = await redis.get(cache_key)
    if cached:
        return [PlanItem(**i) for i in json.loads(cached)]

    plan = await build_plan_items(current_user, db, hours=hours)
    await redis.setex(cache_key, 1800, json.dumps([i.model_dump() for i in plan]))
    return plan


@router.post("/customize", response_model=list[PlanItem])
async def customize_plan(
    body: CustomizeBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    plan = await build_plan_items(
        current_user, db,
        hours=body.hours,
        topic_ids=body.topic_ids if body.topic_ids else None,
        focus_weak=body.focus_weak,
        include_revisions=body.include_revisions,
    )
    # Invalidate daily cache
    pattern = f"plan:today:{current_user.id}:*"
    keys = await redis.keys(pattern)
    if keys:
        await redis.delete(*keys)
    return plan


@router.post("/complete")
async def complete_session(
    body: CompleteBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    db.add(StudySession(
        user_id=current_user.id,
        topic_id=body.topic_id,
        duration_min=body.duration_min,
        session_date=date.today(),
        session_type=body.session_type,
    ))
    xp_gained = body.duration_min // 5
    current_user.xp += xp_gained

    # Invalidate plan cache
    keys = await redis.keys(f"plan:today:{current_user.id}:*")
    if keys: await redis.delete(*keys)
    await redis.delete(f"heatmap:{current_user.id}")

    return {"message": "Session logged", "xp_gained": xp_gained}


@router.patch("/goal")
async def update_goal(
    body: GoalBody,
    current_user: User = Depends(get_current_user),
):
    current_user.weekly_goal_hours = body.weekly_goal_hours
    return {"weekly_goal_hours": body.weekly_goal_hours}


@router.get("/revisions", response_model=list[RevisionItem])
async def get_revisions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(RevisionSchedule, Topic)
        .join(Topic, RevisionSchedule.topic_id == Topic.id)
        .where(RevisionSchedule.user_id == current_user.id)
        .order_by(RevisionSchedule.next_revision)
    )
    rows = res.all()
    today = date.today()
    items = []
    for r, t in rows:
        mres = await db.execute(
            select(MasterySnapshot.mastery)
            .where(MasterySnapshot.user_id == current_user.id,
                   MasterySnapshot.topic_id == t.id)
            .order_by(desc(MasterySnapshot.recorded_at)).limit(1)
        )
        mastery = mres.scalar_one_or_none() or 0.1
        days_over = max(0, (today - r.next_revision).days)
        items.append(RevisionItem(
            topic_id=t.id, topic_name=t.name, subject=t.subject,
            due_date=r.next_revision.isoformat(),
            days_overdue=days_over,
            interval_days=r.interval_days,
            current_mastery=round(mastery, 3),
        ))
    return items
