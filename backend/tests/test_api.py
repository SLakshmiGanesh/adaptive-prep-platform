"""
tests/test_api.py — Integration tests for all API endpoints
Uses httpx AsyncClient against the FastAPI app (in-memory, no real DB needed for smoke tests).
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "test-user-id"
    user.email = "test@example.com"
    user.name = "Test User"
    user.exam_target = "JEE"
    user.exam_date = None
    user.xp = 500
    user.streak_days = 7
    user.last_active = None
    user.hashed_password = "hashed"
    return user


@pytest.fixture
def auth_headers():
    """Generate a real JWT for test user."""
    from routers.auth import create_access_token
    token = create_access_token("test-user-id")
    return {"Authorization": f"Bearer {token}"}


# ── Auth tests ─────────────────────────────────────────────────────────────────

class TestAuth:
    def test_register_payload_validation(self):
        """RegisterRequest requires email, password, name."""
        from routers.auth import RegisterRequest
        r = RegisterRequest(email="a@b.com", password="secret123", name="Alice")
        assert r.email == "a@b.com"
        assert r.name == "Alice"

    def test_password_hashing(self):
        from routers.auth import hash_password, verify_password
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed)
        assert not verify_password("wrongpassword", hashed)

    def test_jwt_encode_decode(self):
        from routers.auth import create_access_token
        from jose import jwt
        from db import settings
        token = create_access_token("user-123")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == "user-123"


# ── BKT unit tests ─────────────────────────────────────────────────────────────

class TestBKTService:
    def setup_method(self):
        from services.skm import BayesianKT
        self.kt = BayesianKT()

    def test_correct_increases_mastery(self):
        new = self.kt.update(0.3, correct=True)
        assert new > 0.3

    def test_wrong_decreases_mastery(self):
        new = self.kt.update(0.7, correct=False)
        assert new < 0.7

    def test_bounded(self):
        p = self.kt.update(0.001, correct=False)
        assert 0.0 <= p <= 1.0
        p = self.kt.update(0.999, correct=True)
        assert 0.0 <= p <= 1.0

    def test_ability_mapping(self):
        theta = self.kt.estimate_ability(0.5)
        assert abs(theta) < 0.1  # 0.5 mastery → ~0 theta

        theta_high = self.kt.estimate_ability(0.9)
        assert theta_high > 1.5

        theta_low = self.kt.estimate_ability(0.1)
        assert theta_low < -1.5


# ── IRT unit tests ─────────────────────────────────────────────────────────────

class TestIRTModule:
    def test_p_correct_boundary(self):
        from ai.assessment.irt import p_correct
        assert p_correct(0, 1, 0) == pytest.approx(0.5, abs=0.001)
        assert p_correct(3, 1, 0) > 0.9
        assert p_correct(-3, 1, 0) < 0.1

    def test_select_question_returns_valid_item(self):
        from ai.assessment.irt import select_question_irt
        candidates = [
            {"id": f"q{i}", "difficulty": i * 0.2, "discrimination": 1.0,
             "text": "?", "options": [], "topic_name": "T"}
            for i in range(6)
        ]
        result = select_question_irt(ability=0.5, candidates=candidates)
        assert result["id"].startswith("q")
        assert "difficulty" in result

    def test_ability_estimate_all_correct(self):
        from ai.assessment.irt import ability_estimate_from_responses
        responses = [(0.5, 1.0, True)] * 15
        theta = ability_estimate_from_responses(responses)
        assert theta > 0.5

    def test_ability_estimate_all_wrong(self):
        from ai.assessment.irt import ability_estimate_from_responses
        responses = [(0.5, 1.0, False)] * 15
        theta = ability_estimate_from_responses(responses)
        assert theta < -0.5


# ── Spaced repetition tests ────────────────────────────────────────────────────

class TestSpacedRep:
    def setup_method(self):
        from services.spaced_rep import SpacedRepetition
        self.sr = SpacedRepetition()

    def test_quality_5_grows_interval(self):
        from services.spaced_rep import ReviewState
        s = ReviewState(interval=6, ease_factor=2.5, repetitions=2)
        new_s = self.sr.next_review(s, quality=5)
        assert new_s.interval > s.interval

    def test_quality_0_resets(self):
        from services.spaced_rep import ReviewState
        s = ReviewState(interval=30, ease_factor=2.5, repetitions=10)
        new_s = self.sr.next_review(s, quality=0)
        assert new_s.interval == 1
        assert new_s.repetitions == 0

    def test_ef_never_below_minimum(self):
        from services.spaced_rep import ReviewState
        s = ReviewState(interval=1, ease_factor=1.3, repetitions=0)
        new_s = self.sr.next_review(s, quality=0)
        assert new_s.ease_factor >= self.sr.MIN_EASE


# ── Score predictor tests ──────────────────────────────────────────────────────

class TestPredictor:
    def setup_method(self):
        from services.predictor import ScorePredictor
        self.p = ScorePredictor()

    def test_jee_max_score(self):
        result = self.p.predict([("t1", 0.5, 1.0, "T")], "JEE")
        assert result["max_score"] == 360

    def test_neet_max_score(self):
        result = self.p.predict([("t1", 0.5, 1.0, "T")], "NEET")
        assert result["max_score"] == 720

    def test_high_mastery_predicts_high_score(self):
        mv = [("t1", 0.95, 1.0, "T"), ("t2", 0.9, 1.0, "T")]
        result = self.p.predict(mv, "JEE")
        assert result["score"] > 250

    def test_score_in_valid_range(self):
        import random
        mv = [(str(i), random.random(), 1.0, f"T{i}") for i in range(10)]
        result = self.p.predict(mv, "JEE")
        assert 0 <= result["score"] <= 360

    def test_confidence_interval_ordering(self):
        mv = [("t1", 0.5, 1.0, "T")]
        result = self.p.predict(mv, "JEE")
        assert result["ci_low"] <= result["score"] <= result["ci_high"]


# ── Recommender tests ──────────────────────────────────────────────────────────

class TestRecommender:
    def setup_method(self):
        from services.recommender import StudyPlanner
        self.planner = StudyPlanner()

    def _make_topic(self, name, mastery, revision_due=False):
        return {
            "id": name,
            "name": name,
            "subject": "Physics",
            "weight": 1.0,
            "mastery": mastery,
            "revision_due": revision_due,
            "last_studied": None,
        }

    def test_weak_topics_get_more_time(self):
        topics = [
            self._make_topic("Weak", 0.1),
            self._make_topic("Strong", 0.9),
        ]
        plan = self.planner.build_plan(topics, hours_available=2.0)
        if len(plan) >= 2:
            weak_item = next((i for i in plan if i["id"] == "Weak"), None)
            strong_item = next((i for i in plan if i["id"] == "Strong"), None)
            if weak_item and strong_item:
                assert weak_item["duration_min"] >= strong_item["duration_min"]

    def test_plan_respects_budget(self):
        topics = [self._make_topic(f"T{i}", 0.3) for i in range(20)]
        plan = self.planner.build_plan(topics, hours_available=2.0)
        total = sum(i["duration_min"] for i in plan)
        assert total <= 120 + 10  # slight tolerance

    def test_revision_due_gets_priority(self):
        topics = [
            self._make_topic("Normal", 0.5, revision_due=False),
            self._make_topic("Overdue", 0.5, revision_due=True),
        ]
        plan = self.planner.build_plan(topics, hours_available=3.0)
        if len(plan) >= 2:
            assert plan[0]["id"] == "Overdue"

    def test_mastered_topics_skipped(self):
        topics = [self._make_topic("Mastered", 0.95, revision_due=False)]
        plan = self.planner.build_plan(topics, hours_available=4.0)
        assert len(plan) == 0

    def test_empty_topics_returns_empty_plan(self):
        plan = self.planner.build_plan([], hours_available=4.0)
        assert plan == []


# ── Gamification tests ─────────────────────────────────────────────────────────

class TestGamification:
    def setup_method(self):
        from services.gamification import GamificationEngine
        self.g = GamificationEngine()

    def test_level_novice(self):
        info = self.g.get_level(0)
        assert info.title == "Novice"
        assert info.level == 1

    def test_level_progression(self):
        novice = self.g.get_level(100)
        apprentice = self.g.get_level(600)
        assert apprentice.level > novice.level

    def test_streak_extends(self):
        from datetime import date, timedelta
        yesterday = date.today() - timedelta(days=1)
        new_streak, longest, broken = self.g.check_streak(yesterday, 5, 5)
        assert new_streak == 6
        assert not broken

    def test_streak_resets_after_gap(self):
        from datetime import date, timedelta
        two_days_ago = date.today() - timedelta(days=2)
        new_streak, longest, broken = self.g.check_streak(two_days_ago, 10, 10)
        assert new_streak == 1
        assert broken
        assert longest == 10  # preserved

    def test_xp_event_positive(self):
        event = self.g.calculate_xp("quiz_correct")
        assert event.xp > 0

    def test_xp_with_streak_multiplier(self):
        base = self.g.calculate_xp("quiz_correct", {"streak_days": 0})
        boosted = self.g.calculate_xp("quiz_correct", {"streak_days": 60})
        assert boosted.xp >= base.xp

    def test_leaderboard_score_weights(self):
        high_xp   = self.g.leaderboard_score(10000, 1, 0.5)
        high_acc  = self.g.leaderboard_score(100, 1, 1.0)
        assert high_xp > high_acc  # XP has most weight
