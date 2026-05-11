"""
services/skm.py — Student Knowledge Model: Bayesian Knowledge Tracing (BKT)

BKT models a student's knowledge state as a hidden Markov model:
  - Each topic has a hidden binary state: {learned, not learned}
  - We track P(learned) as a continuous probability (mastery score)
  - We update it after each observation (correct/incorrect attempt)

Parameters (can be tuned per topic or per student cohort):
  P_INIT    — prior probability student already knows the topic
  P_LEARN   — probability of transitioning from unknown → known per attempt
  P_SLIP    — probability of wrong answer despite knowing (careless mistake)
  P_GUESS   — probability of right answer despite not knowing (lucky guess)
"""

from dataclasses import dataclass


@dataclass
class BKTParams:
    p_init: float = 0.10   # prior knowledge
    p_learn: float = 0.15  # learning rate per attempt
    p_slip: float = 0.10   # slip probability
    p_guess: float = 0.20  # guess probability


class BayesianKT:
    """
    Bayesian Knowledge Tracing with configurable parameters.
    Returns a continuous mastery score in [0, 1].
    """

    def __init__(self, params: BKTParams = BKTParams()):
        self.params = params

    def update(self, p_known: float, correct: bool) -> float:
        """
        Update P(known) after one observation.

        Args:
            p_known:  Current mastery probability (0–1)
            correct:  Whether the student answered correctly

        Returns:
            Updated mastery probability (0–1)
        """
        p = self.params

        # Step 1: Compute P(observation | known, unknown)
        if correct:
            p_obs_given_known     = 1.0 - p.p_slip
            p_obs_given_not_known = p.p_guess
        else:
            p_obs_given_known     = p.p_slip
            p_obs_given_not_known = 1.0 - p.p_guess

        # Step 2: Bayes posterior update
        numerator   = p_obs_given_known * p_known
        denominator = (
            p_obs_given_known * p_known
            + p_obs_given_not_known * (1.0 - p_known)
        )
        p_known_posterior = numerator / denominator if denominator > 0 else p_known

        # Step 3: Apply learning transition P(known_t+1 | unknown_t)
        # P(known_{t+1}) = P(known | obs) + P(not known | obs) * P_LEARN
        p_known_updated = (
            p_known_posterior
            + (1.0 - p_known_posterior) * p.p_learn
        )

        # Clamp to valid probability range
        return max(0.0, min(1.0, p_known_updated))

    def batch_update(self, p_known: float, attempts: list[bool]) -> float:
        """Apply multiple observations sequentially."""
        for correct in attempts:
            p_known = self.update(p_known, correct)
        return p_known

    def estimate_ability(self, mastery: float) -> float:
        """
        Map mastery (0–1) to IRT ability scale (-3 to +3).
        Used to interface with the IRT question selector.
        """
        import math
        # Logit transform: maps (0,1) → (-∞, +∞), scaled to [-3, 3]
        p_clamped = max(0.01, min(0.99, mastery))
        logit = math.log(p_clamped / (1.0 - p_clamped))
        return max(-3.0, min(3.0, logit))

    def mastery_label(self, mastery: float) -> str:
        """Human-readable mastery level."""
        if mastery < 0.20:
            return "Beginner"
        elif mastery < 0.40:
            return "Basic"
        elif mastery < 0.60:
            return "Developing"
        elif mastery < 0.75:
            return "Proficient"
        elif mastery < 0.90:
            return "Advanced"
        else:
            return "Mastered"
