from backend.db import QUESTIONS, TOPICS, initial_attempts
from backend.services.predictor import build_dashboard
from backend.services.recommender import choose_next_question
from backend.services.skm import calculate_mastery


def test_dashboard_contains_predictions_and_recommendations():
    dashboard = build_dashboard("demo-student", TOPICS, QUESTIONS, initial_attempts())

    assert dashboard.predicted_score > 0
    assert len(dashboard.mastery) == len(TOPICS)
    assert len(dashboard.recommendations) == 3


def test_next_question_targets_weak_topic():
    attempts = initial_attempts()
    mastery = calculate_mastery(TOPICS, attempts)
    question = choose_next_question(QUESTIONS, mastery, TOPICS, attempts)

    assert question.topic_id in {item.topic_id for item in mastery}
    assert question.choices
