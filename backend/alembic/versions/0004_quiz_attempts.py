"""Add quiz_attempts table for practice quiz mode.

Revision ID: 0004_quiz_attempts
Revises: 0003_review_items
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_quiz_attempts"
down_revision: Union[str, None] = "0003_review_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=True),
        sa.Column("skill", sa.String(length=60), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=True),
        sa.Column("timed_out", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_quiz_user_started", "quiz_attempts", ["user_id", "started_at"], unique=False)
    op.create_index("ix_quiz_attempts_goal_id", "quiz_attempts", ["goal_id"], unique=False)
    op.create_index("ix_quiz_attempts_id", "quiz_attempts", ["id"], unique=False)
    op.create_index("ix_quiz_attempts_status", "quiz_attempts", ["status"], unique=False)
    op.create_index("ix_quiz_attempts_user_id", "quiz_attempts", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("quiz_attempts")
