"""Phase 1 DB tests: cascades, indexes, id stability, migration coverage (offline)."""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models as models


def _indexed_columns(table) -> set[str]:
    """All columns covered by any index on the table (singles cover their column)."""
    cols = set()
    for index in table.indexes:
        for column in index.columns:
            cols.add(column.name)
    return cols


def test_all_foreign_keys_cascade():
    """Every FK in the schema carries ON DELETE CASCADE (except resume goal links)."""
    # resume_analyses.goal_id and quiz_attempts.goal_id are SET NULL by design:
    # deleting a goal keeps history but detaches it from the deleted goal.
    allowed = {("resume_analyses", "goal_id"): "SET NULL", ("quiz_attempts", "goal_id"): "SET NULL"}
    for table in Base.metadata.tables.values():
        for fk in table.foreign_keys:
            expected = allowed.get((table.name, fk.parent.name), "CASCADE")
            assert fk.ondelete == expected, f"{table.name}.{fk.parent.name} lacks {expected}"


def test_hot_columns_are_indexed():
    """user_id / goal_id / status / session_id / task_id columns are indexed."""
    expectations = {
        "goals": {"user_id", "status"},
        "tasks": {"goal_id", "status"},
        "submissions": {"task_id"},
        "agent_traces": {"goal_id"},
        "skill_scores": {"goal_id"},
        "interview_sessions": {"user_id", "goal_id", "status"},
        "interview_questions": {"session_id"},
        "readiness_snapshots": {"goal_id"},
        "review_items": {"user_id", "goal_id"},
        "quiz_attempts": {"user_id", "goal_id", "status"},
    }
    for table_name, columns in expectations.items():
        covered = _indexed_columns(Base.metadata.tables[table_name])
        assert columns <= covered, f"{table_name} missing indexes for {columns - covered}"
    assert "ix_reviews_user_due" in {i.name for i in Base.metadata.tables["review_items"].indexes}
    unique_cols = [tuple(sorted(c.name for c in constraint.columns))
                   for constraint in Base.metadata.tables["review_items"].constraints
                   if constraint.__class__.__name__ == "UniqueConstraint"]
    assert ("goal_id", "skill", "user_id") in unique_cols


def test_composite_indexes_exist():
    """The (goal_id, status) and (goal_id, date) composites exist by name."""
    tasks_idx = {i.name for i in Base.metadata.tables["tasks"].indexes}
    snaps_idx = {i.name for i in Base.metadata.tables["readiness_snapshots"].indexes}
    assert "ix_tasks_goal_status" in tasks_idx
    assert "ix_snapshots_goal_date" in snaps_idx


def test_ids_never_reused_after_delete():
    """AUTOINCREMENT: a deleted row's id is never handed out again (in-memory DB)."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    user = models.User(name="T", email="ids@test.dev", password_hash="h")
    db.add(user)
    db.commit()
    goal = models.Goal(user_id=user.id, title="G", target_role="R", timeline_days=7, current_skills=[])
    db.add(goal)
    db.commit()
    db.add_all([models.Task(goal_id=goal.id, title=f"T{i}", week=1, order=i) for i in range(3)])
    db.commit()
    top_id = max(t.id for t in db.query(models.Task).all())
    db.query(models.Task).filter(models.Task.id == top_id).delete()
    db.commit()
    fresh = models.Task(goal_id=goal.id, title="new", week=1, order=9)
    db.add(fresh)
    db.commit()
    assert fresh.id > top_id
    db.close()


def test_initial_migration_covers_all_tables():
    """The migration chain creates every mapped table (0001 baseline + follow-ups)."""
    versions_dir = Path(__file__).parent.parent / "alembic" / "versions"
    combined = "".join(p.read_text() for p in sorted(versions_dir.glob("*.py")))
    assert "0001_initial_schema" in combined
    for table in Base.metadata.tables:
        assert f'"{table}"' in combined, f"migrations missing table {table}"
    assert "ondelete=\"CASCADE\"" in combined or "ondelete='CASCADE'" in combined
