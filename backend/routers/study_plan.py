from __future__ import annotations

from fastapi import APIRouter

from backend.db import repo
from backend.models.schemas import DashboardSummary, Recommendation, RevisionItem
from backend.services.predictor import build_dashboard
from backend.services.recommender import build_recommendations
from backend.services.skm import calculate_mastery
from backend.services.spaced_rep import build_revision_queue


router = APIRouter()


@router.get("/{student_id}/dashboard", response_model=DashboardSummary)
def dashboard(student_id: str) -> DashboardSummary:
    return build_dashboard(student_id, repo.list_topics(), repo.list_questions(), repo.list_attempts(student_id))


@router.get("/{student_id}/recommendations", response_model=list[Recommendation])
def recommendations(student_id: str) -> list[Recommendation]:
    mastery = calculate_mastery(repo.list_topics(), repo.list_attempts(student_id))
    return build_recommendations(mastery)


@router.get("/{student_id}/revision", response_model=list[RevisionItem])
def revision(student_id: str) -> list[RevisionItem]:
    mastery = calculate_mastery(repo.list_topics(), repo.list_attempts(student_id))
    return build_revision_queue(mastery, repo.list_attempts(student_id))
