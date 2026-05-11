"""
ai/knowledge_model/bayesian_kt.py — Extended Bayesian Knowledge Tracing

This is the AI-layer version with additional features:
  - Per-student parameter fitting using EM algorithm
  - Topic difficulty calibration
  - Forgetting curve integration (Ebbinghaus)
  - Learning velocity tracking
"""

import math
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class StudentModel:
    """Full cognitive model for one student on one topic."""
    mastery: float = 0.10             # P(knows topic)
    learning_velocity: float = 0.15   # how fast they learn (P_LEARN)
    forgetting_rate: float = 0.05     # daily decay rate
    attempt_count: int = 0
    correct_count: int = 0
    last_studied_days_ago: Optional[int] = None


@dataclass
class BKTParams:
    """Bayesian Knowledge Tracing parameters (tunable per topic/student)."""
    p_init: float = 0.10    # prior probability of knowing
    p_learn: float = 0.15   # probability of learning per attempt
    p_slip: float = 0.10    # P(wrong | known)  — careless errors
    p_guess: float = 0.20   # P(right | unknown) — lucky guesses


class BayesianKnowledgeTracer:
    """
    Full BKT implementation with:
    - Standard update equations
    - Ebbinghaus forgetting curve integration
    - Learning velocity estimation from history
    - EM-based parameter fitting
    """

    DEFAULT_PARAMS = BKTParams()

    # ── Core BKT ─────────────────────────────────────────────────────────────

    def update(
        self,
        p_known: float,
        correct: bool,
        params: BKTParams = DEFAULT_PARAMS,
    ) -> float:
        """
        Standard BKT update equation.
        P(L_n) = P(L_{n-1} | obs_n) + (1 - P(L_{n-1} | obs_n)) * P_T
        """
        # P(observation | known/unknown)
        if correct:
            p_obs_known     = 1.0 - params.p_slip
            p_obs_not_known = params.p_guess
        else:
            p_obs_known     = params.p_slip
            p_obs_not_known = 1.0 - params.p_guess

        # Bayes posterior
        numer = p_obs_known * p_known
        denom = numer + p_obs_not_known * (1.0 - p_known)
        p_posterior = numer / denom if denom > 0 else p_known

        # Learning transition
        p_updated = p_posterior + (1.0 - p_posterior) * params.p_learn

        return float(max(0.0, min(1.0, p_updated)))

    # ── Forgetting curve (Ebbinghaus) ────────────────────────────────────────

    def apply_forgetting(
        self,
        mastery: float,
        days_elapsed: int,
        forgetting_rate: float = 0.05,
    ) -> float:
        """
        Ebbinghaus forgetting curve:
          R(t) = e^(-t/S)
        where S = stability (inverse of forgetting rate).

        Applied to mastery: mastery(t) = mastery_0 * R(t)
        We keep a floor at p_guess (0.2) since knowledge doesn't fully vanish.
        """
        if days_elapsed <= 0:
            return mastery

        # Stability S: higher forgetting_rate → lower stability
        stability = max(1.0, 1.0 / forgetting_rate)
        retention = math.exp(-days_elapsed / stability)

        # Decay mastery, but never below p_guess floor
        decayed = mastery * retention + 0.20 * (1 - retention)
        return float(max(0.10, min(mastery, decayed)))

    # ── Full update with forgetting ──────────────────────────────────────────

    def full_update(
        self,
        model: StudentModel,
        correct: bool,
        params: Optional[BKTParams] = None,
    ) -> StudentModel:
        """
        Complete update: apply forgetting since last study, then BKT update.
        Updates learning_velocity and attempt statistics.
        """
        if params is None:
            params = BKTParams(
                p_learn=model.learning_velocity,
                p_slip=0.10,
                p_guess=0.20,
            )

        # Step 1: Apply forgetting since last study
        current_mastery = model.mastery
        if model.last_studied_days_ago and model.last_studied_days_ago > 1:
            current_mastery = self.apply_forgetting(
                current_mastery,
                model.last_studied_days_ago,
                model.forgetting_rate,
            )

        # Step 2: BKT update from this attempt
        new_mastery = self.update(current_mastery, correct, params)

        # Step 3: Update learning velocity (exponential moving average)
        mastery_gain = new_mastery - current_mastery
        alpha = 0.3  # EMA smoothing factor
        new_velocity = alpha * max(0, mastery_gain) + (1 - alpha) * model.learning_velocity

        return StudentModel(
            mastery=new_mastery,
            learning_velocity=float(max(0.01, min(0.5, new_velocity))),
            forgetting_rate=model.forgetting_rate,
            attempt_count=model.attempt_count + 1,
            correct_count=model.correct_count + (1 if correct else 0),
            last_studied_days_ago=0,
        )

    # ── Parameter estimation (EM) ────────────────────────────────────────────

    def estimate_params(
        self,
        response_sequence: list[bool],
        n_iterations: int = 50,
    ) -> BKTParams:
        """
        Expectation-Maximization to fit BKT parameters from response history.
        Returns best-fit BKTParams for this student on this topic.
        Only useful with >= 20 responses.
        """
        if len(response_sequence) < 10:
            return self.DEFAULT_PARAMS

        # Initialize params
        p_l0    = 0.10
        p_learn = 0.15
        p_slip  = 0.10
        p_guess = 0.20

        for _ in range(n_iterations):
            # E-step: compute P(L_n) for each timestep
            p_states = [p_l0]
            p = p_l0
            for obs in response_sequence[:-1]:
                p_obs_k  = (1 - p_slip) if obs else p_slip
                p_obs_nk = p_guess if obs else (1 - p_guess)
                numer = p_obs_k * p
                denom = numer + p_obs_nk * (1 - p)
                p_post = numer / denom if denom > 0 else p
                p = p_post + (1 - p_post) * p_learn
                p_states.append(p)

            # M-step: update parameters (simplified gradient)
            n = len(response_sequence)
            correct_known    = sum(p_states[i] for i in range(n) if response_sequence[i])
            correct_unknown  = sum((1 - p_states[i]) for i in range(n) if response_sequence[i])
            wrong_known      = sum(p_states[i] for i in range(n) if not response_sequence[i])

            total_correct = sum(1 for r in response_sequence if r)
            total_wrong   = n - total_correct

            p_slip  = max(0.01, min(0.35, wrong_known / max(1, sum(p_states))))
            p_guess = max(0.05, min(0.45, correct_unknown / max(1, n - sum(p_states))))

        return BKTParams(
            p_init=p_l0,
            p_learn=p_learn,
            p_slip=round(p_slip, 3),
            p_guess=round(p_guess, 3),
        )

    # ── Ability mapping ──────────────────────────────────────────────────────

    def mastery_to_irt_theta(self, mastery: float) -> float:
        """Map mastery (0–1) to IRT ability θ ∈ [-3, 3]."""
        p = max(0.01, min(0.99, mastery))
        return max(-3.0, min(3.0, math.log(p / (1.0 - p))))

    def accuracy_rate(self, model: StudentModel) -> float:
        """Student's accuracy rate on this topic."""
        if model.attempt_count == 0:
            return 0.0
        return model.correct_count / model.attempt_count

    def mastery_label(self, mastery: float) -> str:
        thresholds = [
            (0.20, "Beginner"),
            (0.40, "Basic"),
            (0.60, "Developing"),
            (0.75, "Proficient"),
            (0.90, "Advanced"),
            (1.01, "Mastered"),
        ]
        for threshold, label in thresholds:
            if mastery < threshold:
                return label
        return "Mastered"

    def days_to_mastery(
        self,
        current_mastery: float,
        target_mastery: float = 0.80,
        daily_attempts: int = 10,
        params: BKTParams = DEFAULT_PARAMS,
    ) -> int:
        """
        Estimate how many days to reach target mastery given
        `daily_attempts` practice attempts per day.
        """
        mastery = current_mastery
        days = 0
        max_days = 365

        while mastery < target_mastery and days < max_days:
            # Simulate a day of practice (all correct at current level)
            for _ in range(daily_attempts):
                mastery = self.update(mastery, correct=True, params=params)
            # Apply overnight forgetting
            mastery = self.apply_forgetting(mastery, 1, params.p_learn * 0.1)
            days += 1

        return days
