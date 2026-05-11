"""
tests/test_ai_engine.py — Unit tests for core AI modules
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import math
from services.skm import BayesianKT, BKTParams
from services.spaced_rep import SpacedRepetition, ReviewState
from services.predictor import ScorePredictor
from ai.assessment.irt import (
    p_correct, fisher_information, select_question_irt,
    mastery_to_theta, difficulty_to_b, ability_estimate_from_responses
)


# ── BKT Tests ──────────────────────────────────────────────────────────────

class TestBayesianKT:
    def setup_method(self):
        self.kt = BayesianKT()

    def test_correct_answer_increases_mastery(self):
        p = 0.3
        updated = self.kt.update(p, correct=True)
        assert updated > p

    def test_wrong_answer_decreases_mastery(self):
        p = 0.8
        updated = self.kt.update(p, correct=False)
        assert updated < p

    def test_mastery_stays_in_bounds(self):
        # Start very high, wrong answer
        p = self.kt.update(0.99, correct=False)
        assert 0.0 <= p <= 1.0

        # Start very low, correct answer
        p = self.kt.update(0.01, correct=True)
        assert 0.0 <= p <= 1.0

    def test_learning_never_decays_to_zero(self):
        p = 0.5
        for _ in range(20):
            p = self.kt.update(p, correct=False)
        assert p > 0.0  # learning is irreversible

    def test_batch_update_converges(self):
        p = 0.1
        p_after = self.kt.batch_update(p, [True] * 20)
        assert p_after > 0.7  # should converge to high mastery

    def test_mastery_label(self):
        assert self.kt.mastery_label(0.1) == "Beginner"
        assert self.kt.mastery_label(0.5) == "Developing"
        assert self.kt.mastery_label(0.95) == "Mastered"

    def test_custom_params(self):
        # High learning rate should converge faster
        fast_kt = BayesianKT(BKTParams(p_learn=0.3))
        p1 = fast_kt.batch_update(0.1, [True] * 10)

        slow_kt = BayesianKT(BKTParams(p_learn=0.05))
        p2 = slow_kt.batch_update(0.1, [True] * 10)

        assert p1 > p2


# ── Spaced Repetition Tests ─────────────────────────────────────────────────

class TestSpacedRepetition:
    def setup_method(self):
        self.sr = SpacedRepetition()
        self.init = self.sr.initial_state()

    def test_first_success_interval_is_1(self):
        state = self.sr.next_review(self.init, quality=4)
        assert state.interval == 1
        assert state.repetitions == 1

    def test_second_success_interval_is_6(self):
        s1 = self.sr.next_review(self.init, quality=4)
        s2 = self.sr.next_review(s1, quality=4)
        assert s2.interval == 6

    def test_fail_resets_interval(self):
        s = ReviewState(interval=20, ease_factor=2.5, repetitions=5)
        reset = self.sr.next_review(s, quality=1)
        assert reset.interval == 1
        assert reset.repetitions == 0

    def test_ease_factor_decreases_on_poor_quality(self):
        s = ReviewState(interval=6, ease_factor=2.5, repetitions=2)
        updated = self.sr.next_review(s, quality=3)
        assert updated.ease_factor < 2.5

    def test_ease_factor_minimum_clamped(self):
        s = ReviewState(interval=1, ease_factor=1.31, repetitions=0)
        for _ in range(10):
            s = self.sr.next_review(s, quality=1)
        assert s.ease_factor >= self.sr.MIN_EASE

    def test_intervals_grow_exponentially(self):
        s = self.sr.initial_state()
        intervals = []
        for _ in range(5):
            s = self.sr.next_review(s, quality=5)
            intervals.append(s.interval)
        # Each interval should be larger than previous
        for i in range(1, len(intervals)):
            assert intervals[i] >= intervals[i-1]


# ── IRT Tests ──────────────────────────────────────────────────────────────

class TestIRT:
    def test_p_correct_at_equal_ability_and_difficulty(self):
        # When θ = b, P(correct) = 0.5 (by 1PL/2PL definition)
        p = p_correct(theta=0.0, a=1.0, b=0.0)
        assert abs(p - 0.5) < 0.001

    def test_high_ability_gives_high_p(self):
        p = p_correct(theta=3.0, a=1.0, b=0.0)
        assert p > 0.9

    def test_low_ability_gives_low_p(self):
        p = p_correct(theta=-3.0, a=1.0, b=0.0)
        assert p < 0.1

    def test_fisher_info_maximized_at_theta_equals_b(self):
        # Max information when θ ≈ b
        info_at_match = fisher_information(0.0, 1.0, 0.0)
        info_far_away = fisher_information(3.0, 1.0, 0.0)
        assert info_at_match > info_far_away

    def test_select_question_picks_closest_to_ability(self):
        candidates = [
            {"id": "q1", "difficulty": 0.1, "discrimination": 1.0, "text": "", "options": [], "topic_name": "T"},
            {"id": "q2", "difficulty": 0.5, "discrimination": 1.0, "text": "", "options": [], "topic_name": "T"},
            {"id": "q3", "difficulty": 0.9, "discrimination": 1.0, "text": "", "options": [], "topic_name": "T"},
        ]
        # Student with medium mastery should get medium difficulty
        selected = select_question_irt(ability=0.5, candidates=candidates)
        assert selected["id"] == "q2"

    def test_ability_estimate_correct_only(self):
        # All correct answers → high ability estimate
        responses = [(0.5, 1.0, True)] * 10
        theta = ability_estimate_from_responses(responses)
        assert theta > 1.0

    def test_ability_estimate_all_wrong(self):
        # All wrong answers → low ability estimate
        responses = [(0.5, 1.0, False)] * 10
        theta = ability_estimate_from_responses(responses)
        assert theta < -1.0


# ── Score Predictor Tests ───────────────────────────────────────────────────

class TestScorePredictor:
    def setup_method(self):
        self.predictor = ScorePredictor()

    def test_high_mastery_gives_high_score(self):
        mastery_vector = [
            ("t1", 0.9, 1.0, "Physics"),
            ("t2", 0.85, 1.0, "Chemistry"),
            ("t3", 0.80, 1.0, "Math"),
        ]
        result = self.predictor.predict(mastery_vector, exam_target="JEE")
        assert result["score"] > 200  # should be above average

    def test_low_mastery_gives_low_score(self):
        mastery_vector = [
            ("t1", 0.1, 1.0, "Physics"),
            ("t2", 0.15, 1.0, "Chemistry"),
            ("t3", 0.2, 1.0, "Math"),
        ]
        result = self.predictor.predict(mastery_vector, exam_target="JEE")
        assert result["score"] < 100

    def test_score_within_valid_range(self):
        mastery_vector = [("t1", 0.5, 1.0, "Physics")]
        result = self.predictor.predict(mastery_vector, exam_target="JEE")
        assert 0 <= result["score"] <= 360

    def test_weak_topics_identified(self):
        mastery_vector = [
            ("t1", 0.1, 1.0, "Weak Topic"),
            ("t2", 0.9, 1.0, "Strong Topic"),
        ]
        result = self.predictor.predict(mastery_vector, exam_target="JEE")
        weak_names = [t["name"] for t in result["weak_topics"]]
        assert "Weak Topic" in weak_names

    def test_empty_mastery_returns_zero(self):
        result = self.predictor._empty_prediction("JEE")
        assert result["score"] == 0
        assert result["max_score"] == 360
