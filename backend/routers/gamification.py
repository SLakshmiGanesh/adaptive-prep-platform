"""
routers/gamification.py — XP, level, badges, leaderboard endpoints
"""

import json
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User, Attempt, StudySession
from services.gamification import GamificationEngine, BADGES, LEVELS
from routers.auth import get_current_user

router = APIRouter()
engine = GamificationEngine()


class LevelOut(BaseModel):
    level: int
    title: str
    current_xp: int
    xp_for_next: int
    xp_in_level: int
    progress_pct: float


class BadgeOut(BaseModel):
    id: str
    name: str
    desc: str
    icon: str
    earned: bool


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    xp: int
    streak_days: int
    level: int
    level_title: str


@router.get("/level", response_model=LevelOut)
async def get_level(
    current_user: User = Depends(get_current_user),
):
    info = engine.get_level(current_user.xp)
    return LevelOut(
        level=info.level,
        title=info.title,
        current_xp=info.current_xp,
        xp_for_next=info.xp_for_next,
        xp_in_level=info.xp_in_level,
        progress_pct=info.progress_pct,
    )


@router.get("/badges", response_model=list[BadgeOut])
async def get_badges(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    """Return all badges with earned/unearned status."""
    earned_key = f"badges:{current_user.id}"
    earned_raw = await redis.smembers(earned_key)
    earned_set = set(earned_raw)

    return [
        BadgeOut(
            id=bid,
            name=b["name"],
            desc=b["desc"],
            icon=b["icon"],
            earned=bid in earned_set,
        )
        for bid, b in BADGES.items()
    ]


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    cache_key = "leaderboard:global"
    cached = await redis.get(cache_key)
    if cached:
        return [LeaderboardEntry(**e) for e in json.loads(cached)]

    result = await db.execute(
        select(User)
        .order_by(desc(User.xp))
        .limit(limit)
    )
    users = result.scalars().all()

    entries = []
    for rank, user in enumerate(users, 1):
        level_info = engine.get_level(user.xp)
        entries.append(LeaderboardEntry(
            rank=rank,
            name=user.name,
            xp=user.xp,
            streak_days=user.streak_days,
            level=level_info.level,
            level_title=level_info.title,
        ))

    # Cache for 5 minutes
    await redis.setex(cache_key, 300, json.dumps([e.model_dump() for e in entries]))
    return entries


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick stats for gamification dashboard widget."""
    # Accuracy
    total_result = await db.execute(
        select(func.count(Attempt.id)).where(Attempt.user_id == current_user.id)
    )
    correct_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id, Attempt.correct == True
        )
    )
    total = total_result.scalar() or 0
    correct = correct_result.scalar() or 0
    accuracy = correct / total if total > 0 else 0.0

    level_info = engine.get_level(current_user.xp)
    streak_warning = engine.streak_decay_warning(
        current_user.last_active.date() if current_user.last_active else None
    )

    return {
        "xp": current_user.xp,
        "level": level_info.level,
        "level_title": level_info.title,
        "level_progress_pct": level_info.progress_pct,
        "xp_to_next_level": level_info.xp_for_next,
        "streak_days": current_user.streak_days,
        "streak_warning": streak_warning,
        "total_attempts": total,
        "accuracy": round(accuracy, 3),
        "leaderboard_score": round(
            engine.leaderboard_score(current_user.xp, current_user.streak_days, accuracy), 1
        ),
    }
