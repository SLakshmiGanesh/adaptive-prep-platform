"""
ai/assessment/irt.py — Item Response Theory (IRT) Question Selection

Uses the 2-Parameter Logistic (2PL) model:

  P(correct | θ, a, b) = 1 / (1 + e^(-a(θ - b)))

  θ (theta):  Student ability (-3 to +3)
  a:          Discrimination parameter (how well question separates students)
  b:          Difficulty parameter (ability needed for 50% success)

Question Selection Strategy: Maximum Fisher Information
  I(θ) = a² × P(θ) × (1 - P(θ))

  The question with max information at the student's ability level
  gives the most precise estimate of their knowledge.
"""

import math
from typing import TypedDict


class QuestionCandidate(TypedDict):
    id: str
    difficulty: float       # normalized (0–1), mapped to IRT b
    discrimination: float   # IRT a parameter
    text: str
    options: list[dict]
    topic_name: str


def mastery_to_theta(mastery: float) -> float:
    """
    Map mastery (0–1) to IRT ability scale (-3 to +3).
    Uses logit transform, clamped to [-3, 3].
    """
    p = max(0.01, min(0.99, mastery))
    return max(-3.0, min(3.0, math.log(p / (1.0 - p))))


def difficulty_to_b(difficulty: float) -> float:
    """
    Map normalized difficulty (0–1) to IRT b parameter (-3 to +3).
    0.5 difficulty → b=0 (average), 0.9 → b=2.2 (hard)
    """
    p = max(0.01, min(0.99, difficulty))
    return max(-3.0, min(3.0, math.log(p / (1.0 - p))))


def p_correct(theta: float, a: float, b: float) -> float:
    """2PL probability of correct response."""
    return 1.0 / (1.0 + math.exp(-a * (theta - b)))


def fisher_information(theta: float, a: float, b: float) -> float:
    """Fisher information at ability level θ for item (a, b)."""
    p = p_correct(theta, a, b)
    return a ** 2 * p * (1.0 - p)


def select_question_irt(
    ability: float,             # mastery score (0–1)
    candidates: list[QuestionCandidate],
) -> QuestionCandidate:
    """
    Select the question that provides maximum information
    at the student's current ability level.

    Falls back to random if no candidates (shouldn't happen).
    """
    if not candidates:
        raise ValueError("No candidate questions")

    theta = mastery_to_theta(ability)

    best_question = None
    best_info = -1.0

    for q in candidates:
        b = difficulty_to_b(q["difficulty"])
        a = q.get("discrimination", 1.0)
        info = fisher_information(theta, a, b)

        if info > best_info:
            best_info = info
            best_question = q

    return best_question


def expected_score(theta: float, questions: list[QuestionCandidate]) -> float:
    """
    Predict the student's expected score on a set of questions.
    Useful for test-level score prediction.
    """
    if not questions:
        return 0.0
    total = sum(
        p_correct(theta, q.get("discrimination", 1.0), difficulty_to_b(q["difficulty"]))
        for q in questions
    )
    return total / len(questions)


def ability_estimate_from_responses(
    responses: list[tuple[float, float, bool]],  # (difficulty, discrimination, correct)
    n_iterations: int = 20,
) -> float:
    """
    Maximum Likelihood Estimation of student ability from response pattern.
    Uses Newton-Raphson iteration.

    Returns ability estimate in (-3, 3) range.
    """
    theta = 0.0  # start at average ability

    for _ in range(n_iterations):
        gradient = 0.0
        hessian  = 0.0

        for difficulty, discrimination, correct in responses:
            b = difficulty_to_b(difficulty)
            a = discrimination
            p = p_correct(theta, a, b)
            q = 1.0 - p

            if correct:
                gradient += a * q
            else:
                gradient -= a * p

            hessian -= a ** 2 * p * q

        if abs(hessian) < 1e-8:
            break

        step = gradient / hessian
        theta -= step

        if abs(step) < 1e-4:
            break

    return max(-3.0, min(3.0, theta))
