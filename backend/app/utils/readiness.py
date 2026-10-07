"""Five-category readiness engine (pure Python) + daily snapshots + ML projection."""
import logging
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Goal, InterviewSession, ReadinessSnapshot, SkillScore, Submission, Task

logger = logging.getLogger(__name__)

# Category weights; must sum to 1.0.
WEIGHTS = {
    "technical_skills": 0.30,
    "projects": 0.20,
    "problem_solving": 0.20,
    "interview": 0.20,
    "communication": 0.10,
}

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "readiness_model.joblib"
_model = None  # Lazy-loaded GradientBoostingRegressor; None when the file is missing.


def _avg(values: list[float]) -> float:
    """Mean of a list, 0.0 when empty (handles division by zero)."""
    return sum(values) / len(values) if values else 0.0


def compute_categories(db: Session, goal_id: int) -> dict[str, float]:
    """Compute the five 0-100 readiness categories for a goal.

    Missing data falls back to a sensible default (overall completion or
    average, else 0) so a fresh goal scores 0 instead of crashing.
    """
    tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
    completed = [t for t in tasks if t.status == "completed"]
    completion_pct = len(completed) / len(tasks) * 100 if tasks else 0.0
    scored = [float(t.score) for t in tasks if t.score is not None]

    skill_rows = db.query(SkillScore).filter(SkillScore.goal_id == goal_id).all()
    technical = _avg([float(r.score) for r in skill_rows])

    project_tasks = [t for t in tasks if t.task_type == "project"]
    if project_tasks:
        done = sum(1 for t in project_tasks if t.status == "completed")
        projects = done / len(project_tasks) * 100
    else:
        projects = completion_pct  # No project tasks: use overall completion.

    practice_scores = [float(t.score) for t in tasks if t.task_type == "practice" and t.score is not None]
    problem_solving = _avg(practice_scores) if practice_scores else _avg(scored)

    latest = (
        db.query(InterviewSession)
        .filter(InterviewSession.goal_id == goal_id, InterviewSession.status == "completed")
        .order_by(InterviewSession.id.desc())
        .first()
    )
    interview = float(latest.overall_score) if latest and latest.overall_score is not None else 0.0

    task_ids = [t.id for t in tasks]
    clarity: list[float] = []
    if task_ids:
        for sub in db.query(Submission).filter(Submission.task_id.in_(task_ids)).all():
            try:
                clarity.append(float((sub.feedback or {}).get("breakdown", {}).get("clarity", 0)))
            except (TypeError, ValueError):
                continue
    communication = _avg(clarity)

    return {
        "technical_skills": round(technical, 1),
        "projects": round(projects, 1),
        "problem_solving": round(problem_solving, 1),
        "interview": round(interview, 1),
        "communication": round(communication, 1),
    }


def readiness_from(categories: dict[str, float]) -> int:
    """Weighted sum of the five categories, rounded to 0-100."""
    total = sum(categories.get(name, 0.0) * w for name, w in WEIGHTS.items())
    return max(0, min(100, int(round(total))))


def _load_model():
    """Load the sklearn model once; return None when the file is missing."""
    global _model
    if _model is None:
        try:
            import joblib

            _model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
        except Exception as exc:  # noqa: BLE001 - projection is optional
            logger.warning("Could not load readiness model: %s", exc)
            _model = None
    return _model


def projected_readiness(categories: dict[str, float]) -> int | None:
    """Predict end-of-timeline readiness with the demo model; None if unavailable.

    The model is trained on SYNTHETIC data (see backend/ml/train.py) and is a
    demonstration, not a validated predictor.
    """
    model = _load_model()
    if model is None:
        return None
    try:
        features = [[categories.get(name, 0.0) for name in WEIGHTS]]
        pred = float(model.predict(features)[0])
        return max(0, min(100, int(round(pred))))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Readiness projection failed: %s", exc)
        return None


def record_snapshot(db: Session, goal_id: int) -> int:
    """Save (or update) today's readiness snapshot for a goal. Returns the score."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if goal is None:
        return 0
    score = readiness_from(compute_categories(db, goal_id))
    today = date.today()
    row = db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id == goal_id, ReadinessSnapshot.date == today).first()
    if row is None:
        row = ReadinessSnapshot(goal_id=goal_id, date=today, score=score)
    else:
        row.score = score
    db.add(row)
    db.commit()
    return score
