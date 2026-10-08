"""Add the (goal_id, due_date) index for overdue lookups.

Revision ID: 0006_task_due_index
Revises: 0005_streaks_badges

Batch mode keeps this valid on SQLite and Postgres alike. The tasks.due_date
column itself predates this migration and is untouched (NULL stays allowed).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "0006_task_due_index"
down_revision: Union[str, None] = "0005_streaks_badges"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.create_index("ix_tasks_goal_due", ["goal_id", "due_date"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_index("ix_tasks_goal_due")
