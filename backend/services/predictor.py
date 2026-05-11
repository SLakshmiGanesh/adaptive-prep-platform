"""
services/predictor.py — Exam Score Prediction Model

Uses a weighted mastery average with:
  - Topic importance weights (from syllabus)
  - Exam-specific scoring schemes (JEE: 360, NEET: 720)
  - Confidence interval estimation from mastery variance
  - Days-to-exam urgency context
"""

from datetime import date
from typing import Optional


EXAM_CONFIG = {
    "JEE": {
        "max_score": 360,
        "marking": {"correct": 4, "wrong": -1, "unattempted": 0},
        "total_questions": 90,
        "passing_percentile_score": 180,  # ~50th percentile cutoff
    },
    "NEET": {
        "max_score": 720,
        "marking": {"correct": 4, "wrong": -1, "unattempted": 0},
        "total_questions": 180,
        "passing_percentile_score": 360,
    },
    "UPSC": {
        "max_score": 2025,
        "marking": {"correct": 2, "wrong": -0.66, "unattempted": 0},
        "total_questions": 100,
        "passing_percentile_score": 900,
    },
    "semester": {
        "max_score": 100,
        "marking": {"correct": 1, "wrong": 0, "unattempted": 0},
        "total_questions": 100,
        "passing_percentile_score": 50,
    },
}


class ScorePredictor:

    def predict(
        self,
        mastery_vector: list[tuple],  # (topic_id, mastery, weight, name)
        exam_target: Optional[str] = None,
        exam_date: Optional[date] = None,
    ) -> dict:
        """
        Predict exam score and identify risk areas.

        Returns a rich prediction dict with score, CI, weak/strong topics.
        """
        if not mastery_vector:
            return self._empty_prediction(exam_target)

        config = EXAM_CONFIG.get(exam_target or "semester", EXAM_CONFIG["semester"])
        max_score = config["max_score"]

        # Weighted average mastery
        total_weight = sum(w for _, _, w, _ in mastery_vector)
        if total_weight == 0:
            weighted_mastery = 0.3
        else:
            weighted_mastery = sum(
                m * w for _, m, w, _ in mastery_vector
            ) / total_weight

        # Model: negative marking penalty
        # Expected score = P(correct) × correct_mark + P(wrong) × wrong_mark
        # P(correct) ≈ mastery (student answers what they know)
        # P(wrong) ≈ (1 - mastery) × 0.5 (attempts half unknowns)
        correct_mark = config["marking"]["correct"]
        wrong_mark   = config["marking"]["wrong"]

        p_correct   = weighted_mastery
        p_wrong     = (1.0 - weighted_mastery) * 0.4
        p_skip      = (1.0 - weighted_mastery) * 0.6

        expected_raw = p_correct * correct_mark + p_wrong * wrong_mark
        predicted_score = round(
            (expected_raw / correct_mark) * max_score, 1
        )
        predicted_score = max(0, min(max_score, predicted_score))

        # Confidence interval (±1 std dev approximation)
        mastery_std = self._mastery_std(mastery_vector)
        ci_width = max_score * mastery_std * 0.3
        ci_low  = max(0, predicted_score - ci_width)
        ci_high = min(max_score, predicted_score + ci_width)

        # Percentile estimate (simple sigmoid)
        import math
        passing = config["passing_percentile_score"]
        normalized = (predicted_score - passing) / (max_score * 0.15)
        percentile = round(100 / (1 + math.exp(-normalized)), 1)

        # Identify weak / strong topics
        sorted_topics = sorted(mastery_vector, key=lambda x: x[1])
        weak_topics   = [
            {"id": t[0], "name": t[3], "mastery": round(t[1], 3)}
            for t in sorted_topics[:5]
            if t[1] < 0.5
        ]
        strong_topics = [
            {"id": t[0], "name": t[3], "mastery": round(t[1], 3)}
            for t in sorted_topics[-5:]
            if t[1] > 0.7
        ]

        # Days to exam
        days_to_exam = None
        if exam_date:
            delta = (exam_date - date.today()).days
            days_to_exam = max(0, delta)

        return {
            "score": predicted_score,
            "max_score": max_score,
            "percentile": percentile,
            "ci_low": round(ci_low, 1),
            "ci_high": round(ci_high, 1),
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "days_to_exam": days_to_exam,
            "weighted_mastery": round(weighted_mastery, 3),
        }

    def _mastery_std(self, mastery_vector: list[tuple]) -> float:
        if len(mastery_vector) < 2:
            return 0.15
        masteries = [m for _, m, _, _ in mastery_vector]
        mean = sum(masteries) / len(masteries)
        variance = sum((m - mean) ** 2 for m in masteries) / len(masteries)
        import math
        return math.sqrt(variance)

    def _empty_prediction(self, exam_target: Optional[str]) -> dict:
        config = EXAM_CONFIG.get(exam_target or "semester", EXAM_CONFIG["semester"])
        return {
            "score": 0,
            "max_score": config["max_score"],
            "percentile": 0,
            "ci_low": 0,
            "ci_high": config["max_score"] * 0.3,
            "weak_topics": [],
            "strong_topics": [],
            "days_to_exam": None,
            "weighted_mastery": 0,
        }
