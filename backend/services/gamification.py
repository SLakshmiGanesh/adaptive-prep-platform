"""
services/gamification.py — XP, Streaks, Badges, Leaderboard

Gamification layer to drive engagement and habit formation.
All rewards are deterministic (no randomness) so students trust the system.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional


# ── XP Constants ─────────────────────────────────────────────────────────────

XP_TABLE = {
    "quiz_correct":         10,
    "quiz_correct_fast":    15,   # answered in < 30s
    "quiz_confident_right": 20,   # confidence 4-5 and correct
    "quiz_wrong":            2,   # participation points
    "session_complete":      5,   # per 5 minutes of study
    "streak_bonus_7":      100,   # 7-day streak milestone
    "streak_bonus_30":     500,   # 30-day streak milestone
    "mastery_milestone":   200,   # topic reaches 80% mastery
    "daily_plan_done":     150,   # completed all daily plan items
    "first_quiz":           50,   # onboarding reward
}

# ── Level thresholds ──────────────────────────────────────────────────────────

LEVELS = [
    (0,     "Novice"),
    (500,   "Apprentice"),
    (1500,  "Scholar"),
    (3500,  "Achiever"),
    (7000,  "Expert"),
    (12000, "Master"),
    (20000, "Grandmaster"),
]

# ── Badge definitions ─────────────────────────────────────────────────────────

BADGES = {
    "first_blood":     {"name": "First Blood",       "desc": "Complete your first quiz",         "icon": "🎯"},
    "streak_7":        {"name": "Week Warrior",       "desc": "7-day study streak",               "icon": "🔥"},
    "streak_30":       {"name": "Iron Will",          "desc": "30-day study streak",              "icon": "⚡"},
    "speed_demon":     {"name": "Speed Demon",        "desc": "Answer 10 questions in < 20s each","icon": "⚡"},
    "perfectionist":   {"name": "Perfectionist",      "desc": "10 correct answers in a row",      "icon": "💎"},
    "topic_master":    {"name": "Topic Master",       "desc": "Reach 80% mastery on any topic",   "icon": "🏆"},
    "all_rounder":     {"name": "All-Rounder",        "desc": "Study all 3 subjects in one day",  "icon": "🌟"},
    "night_owl":       {"name": "Night Owl",          "desc": "Study after 10 PM",                "icon": "🦉"},
    "early_bird":      {"name": "Early Bird",         "desc": "Study before 6 AM",                "icon": "🌅"},
    "completionist":   {"name": "Completionist",      "desc": "Complete daily plan 7 days in a row","icon": "✅"},
}


@dataclass
class XPEvent:
    event_type: str
    xp: int
    description: str
    timestamp: datetime


@dataclass
class LevelInfo:
    level: int
    title: str
    current_xp: int
    xp_for_next: int
    xp_in_level: int
    progress_pct: float


@dataclass
class StreakInfo:
    current_streak: int
    longest_streak: int
    last_active: Optional[date]
    is_at_risk: bool    # if no activity today, streak breaks tomorrow


class GamificationEngine:

    def calculate_xp(
        self,
        event: str,
        metadata: Optional[dict] = None,
    ) -> XPEvent:
        """Calculate XP for a given event with any multipliers."""
        base_xp = XP_TABLE.get(event, 0)
        metadata = metadata or {}

        # Streak multiplier (up to 2x for 30+ day streak)
        streak = metadata.get("streak_days", 0)
        streak_multiplier = min(2.0, 1.0 + (streak / 60))

        # Difficulty multiplier for quiz events
        difficulty = metadata.get("difficulty", 0.5)
        diff_multiplier = 0.5 + difficulty  # 0.5x for easy, 1.5x for hard

        if "quiz" in event:
            final_xp = int(base_xp * streak_multiplier * diff_multiplier)
        else:
            final_xp = int(base_xp * streak_multiplier)

        return XPEvent(
            event_type=event,
            xp=final_xp,
            description=self._xp_description(event, final_xp),
            timestamp=datetime.now(timezone.utc),
        )

    def _xp_description(self, event: str, xp: int) -> str:
        descriptions = {
            "quiz_correct": f"+{xp} XP — correct answer",
            "quiz_correct_fast": f"+{xp} XP — fast correct answer!",
            "quiz_confident_right": f"+{xp} XP — confident & correct!",
            "quiz_wrong": f"+{xp} XP — keep going",
            "session_complete": f"+{xp} XP — study session logged",
            "streak_bonus_7": f"+{xp} XP — 7-day streak! 🔥",
            "streak_bonus_30": f"+{xp} XP — 30-day streak! 🏆",
            "mastery_milestone": f"+{xp} XP — topic mastered! 💎",
            "daily_plan_done": f"+{xp} XP — daily plan complete! ✅",
        }
        return descriptions.get(event, f"+{xp} XP")

    def get_level(self, total_xp: int) -> LevelInfo:
        """Calculate level, title, and progress from total XP."""
        level = 0
        title = LEVELS[0][1]

        for i, (threshold, lvl_title) in enumerate(LEVELS):
            if total_xp >= threshold:
                level = i
                title = lvl_title

        current_threshold = LEVELS[level][0]
        next_threshold = LEVELS[min(level + 1, len(LEVELS) - 1)][0]

        if level == len(LEVELS) - 1:
            # Max level
            xp_in_level = total_xp - current_threshold
            xp_for_next = 0
            progress_pct = 100.0
        else:
            xp_in_level = total_xp - current_threshold
            xp_for_next = next_threshold - current_threshold
            progress_pct = (xp_in_level / xp_for_next) * 100

        return LevelInfo(
            level=level + 1,
            title=title,
            current_xp=total_xp,
            xp_for_next=xp_for_next,
            xp_in_level=xp_in_level,
            progress_pct=round(progress_pct, 1),
        )

    def check_streak(
        self,
        last_active: Optional[date],
        current_streak: int,
        longest_streak: int,
        today: Optional[date] = None,
    ) -> tuple[int, int, bool]:
        """
        Update streak based on last active date.
        Returns (new_streak, new_longest, streak_broken).
        """
        today = today or date.today()

        if last_active is None:
            return 1, max(1, longest_streak), False

        days_since = (today - last_active).days

        if days_since == 0:
            # Already active today, streak unchanged
            return current_streak, longest_streak, False
        elif days_since == 1:
            # Consecutive day — extend streak
            new_streak = current_streak + 1
            return new_streak, max(new_streak, longest_streak), False
        else:
            # Streak broken
            return 1, longest_streak, True

    def check_badge_eligibility(
        self,
        event: str,
        metadata: dict,
        earned_badges: list[str],
    ) -> list[str]:
        """
        Check which new badges the student has earned.
        Returns list of newly earned badge IDs.
        """
        new_badges = []

        def award(badge_id: str):
            if badge_id not in earned_badges:
                new_badges.append(badge_id)

        if event == "first_quiz" and "first_blood" not in earned_badges:
            award("first_blood")

        if event == "streak_bonus_7":
            award("streak_7")

        if event == "streak_bonus_30":
            award("streak_30")

        if event == "quiz_correct_fast" and metadata.get("fast_streak", 0) >= 10:
            award("speed_demon")

        if event == "quiz_correct" and metadata.get("correct_streak", 0) >= 10:
            award("perfectionist")

        if event == "mastery_milestone":
            award("topic_master")

        if event == "session_complete":
            subjects_today = metadata.get("subjects_today", [])
            if len(set(subjects_today)) >= 3:
                award("all_rounder")

        if event == "session_complete":
            hour = datetime.now(timezone.utc).hour
            if hour >= 22 or hour < 2:
                award("night_owl")
            elif hour < 6:
                award("early_bird")

        return new_badges

    def streak_decay_warning(self, last_active: Optional[date]) -> Optional[str]:
        """
        Return a warning message if streak is at risk.
        Call this when loading dashboard.
        """
        if last_active is None:
            return None
        today = date.today()
        if (today - last_active).days == 1:
            return "⚠️ Study today to keep your streak alive!"
        if (today - last_active).days > 1:
            return "Your streak was lost. Start a new one today!"
        return None

    def leaderboard_score(self, xp: int, streak: int, accuracy: float) -> float:
        """
        Composite leaderboard score combining XP, streak, and accuracy.
        Prevents pure XP farming — quality matters too.
        """
        return xp * 0.6 + streak * 10 * 0.2 + accuracy * 1000 * 0.2
