from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.models.schemas import Attempt, Difficulty, Question, Topic


TOPICS: list[Topic] = [
    Topic(id="algebra", name="Algebra", subject="Mathematics", target_mastery=0.82),
    Topic(id="calculus", name="Calculus", subject="Mathematics", target_mastery=0.78),
    Topic(id="mechanics", name="Mechanics", subject="Physics", target_mastery=0.8),
    Topic(id="electrostatics", name="Electrostatics", subject="Physics", target_mastery=0.76),
    Topic(id="organic", name="Organic Chemistry", subject="Chemistry", target_mastery=0.74),
    Topic(id="equilibrium", name="Chemical Equilibrium", subject="Chemistry", target_mastery=0.77),
]


QUESTIONS: list[Question] = [
    Question(
        id="q-alg-1",
        topic_id="algebra",
        prompt="If 2x + 7 = 19, what is x?",
        choices=["4", "5", "6", "7"],
        answer_index=2,
        explanation="Subtract 7 from both sides to get 2x = 12, then divide by 2.",
        difficulty=Difficulty.easy,
    ),
    Question(
        id="q-alg-2",
        topic_id="algebra",
        prompt="The roots of x^2 - 5x + 6 are:",
        choices=["1 and 6", "2 and 3", "-2 and -3", "3 and 5"],
        answer_index=1,
        explanation="Factor the quadratic as (x - 2)(x - 3).",
        difficulty=Difficulty.medium,
    ),
    Question(
        id="q-cal-1",
        topic_id="calculus",
        prompt="What is the derivative of x^3?",
        choices=["x^2", "2x", "3x^2", "3x"],
        answer_index=2,
        explanation="Apply the power rule: d/dx x^n = n x^(n-1).",
        difficulty=Difficulty.easy,
    ),
    Question(
        id="q-cal-2",
        topic_id="calculus",
        prompt="The integral of 2x from 0 to 3 is:",
        choices=["3", "6", "9", "12"],
        answer_index=2,
        explanation="Integral of 2x is x^2. Evaluate 3^2 - 0^2 = 9.",
        difficulty=Difficulty.medium,
    ),
    Question(
        id="q-mech-1",
        topic_id="mechanics",
        prompt="A body starts from rest with acceleration 2 m/s^2. Speed after 5 s is:",
        choices=["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
        answer_index=1,
        explanation="Use v = u + at. Here u = 0, a = 2, t = 5, so v = 10 m/s.",
        difficulty=Difficulty.easy,
    ),
    Question(
        id="q-elec-1",
        topic_id="electrostatics",
        prompt="Coulomb's force between two charges varies with distance r as:",
        choices=["r", "r^2", "1/r", "1/r^2"],
        answer_index=3,
        explanation="Coulomb's law states F is proportional to 1/r^2.",
        difficulty=Difficulty.easy,
    ),
    Question(
        id="q-org-1",
        topic_id="organic",
        prompt="Which reagent converts an alcohol to an aldehyde under mild oxidation?",
        choices=["PCC", "NaBH4", "H2/Pd", "Conc. HCl"],
        answer_index=0,
        explanation="PCC oxidizes primary alcohols to aldehydes without over-oxidation.",
        difficulty=Difficulty.medium,
    ),
    Question(
        id="q-eq-1",
        topic_id="equilibrium",
        prompt="For an exothermic reaction, increasing temperature shifts equilibrium:",
        choices=["Towards products", "Towards reactants", "No change", "Stops reaction"],
        answer_index=1,
        explanation="Heat acts like a product in exothermic reactions, so added heat shifts left.",
        difficulty=Difficulty.medium,
    ),
]


def initial_attempts() -> list[Attempt]:
    now = datetime.now(timezone.utc)
    rows = [
        ("q-alg-1", "algebra", 2, True, 24, 1),
        ("q-alg-2", "algebra", 0, False, 70, 2),
        ("q-cal-1", "calculus", 2, True, 35, 1),
        ("q-cal-2", "calculus", 1, False, 90, 3),
        ("q-mech-1", "mechanics", 1, True, 28, 1),
        ("q-elec-1", "electrostatics", 2, False, 55, 4),
        ("q-org-1", "organic", 0, True, 64, 2),
        ("q-eq-1", "equilibrium", 1, True, 51, 5),
    ]
    return [
        Attempt(
            question_id=question_id,
            topic_id=topic_id,
            selected_index=selected_index,
            correct=correct,
            response_time_seconds=response_time,
            created_at=now - timedelta(days=days_ago),
        )
        for question_id, topic_id, selected_index, correct, response_time, days_ago in rows
    ]


class LearningRepository:
    def __init__(self) -> None:
        self.topics = {topic.id: topic for topic in TOPICS}
        self.questions = {question.id: question for question in QUESTIONS}
        self.attempts_by_student = {"demo-student": initial_attempts()}

    def list_topics(self) -> list[Topic]:
        return list(self.topics.values())

    def list_questions(self) -> list[Question]:
        return list(self.questions.values())

    def get_question(self, question_id: str) -> Question:
        return self.questions[question_id]

    def get_topic(self, topic_id: str) -> Topic:
        return self.topics[topic_id]

    def list_attempts(self, student_id: str) -> list[Attempt]:
        return self.attempts_by_student.setdefault(student_id, [])

    def add_attempt(self, student_id: str, question: Question, selected_index: int, response_time_seconds: int) -> Attempt:
        attempt = Attempt(
            question_id=question.id,
            topic_id=question.topic_id,
            selected_index=selected_index,
            correct=selected_index == question.answer_index,
            response_time_seconds=response_time_seconds,
            created_at=datetime.now(timezone.utc),
        )
        self.list_attempts(student_id).append(attempt)
        return attempt


repo = LearningRepository()
