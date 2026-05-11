"""
services/recommender.py — Adaptive Study Plan Generator

Priority scoring formula:
  priority = urgency × gap × weight × recency_penalty

  urgency:        1.5 if revision due today/overdue, 1.0 otherwise
  gap:            (1.0 - mastery) — higher gap = higher priority
  weight:         topic importance in exam (0.5–2.0)
  recency_penalty: reduces priority if studied recently (avoid burnout)

The planner allocates study time greedily from highest priority down,
capping per-topic allocation to avoid 3-hour single-topic sessions.
"""

from datetime import date, timedelta
from typing import TypedDict


class TopicData(TypedDict):
    id: str
    name: str
    subject: str
    weight: float       # exam importance (0.5–2.0)
    mastery: float      # current BKT mastery (0–1)
    revision_due: bool  # spaced rep due today
    last_studied: date | None  # most recent session date


class PlanItem(TypedDict):
    id: str
    name: str
    subject: str
    duration_min: int
    priority: float
    mastery: float
    revision_due: bool


class StudyPlanner:

    MAX_TOPIC_MINUTES = 60   # cap per topic per session
    MIN_TOPIC_MINUTES = 15   # don't allocate tiny slices
    REVISION_URGENCY  = 1.5
    NORMAL_URGENCY    = 1.0

    def _priority_score(self, topic: TopicData) -> float:
        """Compute priority score for a topic."""
        urgency = self.REVISION_URGENCY if topic["revision_due"] else self.NORMAL_URGENCY

        # Knowledge gap: students want to close gaps, not drill mastered topics
        gap = 1.0 - topic["mastery"]

        # Recency penalty: de-prioritize topics studied in last 2 days
        recency_penalty = 1.0
        if topic.get("last_studied"):
            days_since = (date.today() - topic["last_studied"]).days
            if days_since < 2:
                recency_penalty = 0.4
            elif days_since < 4:
                recency_penalty = 0.7

        return urgency * gap * topic["weight"] * recency_penalty

    def build_plan(
        self,
        topics: list[TopicData],
        hours_available: float = 4.0,
    ) -> list[PlanItem]:
        """
        Build an optimized daily study plan.

        Args:
            topics:           All topics with mastery + metadata
            hours_available:  Study budget in hours

        Returns:
            Ordered list of study items to complete today
        """
        budget_min = int(hours_available * 60)

        # Score and sort
        scored = sorted(
            [{"topic": t, "score": self._priority_score(t)} for t in topics],
            key=lambda x: x["score"],
            reverse=True,
        )

        plan: list[PlanItem] = []
        remaining = budget_min

        for entry in scored:
            if remaining < self.MIN_TOPIC_MINUTES:
                break

            topic = entry["topic"]
            score = entry["score"]

            # Skip fully mastered topics unless revision is due
            if topic["mastery"] > 0.90 and not topic["revision_due"]:
                continue

            # Allocate time proportional to gap, capped
            base_alloc = int(45 * (1.0 - topic["mastery"]))
            base_alloc = max(self.MIN_TOPIC_MINUTES, base_alloc)
            alloc = min(self.MAX_TOPIC_MINUTES, base_alloc, remaining)

            # Round to nearest 5 minutes
            alloc = (alloc // 5) * 5
            if alloc < self.MIN_TOPIC_MINUTES:
                continue

            plan.append(PlanItem(
                id=topic["id"],
                name=topic["name"],
                subject=topic["subject"],
                duration_min=alloc,
                priority=round(score, 4),
                mastery=topic["mastery"],
                revision_due=topic["revision_due"],
            ))
            remaining -= alloc

        return plan

    def explain_priority(self, topic: TopicData) -> str:
        """Human-readable reason for priority ranking."""
        reasons = []
        if topic["revision_due"]:
            reasons.append("revision overdue")
        if topic["mastery"] < 0.3:
            reasons.append("low mastery")
        elif topic["mastery"] < 0.6:
            reasons.append("developing mastery")
        if topic["weight"] > 1.5:
            reasons.append("high exam weightage")
        return " · ".join(reasons) if reasons else "standard priority"
