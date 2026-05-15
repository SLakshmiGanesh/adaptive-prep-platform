"""
routers/gamification.py — XP, levels, badges, leaderboard
"""

import json
import math
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Attempt
from routers.auth import get_current_user

router = APIRouter()

# ── Level table ───────────────────────────────────────────────────────────────

LEVELS = [
    (0,     "Novice"),
    (500,   "Apprentice"),
    (1500,  "Scholar"),
    (3500,  "Achiever"),
    (7000,  "Expert"),
    (12000, "Master"),
    (20000, "Grandmaster"),
    (35000, "Legend"),
]

BADGES = {
    "first_blood":   {"name": "First Blood",    "desc": "Complete your first quiz",       "icon": "🎯"},
    "streak_7":      {"name": "Week Warrior",    "desc": "7-day study streak",             "icon": "🔥"},
    "streak_30":     {"name": "Iron Will",       "desc": "30-day study streak",            "icon": "⚡"},
    "perfectionist": {"name": "Perfectionist",   "desc": "10 correct answers in a row",   "icon": "💎"},
    "topic_master":  {"name": "Topic Master",    "desc": "80%+ mastery on any topic",     "icon": "🏆"},
    "speed_demon":   {"name": "Speed Demon",     "desc": "10 questions answered < 20s",   "icon": "⚡"},
    "all_rounder":   {"name": "All-Rounder",     "desc": "Study 3+ subjects in one day",  "icon": "🌟"},
    "night_owl":     {"name": "Night Owl",       "desc": "Study after 11 PM",             "icon": "🦉"},
    "early_bird":    {"name": "Early Bird",      "desc": "Study before 6 AM",             "icon": "🌅"},
    "completionist": {"name": "Completionist",   "desc": "Finish daily plan 7 days in a row","icon": "✅"},
    "gate_crasher":  {"name": "GATE Crasher",    "desc": "Solve 20 GATE numerical questions","icon": "⚙️"},
    "centurion":     {"name": "Centurion",        "desc": "100 quiz questions answered",   "icon": "💯"},
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_level_info(xp: int) -> dict:
    level, title = 0, LEVELS[0][1]
    for i, (thresh, t) in enumerate(LEVELS):
        if xp >= thresh:
            level, title = i + 1, t

    current_thresh = LEVELS[level - 1][0]
    if level < len(LEVELS):
        next_thresh = LEVELS[level][0]
        xp_in_level = xp - current_thresh
        xp_to_next = next_thresh - current_thresh
        pct = round((xp_in_level / xp_to_next) * 100, 1)
    else:
        xp_to_next = 0
        pct = 100.0

    return {"level": level, "title": title, "xp_to_next": xp_to_next, "progress_pct": pct}

# ── Schemas ───────────────────────────────────────────────────────────────────

class GamStats(BaseModel):
    xp: int; level: int; level_title: str
    level_progress_pct: float; xp_to_next: int
    streak_days: int; streak_warning: str | None
    total_attempts: int; accuracy: float
    badges_earned: int; total_badges: int

class BadgeOut(BaseModel):
    id: str; name: str; desc: str; icon: str; earned: bool

class LeaderEntry(BaseModel):
    rank: int; name: str; xp: int
    streak_days: int; level: int; level_title: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=GamStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    li = get_level_info(current_user.xp)

    total_res = await db.execute(
        select(func.count(Attempt.id)).where(Attempt.user_id == current_user.id)
    )
    correct_res = await db.execute(
        select(func.count(Attempt.id))
        .where(Attempt.user_id == current_user.id, Attempt.correct == True)
    )
    total   = total_res.scalar() or 0
    correct = correct_res.scalar() or 0
    accuracy = correct / total if total > 0 else 0.0

    # Streak warning
    from datetime import date, timedelta
    warning = None
    if current_user.last_active:
        days_since = (date.today() - current_user.last_active.date()).days
        if days_since == 1 and current_user.streak_days > 0:
            warning = f"Study today to keep your {current_user.streak_days}-day streak!"
        elif days_since > 1:
            warning = "Streak lost. Start fresh today!"

    earned = current_user.earned_badges or []

    return GamStats(
        xp=current_user.xp, level=li["level"], level_title=li["title"],
        level_progress_pct=li["progress_pct"], xp_to_next=li["xp_to_next"],
        streak_days=current_user.streak_days, streak_warning=warning,
        total_attempts=total, accuracy=round(accuracy, 3),
        badges_earned=len(earned), total_badges=len(BADGES),
    )


@router.get("/badges", response_model=list[BadgeOut])
async def get_badges(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    earned = set(current_user.earned_badges or [])
    return [
        BadgeOut(id=bid, name=b["name"], desc=b["desc"], icon=b["icon"], earned=bid in earned)
        for bid, b in BADGES.items()
    ]


@router.get("/leaderboard", response_model=list[LeaderEntry])
async def leaderboard(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = "leaderboard:global"
    cached = await redis.get(cache_key)
    if cached:
        return [LeaderEntry(**e) for e in json.loads(cached)]

    res = await db.execute(
        select(User).order_by(desc(User.xp)).limit(limit)
    )
    users = res.scalars().all()

    entries = []
    for rank, u in enumerate(users, 1):
        li = get_level_info(u.xp)
        entries.append(LeaderEntry(
            rank=rank, name=u.name, xp=u.xp,
            streak_days=u.streak_days,
            level=li["level"], level_title=li["title"],
        ))

    await redis.setex(cache_key, 300, json.dumps([e.model_dump() for e in entries]))
    return entries
