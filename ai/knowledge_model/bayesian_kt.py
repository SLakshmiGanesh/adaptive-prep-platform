from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class AttemptLike(Protocol):
    correct: bool
    response_time_seconds: int


@dataclass(frozen=True)
class MasteryEstimate:
    mastery: float
    accuracy: float


def estimate_topic_mastery(attempts: list[AttemptLike]) -> MasteryEstimate:
    """Small Bayesian Knowledge Tracing inspired update for the MVP."""
    if not attempts:
        return MasteryEstimate(mastery=0.35, accuracy=0.0)

    probability_known = 0.35
    slip = 0.12
    guess = 0.22
    learn = 0.08

    for attempt in attempts:
        if attempt.correct:
            numerator = probability_known * (1 - slip)
            denominator = numerator + ((1 - probability_known) * guess)
        else:
            numerator = probability_known * slip
            denominator = numerator + ((1 - probability_known) * (1 - guess))

        posterior = numerator / denominator
        probability_known = posterior + ((1 - posterior) * learn)

    correct_count = sum(1 for attempt in attempts if attempt.correct)
    accuracy = correct_count / len(attempts)
    speed_penalty = 0.08 if sum(attempt.response_time_seconds for attempt in attempts) / len(attempts) > 75 else 0.0
    mastery = max(0.05, min(0.98, probability_known - speed_penalty))
    return MasteryEstimate(mastery=round(mastery, 2), accuracy=round(accuracy, 2))
