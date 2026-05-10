from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Topic(BaseModel):
    id: str
    name: str
    subject: str
    target_mastery: float = Field(ge=0, le=1)


class Question(BaseModel):
    id: str
    topic_id: str
    prompt: str
    choices: list[str]
    answer_index: int
    explanation: str
    difficulty: Difficulty


class Attempt(BaseModel):
    question_id: str
    topic_id: str
    selected_index: int
    correct: bool
    response_time_seconds: int
    created_at: datetime


class Mastery(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    mastery: float = Field(ge=0, le=1)
    attempts: int
    accuracy: float = Field(ge=0, le=1)
    risk: Literal["low", "medium", "high"]


class Recommendation(BaseModel):
    topic_id: str
    topic_name: str
    reason: str
    priority: Literal["low", "medium", "high"]
    suggested_activity: str


class RevisionItem(BaseModel):
    topic_id: str
    topic_name: str
    due_label: str
    mastery: float


class DashboardSummary(BaseModel):
    student_id: str
    readiness: float
    predicted_score: int
    total_attempts: int
    streak_days: int
    mastery: list[Mastery]
    recommendations: list[Recommendation]
    revision_queue: list[RevisionItem]


class QuizQuestion(BaseModel):
    question_id: str
    topic_id: str
    topic_name: str
    prompt: str
    choices: list[str]
    difficulty: Difficulty


class SubmitAttemptRequest(BaseModel):
    student_id: str = "demo-student"
    question_id: str
    selected_index: int = Field(ge=0)
    response_time_seconds: int = Field(default=45, ge=1)


class SubmitAttemptResponse(BaseModel):
    correct: bool
    answer_index: int
    explanation: str
    updated_mastery: Mastery
    next_question: QuizQuestion


class TutorRequest(BaseModel):
    student_id: str = "demo-student"
    topic_id: str
    question: str


class TutorResponse(BaseModel):
    answer: str
    suggested_next_step: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: str = "demo-student"
