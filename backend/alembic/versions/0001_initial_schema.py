"""Initial schema: all AGENTOS tables with FK cascades and indexes.

Revision ID: 0001_initial_schema
Revises: None

Matches app/models.py. Fresh installs get AUTOINCREMENT ids on SQLite plus
indexes on user_id / goal_id / status columns. Existing SQLite dev databases
predate these options: recreate them (delete the .db file) to pick them up.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"], unique=False)

    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("target_role", sa.String(length=255), nullable=False),
        sa.Column("timeline_days", sa.Integer(), nullable=False),
        sa.Column("current_skills", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("analysis", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_goals_id", "goals", ["id"], unique=False)
    op.create_index("ix_goals_status", "goals", ["status"], unique=False)
    op.create_index("ix_goals_user_id", "goals", ["user_id"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("task_type", sa.String(length=32), nullable=False),
        sa.Column("skill", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_tasks_goal_status", "tasks", ["goal_id", "status"], unique=False)
    op.create_index("ix_tasks_goal_id", "tasks", ["goal_id"], unique=False)
    op.create_index("ix_tasks_id", "tasks", ["id"], unique=False)
    op.create_index("ix_tasks_status", "tasks", ["status"], unique=False)

    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("feedback", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_submissions_id", "submissions", ["id"], unique=False)
    op.create_index("ix_submissions_task_id", "submissions", ["task_id"], unique=False)

    op.create_table(
        "agent_traces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("agent_name", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_agent_traces_goal_id", "agent_traces", ["goal_id"], unique=False)
    op.create_index("ix_agent_traces_id", "agent_traces", ["id"], unique=False)

    op.create_table(
        "skill_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("skill", sa.String(length=128), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_skill_scores_goal_id", "skill_scores", ["goal_id"], unique=False)
    op.create_index("ix_skill_scores_id", "skill_scores", ["id"], unique=False)

    op.create_table(
        "interview_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_interview_sessions_goal_id", "interview_sessions", ["goal_id"], unique=False)
    op.create_index("ix_interview_sessions_id", "interview_sessions", ["id"], unique=False)
    op.create_index("ix_interview_sessions_status", "interview_sessions", ["status"], unique=False)
    op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"], unique=False)

    op.create_table(
        "interview_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("round_name", sa.String(length=128), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("skill", sa.String(length=128), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_interview_questions_id", "interview_questions", ["id"], unique=False)
    op.create_index("ix_interview_questions_session_id", "interview_questions", ["session_id"], unique=False)

    op.create_table(
        "readiness_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_snapshots_goal_date", "readiness_snapshots", ["goal_id", "date"], unique=False)
    op.create_index("ix_readiness_snapshots_goal_id", "readiness_snapshots", ["goal_id"], unique=False)
    op.create_index("ix_readiness_snapshots_id", "readiness_snapshots", ["id"], unique=False)


def downgrade() -> None:
    for table in ("readiness_snapshots", "interview_questions", "interview_sessions",
                  "skill_scores", "agent_traces", "submissions", "tasks", "goals", "users"):
        op.drop_table(table)
