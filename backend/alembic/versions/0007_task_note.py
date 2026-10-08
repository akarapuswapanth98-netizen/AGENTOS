"""Add nullable tasks.note for user annotations.

Revision ID: 0007_task_note
Revises: 0006_task_due_index

Batch mode keeps this valid on SQLite and Postgres alike. Notes are plain
user text: never sent to the LLM, never rendered as HTML.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_task_note"
down_revision: Union[str, None] = "0006_task_due_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(sa.Column("note", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_column("note")
