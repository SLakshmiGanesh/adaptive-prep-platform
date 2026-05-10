from __future__ import annotations

from typing import Protocol


class QuestionLike(Protocol):
    id: str
    topic_id: str
    prompt: str
    choices: list[str]
    difficulty: object


class TopicLike(Protocol):
    id: str
    name: str


class AttemptLike(Protocol):
    question_id: str


class MasteryLike(Protocol):
    topic_id: str
    topic_name: str
    mastery: float
    attempts: int
    risk: str


DIFFICULTY_WEIGHT = {
    "easy": 0.85,
    "medium": 1.0,
    "hard": 1.15,
}


def choose_adaptive_question(questions, mastery, topics, attempts):
    from backend.models.schemas import QuizQuestion

    answered_ids = {attempt.question_id for attempt in attempts}
    mastery_by_topic = {item.topic_id: item for item in mastery}
    topic_by_id = {topic.id: topic for topic in topics}
    selected = sorted(
        questions,
        key=lambda question: (
            mastery_by_topic[question.topic_id].mastery,
            question.id in answered_ids,
            DIFFICULTY_WEIGHT[getattr(question.difficulty, "value", str(question.difficulty))],
        ),
    )[0]
    topic = topic_by_id[selected.topic_id]
    return QuizQuestion(
        question_id=selected.id,
        topic_id=selected.topic_id,
        topic_name=topic.name,
        prompt=selected.prompt,
        choices=selected.choices,
        difficulty=selected.difficulty,
    )


def recommend_topics(mastery):
    from backend.models.schemas import Recommendation

    recommendations = []
    for item in sorted(mastery, key=lambda row: row.mastery)[:3]:
        if item.risk == "high":
            activity = "Practice 3 fundamentals and ask tutor for one worked example"
            priority = "high"
        elif item.risk == "medium":
            activity = "Solve 2 timed questions and review mistakes"
            priority = "medium"
        else:
            activity = "Attempt one mixed revision question"
            priority = "low"
        recommendations.append(
            Recommendation(
                topic_id=item.topic_id,
                topic_name=item.topic_name,
                reason=f"Current mastery is {int(item.mastery * 100)}% with {item.attempts} attempts.",
                priority=priority,
                suggested_activity=activity,
            )
        )
    return recommendations
