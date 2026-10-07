"""Add review_items table for spaced repetition.

Revision ID: 0003_review_items
Revises: 0002_resume_analyses
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_review_items"
down_revision: Union[str, None] = "0002_resume_analyses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "review_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=True),
        sa.Column("skill", sa.String(length=128), nullable=False),
        sa.Column("stage", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("last_score", sa.Integer(), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "skill", "goal_id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_reviews_user_due", "review_items", ["user_id", "due_date"], unique=False)
    op.create_index("ix_review_items_goal_id", "review_items", ["goal_id"], unique=False)
    op.create_index("ix_review_items_id", "review_items", ["id"], unique=False)
    op.create_index("ix_review_items_user_id", "review_items", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("review_items")
