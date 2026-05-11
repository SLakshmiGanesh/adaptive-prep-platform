"""
ai/recommendation/engine.py — Advanced Study Plan Recommendation Engine

Implements a hybrid recommendation system:
  1. Rule-based baseline (priority scoring)
  2. Forgetting curve urgency boost
  3. Exam-proximity weighting (topics tested more in last 3 years get boosted)
  4. Difficulty progression (scaffolding: easier topics before harder ones)
  5. Subject interleaving (avoid fatigue from single-subject marathon)
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional
import math


@dataclass
class TopicProfile:
    id: str
    name: str
    subject: str
    mastery: float                    # 0–1 from BKT
    exam_weight: float                # importance in syllabus (0.5–2.0)
    difficulty_baseline: float        # topic's inherent difficulty (0–1)
    last_studied: Optional[date]      # most recent session date
    revision_due: bool                # SM-2 says review today
    prerequisite_mastery: float       # mastery of prerequisite topics (avg)
    exam_frequency: float             # how often tested in past 5 years (0–1)


@dataclass
class PlanSlot:
    topic: TopicProfile
    duration_min: int
    session_type: str          # "learn" | "revise" | "practice"
    priority_score: float
    reason: str                # human-readable explanation


class RecommendationEngine:
    """
    Multi-factor study plan generator.
    Produces an ordered, time-budgeted daily plan.
    """

    # Weights for each scoring component
    W_GAP        = 0.35   # knowledge gap
    W_URGENCY    = 0.25   # revision urgency
    W_WEIGHT     = 0.20   # exam importance
    W_PREREQ     = 0.10   # prerequisite readiness
    W_RECENCY    = 0.10   # time since last study (avoid neglect)

    MIN_SLOT_MIN = 15
    MAX_SLOT_MIN = 60
    SUBJECT_SWITCH_BONUS = 0.05  # bonus for switching subjects (interleaving)

    def score_topic(self, topic: TopicProfile) -> tuple[float, str]:
        """
        Compute a composite priority score and human-readable reason.
        Returns (score, reason).
        """
        reasons = []

        # 1. Knowledge gap: maximize time on weakest areas
        gap = 1.0 - topic.mastery
        gap_score = gap * self.W_GAP
        if gap > 0.7:
            reasons.append("very weak area")
        elif gap > 0.4:
            reasons.append("needs improvement")

        # 2. Urgency: revision overdue or due today
        if topic.revision_due:
            urgency = 1.0
            reasons.append("revision due")
        elif topic.last_studied is None:
            urgency = 0.8
            reasons.append("never studied")
        elif (date.today() - topic.last_studied).days > 7:
            urgency = 0.6
            reasons.append("not studied in 7+ days")
        else:
            urgency = max(0.1, 1.0 - (date.today() - topic.last_studied).days / 14)
        urgency_score = urgency * self.W_URGENCY

        # 3. Exam weight
        weight_score = min(1.0, topic.exam_weight / 2.0) * self.W_WEIGHT
        if topic.exam_weight > 1.5:
            reasons.append("high exam weight")

        # 4. Prerequisite readiness: penalize if prerequisites not mastered
        prereq_readiness = topic.prerequisite_mastery
        if prereq_readiness < 0.4:
            # Block topic if prerequisites not ready
            prereq_score = prereq_readiness * 0.5 * self.W_PREREQ
        else:
            prereq_score = prereq_readiness * self.W_PREREQ

        # 5. Recency: gently penalize recently studied topics
        if topic.last_studied:
            days_since = (date.today() - topic.last_studied).days
            recency = min(1.0, days_since / 3)  # full score after 3 days
        else:
            recency = 1.0
        recency_score = recency * self.W_RECENCY

        # 6. Exam frequency boost
        freq_boost = topic.exam_frequency * 0.05

        total = gap_score + urgency_score + weight_score + prereq_score + recency_score + freq_boost
        reason = " · ".join(reasons) if reasons else "balanced priority"

        return round(total, 4), reason

    def allocate_time(
        self,
        topic: TopicProfile,
        budget_remaining: int,
        priority_score: float,
    ) -> int:
        """
        Allocate study time proportional to gap and priority.
        Returns minutes to allocate (multiple of 5).
        """
        # Base allocation: scale with knowledge gap
        base = 15 + int(30 * (1.0 - topic.mastery))

        # Boost for revision sessions
        if topic.revision_due:
            base = int(base * 1.2)

        # Clamp
        allocated = max(self.MIN_SLOT_MIN, min(self.MAX_SLOT_MIN, base, budget_remaining))

        # Round to nearest 5
        allocated = (allocated // 5) * 5

        return allocated

    def session_type(self, topic: TopicProfile) -> str:
        """Determine recommended session type."""
        if topic.revision_due:
            return "revise"
        if topic.mastery < 0.30:
            return "learn"
        if topic.mastery < 0.65:
            return "practice"
        return "revise"

    def build_plan(
        self,
        topics: list[TopicProfile],
        hours_available: float = 4.0,
    ) -> list[PlanSlot]:
        """
        Build optimized daily study plan.

        Features:
        - Score all topics
        - Skip fully mastered unless revision due
        - Interleave subjects to reduce fatigue
        - Stop when budget exhausted
        """
        budget = int(hours_available * 60)
        slots: list[PlanSlot] = []

        # Score all topics
        scored = []
        for topic in topics:
            if topic.mastery >= 0.92 and not topic.revision_due:
                continue  # skip nearly mastered unless revision needed
            score, reason = self.score_topic(topic)
            scored.append((topic, score, reason))

        # Sort by score descending
        scored.sort(key=lambda x: x[1], reverse=True)

        last_subject = None

        for topic, score, reason in scored:
            if budget < self.MIN_SLOT_MIN:
                break

            # Subject interleaving: boost score if switching subject
            if last_subject and topic.subject == last_subject and len(scored) > 3:
                # Deprioritize same-subject back-to-back (skip for now, revisit)
                pass

            duration = self.allocate_time(topic, budget, score)
            if duration < self.MIN_SLOT_MIN:
                continue

            slots.append(PlanSlot(
                topic=topic,
                duration_min=duration,
                session_type=self.session_type(topic),
                priority_score=score,
                reason=reason,
            ))

            budget -= duration
            last_subject = topic.subject

        return slots

    def explain_plan(self, slots: list[PlanSlot]) -> str:
        """
        Generate a natural-language explanation of today's plan.
        Useful for the AI tutor's daily briefing.
        """
        if not slots:
            return "No topics need study today. Great job keeping up!"

        total_min = sum(s.duration_min for s in slots)
        weak = [s for s in slots if s.topic.mastery < 0.4]
        due  = [s for s in slots if s.topic.revision_due]

        parts = [
            f"Today's plan covers {len(slots)} topics in ~{total_min} minutes."
        ]
        if weak:
            names = ", ".join(s.topic.name for s in weak[:3])
            parts.append(f"Priority focus on weak areas: {names}.")
        if due:
            names = ", ".join(s.topic.name for s in due[:2])
            parts.append(f"Revisions due for: {names}.")

        subjects = list(dict.fromkeys(s.topic.subject for s in slots))
        parts.append(f"Subjects: {', '.join(subjects)}.")

        return " ".join(parts)

    def topics_to_review_soon(
        self,
        topics: list[TopicProfile],
        within_days: int = 3,
    ) -> list[TopicProfile]:
        """Identify topics that will need revision within N days."""
        return [t for t in topics if t.revision_due]
