"""
services/spaced_rep.py — Spaced Repetition using SM-2 algorithm

SM-2 (SuperMemo 2) is the algorithm behind Anki and most modern flashcard apps.
It schedules reviews at exponentially increasing intervals based on recall quality.

Quality scale:
  5 — Perfect recall, no hesitation
  4 — Correct with slight hesitation
  3 — Correct, required significant effort
  2 — Incorrect, but the correct answer was easy to recall
  1 — Incorrect, serious difficulty
  0 — Complete blackout

Only quality >= 3 advances the interval. Below 3 resets to day 1.
"""

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class ReviewState:
    interval: int     # days until next review
    ease_factor: float  # multiplier (starts at 2.5)
    repetitions: int    # successful review streak


class SpacedRepetition:

    MIN_EASE = 1.3
    INITIAL_EASE = 2.5

    def next_review(self, state: ReviewState, quality: int) -> ReviewState:
        """
        Compute next review state from current state and recall quality.

        Args:
            state:    Current ReviewState
            quality:  Recall quality 0–5

        Returns:
            New ReviewState with updated interval and ease factor
        """
        quality = max(0, min(5, quality))

        # Failed recall: reset to beginning
        if quality < 3:
            new_interval = 1
            new_repetitions = 0
            # Penalize ease factor
            new_ef = max(self.MIN_EASE, state.ease_factor - 0.2)
            return ReviewState(
                interval=new_interval,
                ease_factor=new_ef,
                repetitions=new_repetitions,
            )

        # Successful recall: increase interval
        if state.repetitions == 0:
            new_interval = 1
        elif state.repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(state.interval * state.ease_factor)

        # Update ease factor
        # EF := EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        delta_ef = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        new_ef = max(self.MIN_EASE, state.ease_factor + delta_ef)

        return ReviewState(
            interval=max(1, new_interval),
            ease_factor=round(new_ef, 2),
            repetitions=state.repetitions + 1,
        )

    def due_date(self, state: ReviewState, last_review: date) -> date:
        """Compute the next due date from last review date + interval."""
        return last_review + timedelta(days=state.interval)

    def is_due(self, state: ReviewState, last_review: date) -> bool:
        """Whether the topic is due for review today or overdue."""
        return date.today() >= self.due_date(state, last_review)

    def overdue_days(self, state: ReviewState, last_review: date) -> int:
        """How many days past due. 0 if not overdue."""
        return max(0, (date.today() - self.due_date(state, last_review)).days)

    def mastery_to_quality(self, mastery_delta: float, correct: bool) -> int:
        """
        Convert quiz performance to SM-2 quality score.
        mastery_delta: change in mastery score from BKT update
        correct: whether the answer was correct
        """
        if not correct:
            if mastery_delta > -0.05:
                return 2  # barely wrong
            return 0

        if mastery_delta >= 0.15:
            return 5  # huge improvement
        elif mastery_delta >= 0.10:
            return 4
        elif mastery_delta >= 0.05:
            return 3
        else:
            return 3  # minimal gain but still correct

    def initial_state(self) -> ReviewState:
        return ReviewState(interval=1, ease_factor=self.INITIAL_EASE, repetitions=0)
