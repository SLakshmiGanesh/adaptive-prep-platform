"""
Alembic initial migration — creates all tables with pgvector support

Run:
    alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("exam_target", sa.String(50)),
        sa.Column("exam_date", sa.Date),
        sa.Column("xp", sa.Integer, default=0),
        sa.Column("streak_days", sa.Integer, default=0),
        sa.Column("last_active", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Topics
    op.create_table(
        "topics",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("subject", sa.String(100), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("parent_id", UUID(as_uuid=False), sa.ForeignKey("topics.id")),
        sa.Column("difficulty_baseline", sa.Float, default=0.5),
        sa.Column("exam_targets", JSONB, default=[]),
        sa.Column("weight", sa.Float, default=1.0),
        sa.Column("order_index", sa.Integer, default=0),
    )
    op.create_index("ix_topics_subject", "topics", ["subject"])

    # Questions
    op.create_table(
        "questions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("topic_id", UUID(as_uuid=False), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("options", JSONB),
        sa.Column("correct_answer", sa.String(10), nullable=False),
        sa.Column("explanation", sa.Text),
        sa.Column("difficulty", sa.Float, default=0.5),
        sa.Column("discrimination", sa.Float, default=1.0),
        sa.Column("embedding", Vector(1536)),
        sa.Column("tags", JSONB, default=[]),
        sa.Column("source", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_questions_topic_id", "questions", ["topic_id"])

    # Attempts
    op.create_table(
        "attempts",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("question_id", UUID(as_uuid=False), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("correct", sa.Boolean, nullable=False),
        sa.Column("time_taken_sec", sa.Integer),
        sa.Column("confidence", sa.Integer, sa.CheckConstraint("confidence BETWEEN 1 AND 5")),
        sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_attempts_user_id", "attempts", ["user_id"])

    # Study sessions
    op.create_table(
        "study_sessions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("topic_id", UUID(as_uuid=False), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("duration_min", sa.Integer, nullable=False),
        sa.Column("session_date", sa.Date, nullable=False),
        sa.Column("session_type", sa.String(50), default="study"),
    )

    # Mastery snapshots
    op.create_table(
        "mastery_snapshots",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("topic_id", UUID(as_uuid=False), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("mastery", sa.Float, nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mastery_user", "mastery_snapshots", ["user_id"])
    op.create_index("ix_mastery_topic", "mastery_snapshots", ["topic_id"])

    # Revision schedule
    op.create_table(
        "revision_schedule",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("topic_id", UUID(as_uuid=False), sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("next_revision", sa.Date, nullable=False),
        sa.Column("interval_days", sa.Integer, default=1),
        sa.Column("ease_factor", sa.Float, default=2.5),
        sa.Column("repetitions", sa.Integer, default=0),
    )

    # Predictions
    op.create_table(
        "predictions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("predicted_score", sa.Float, nullable=False),
        sa.Column("max_score", sa.Float, default=360.0),
        sa.Column("weak_topics", JSONB, default=[]),
        sa.Column("strong_topics", JSONB, default=[]),
        sa.Column("confidence_interval", JSONB, default={}),
        sa.Column("predicted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Document chunks (RAG)
    op.create_table(
        "document_chunks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("source", sa.String(300), nullable=False),
        sa.Column("topic_id", UUID(as_uuid=False), sa.ForeignKey("topics.id")),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("chunk_index", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Vector index for fast similarity search
    op.execute("""
        CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    """)
    op.execute("""
        CREATE INDEX ON questions USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 50);
    """)


def downgrade():
    op.drop_table("document_chunks")
    op.drop_table("predictions")
    op.drop_table("revision_schedule")
    op.drop_table("mastery_snapshots")
    op.drop_table("study_sessions")
    op.drop_table("attempts")
    op.drop_table("questions")
    op.drop_table("topics")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector;")
