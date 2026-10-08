"""Add activity_days and user_badges tables for streaks and achievements.

Revision ID: 0005_streaks_badges
Revises: 0004_quiz_attempts
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_streaks_badges"
down_revision: Union[str, None] = "0004_quiz_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_days",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "day"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_activity_user_day", "activity_days", ["user_id", "day"], unique=False)
    op.create_index("ix_activity_days_id", "activity_days", ["id"], unique=False)
    op.create_index("ix_activity_days_user_id", "activity_days", ["user_id"], unique=False)

    op.create_table(
        "user_badges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("badge", sa.String(length=64), nullable=False),
        sa.Column("awarded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_user_badges_id", "user_badges", ["id"], unique=False)
    op.create_index("ix_user_badges_user_id", "user_badges", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("user_badges")
    op.drop_table("activity_days")
