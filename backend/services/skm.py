from __future__ import annotations

from collections import defaultdict

from backend.models.schemas import Attempt, Mastery, Topic
from ai.knowledge_model.bayesian_kt import estimate_topic_mastery


def calculate_mastery(topics: list[Topic], attempts: list[Attempt]) -> list[Mastery]:
    attempts_by_topic: dict[str, list[Attempt]] = defaultdict(list)
    for attempt in attempts:
        attempts_by_topic[attempt.topic_id].append(attempt)

    mastery: list[Mastery] = []
    for topic in topics:
        topic_attempts = attempts_by_topic[topic.id]
        estimate = estimate_topic_mastery(topic_attempts)
        mastery.append(
            Mastery(
                topic_id=topic.id,
                topic_name=topic.name,
                subject=topic.subject,
                mastery=estimate.mastery,
                attempts=len(topic_attempts),
                accuracy=estimate.accuracy,
                risk=_risk_label(estimate.mastery, topic.target_mastery),
            )
        )
    return mastery


def _risk_label(mastery: float, target: float) -> str:
    if mastery < target - 0.22:
        return "high"
    if mastery < target - 0.08:
        return "medium"
    return "low"
