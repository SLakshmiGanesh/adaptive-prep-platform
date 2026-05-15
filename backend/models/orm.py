"""
models/orm.py — SQLAlchemy ORM models
Includes question_type for GATE numerical + MSQ support
"""

import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    String, Float, Integer, Boolean, Date, DateTime,
    ForeignKey, Text, CheckConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id:                Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email:             Mapped[str]           = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password:   Mapped[str]           = mapped_column(String(255), nullable=False)
    name:              Mapped[str]           = mapped_column(String(100), nullable=False)
    exam_target:       Mapped[Optional[str]] = mapped_column(String(50))
    exam_date:         Mapped[Optional[date]]= mapped_column(Date)
    weekly_goal_hours: Mapped[int]           = mapped_column(Integer, default=20)
    xp:                Mapped[int]           = mapped_column(Integer, default=0)
    streak_days:       Mapped[int]           = mapped_column(Integer, default=0)
    longest_streak:    Mapped[int]           = mapped_column(Integer, default=0)
    level:             Mapped[int]           = mapped_column(Integer, default=1)
    level_title:       Mapped[str]           = mapped_column(String(50), default="Novice")
    earned_badges:     Mapped[list]          = mapped_column(JSONB, default=list)
    last_active:       Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at:        Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    attempts:          Mapped[list["Attempt"]]         = relationship(back_populates="user")
    mastery_snapshots: Mapped[list["MasterySnapshot"]] = relationship(back_populates="user")
    study_sessions:    Mapped[list["StudySession"]]    = relationship(back_populates="user")
    revision_schedules:Mapped[list["RevisionSchedule"]]= relationship(back_populates="user")
    predictions:       Mapped[list["Prediction"]]      = relationship(back_populates="user")


class Topic(Base):
    __tablename__ = "topics"
    id:                  Mapped[str]            = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    subject:             Mapped[str]            = mapped_column(String(100), nullable=False, index=True)
    name:                Mapped[str]            = mapped_column(String(200), nullable=False)
    parent_id:           Mapped[Optional[str]]  = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"))
    difficulty_baseline: Mapped[float]          = mapped_column(Float, default=0.5)
    exam_targets:        Mapped[list]           = mapped_column(JSONB, default=list)
    weight:              Mapped[float]          = mapped_column(Float, default=1.0)
    order_index:         Mapped[int]            = mapped_column(Integer, default=0)

    questions:          Mapped[list["Question"]]        = relationship(back_populates="topic")
    mastery_snapshots:  Mapped[list["MasterySnapshot"]] = relationship(back_populates="topic")


class Question(Base):
    __tablename__ = "questions"
    id:             Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    topic_id:       Mapped[str]           = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False, index=True)
    text:           Mapped[str]           = mapped_column(Text, nullable=False)
    options:        Mapped[list]          = mapped_column(JSONB, default=list)
    correct_answer: Mapped[str]           = mapped_column(String(50), nullable=False)  # option id OR numerical string
    explanation:    Mapped[Optional[str]] = mapped_column(Text)
    difficulty:     Mapped[float]         = mapped_column(Float, default=0.5)
    discrimination: Mapped[float]         = mapped_column(Float, default=1.0)
    question_type:  Mapped[str]           = mapped_column(String(20), default="mcq")  # mcq | numerical | msq
    embedding:      Mapped[Optional[list]]= mapped_column(Vector(1536))
    tags:           Mapped[list]          = mapped_column(JSONB, default=list)
    source:         Mapped[Optional[str]] = mapped_column(String(200))
    created_at:     Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    topic:    Mapped["Topic"]      = relationship(back_populates="questions")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="question")


class Attempt(Base):
    __tablename__ = "attempts"
    id:            Mapped[str]          = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id:       Mapped[str]          = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    question_id:   Mapped[str]          = mapped_column(UUID(as_uuid=False), ForeignKey("questions.id"), nullable=False)
    correct:       Mapped[bool]         = mapped_column(Boolean, nullable=False)
    time_taken_sec:Mapped[int]          = mapped_column(Integer)
    confidence:    Mapped[Optional[int]]= mapped_column(Integer, CheckConstraint("confidence BETWEEN 1 AND 5"))
    attempted_at:  Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    user:     Mapped["User"]     = relationship(back_populates="attempts")
    question: Mapped["Question"] = relationship(back_populates="attempts")


class StudySession(Base):
    __tablename__ = "study_sessions"
    id:           Mapped[str]  = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id:      Mapped[str]  = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    topic_id:     Mapped[str]  = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
    duration_min: Mapped[int]  = mapped_column(Integer, nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    session_type: Mapped[str]  = mapped_column(String(50), default="study")

    user: Mapped["User"] = relationship(back_populates="study_sessions")


class MasterySnapshot(Base):
    __tablename__ = "mastery_snapshots"
    id:          Mapped[str]      = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id:     Mapped[str]      = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    topic_id:    Mapped[str]      = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False, index=True)
    mastery:     Mapped[float]    = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user:  Mapped["User"]  = relationship(back_populates="mastery_snapshots")
    topic: Mapped["Topic"] = relationship(back_populates="mastery_snapshots")


class RevisionSchedule(Base):
    __tablename__ = "revision_schedule"
    id:             Mapped[str]   = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id:        Mapped[str]   = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    topic_id:       Mapped[str]   = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"), nullable=False)
    next_revision:  Mapped[date]  = mapped_column(Date, nullable=False)
    interval_days:  Mapped[int]   = mapped_column(Integer, default=1)
    ease_factor:    Mapped[float] = mapped_column(Float, default=2.5)
    repetitions:    Mapped[int]   = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="revision_schedules")


class Prediction(Base):
    __tablename__ = "predictions"
    id:                  Mapped[str]      = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id:             Mapped[str]      = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    predicted_score:     Mapped[float]    = mapped_column(Float, nullable=False)
    max_score:           Mapped[float]    = mapped_column(Float, default=360.0)
    weak_topics:         Mapped[list]     = mapped_column(JSONB, default=list)
    strong_topics:       Mapped[list]     = mapped_column(JSONB, default=list)
    subject_breakdown:   Mapped[list]     = mapped_column(JSONB, default=list)
    confidence_interval: Mapped[dict]     = mapped_column(JSONB, default=dict)
    predicted_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="predictions")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id:          Mapped[str]           = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    source:      Mapped[str]           = mapped_column(String(300), nullable=False)
    topic_id:    Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("topics.id"))
    content:     Mapped[str]           = mapped_column(Text, nullable=False)
    embedding:   Mapped[list]          = mapped_column(Vector(1536), nullable=False)
    chunk_index: Mapped[int]           = mapped_column(Integer, default=0)
    created_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
