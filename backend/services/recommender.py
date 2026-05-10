from __future__ import annotations

from ai.recommendation.engine import choose_adaptive_question, recommend_topics
from backend.models.schemas import Attempt, Mastery, Question, QuizQuestion, Recommendation, Topic


def choose_next_question(
    questions: list[Question],
    mastery: list[Mastery],
    topics: list[Topic],
    attempts: list[Attempt],
) -> QuizQuestion:
    return choose_adaptive_question(questions, mastery, topics, attempts)


def build_recommendations(mastery: list[Mastery]) -> list[Recommendation]:
    return recommend_topics(mastery)
