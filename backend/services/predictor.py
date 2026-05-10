from __future__ import annotations

from backend.models.schemas import Attempt, DashboardSummary, Mastery, Question, Topic
from backend.services.recommender import build_recommendations
from backend.services.skm import calculate_mastery
from backend.services.spaced_rep import build_revision_queue


def predict_score(mastery: list[Mastery]) -> int:
    if not mastery:
        return 0
    average = sum(item.mastery for item in mastery) / len(mastery)
    consistency = sum(1 for item in mastery if item.risk == "low") / len(mastery)
    return round((average * 78) + (consistency * 22))


def build_dashboard(student_id: str, topics: list[Topic], questions: list[Question], attempts: list[Attempt]) -> DashboardSummary:
    mastery = calculate_mastery(topics, attempts)
    score = predict_score(mastery)
    return DashboardSummary(
        student_id=student_id,
        readiness=round(score / 100, 2),
        predicted_score=score,
        total_attempts=len(attempts),
        streak_days=min(7, len({attempt.created_at.date() for attempt in attempts})),
        mastery=mastery,
        recommendations=build_recommendations(mastery),
        revision_queue=build_revision_queue(mastery, attempts),
    )
