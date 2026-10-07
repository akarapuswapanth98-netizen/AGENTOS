"""Career report endpoints: JSON report card + downloadable PDF."""
import io
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy.orm import Session

from app.agents.reporter import generate_next_steps
from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import Goal, InterviewSession, SkillScore, Task, User
from app.schemas import ReportResponse
from app.utils.rate_limit import QuotaExceeded
from app.utils.readiness import compute_categories, projected_readiness, readiness_from

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/goals", tags=["report"])

CATEGORY_LABELS = {
    "technical_skills": "Technical Skills",
    "projects": "Projects",
    "problem_solving": "Problem Solving",
    "interview": "Interview",
    "communication": "Communication",
}


def _build_report(db: Session, goal: Goal, user_id: int | None = None) -> ReportResponse:
    """Assemble every report field for a goal (shared by JSON + PDF)."""
    tasks = db.query(Task).filter(Task.goal_id == goal.id).all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "completed")
    scored = [t.score for t in tasks if t.score is not None]
    avg: float | None = round(sum(scored) / len(scored), 1) if scored else None

    skill_rows = db.query(SkillScore).filter(SkillScore.goal_id == goal.id).all()
    weak = [r.skill for r in skill_rows if float(r.score) < 60]
    strong = [r.skill for r in skill_rows if float(r.score) >= 75]

    latest = (
        db.query(InterviewSession)
        .filter(InterviewSession.goal_id == goal.id, InterviewSession.status == "completed")
        .order_by(InterviewSession.id.desc())
        .first()
    )
    interview_score = int(latest.overall_score) if latest and latest.overall_score is not None else None

    categories = compute_categories(db, goal.id)
    try:
        steps = generate_next_steps(goal.target_role, categories, weak, strong, avg, interview_score, user_id=user_id)
    except QuotaExceeded:
        raise
    except Exception as exc:  # noqa: BLE001 - report must never break on LLM issues
        logger.error("Reporter failed for goal_id=%s: %s", goal.id, exc)
        raise HTTPException(status_code=502, detail=f"Report generation failed: {exc}") from exc

    return ReportResponse(
        goal_id=goal.id,
        readiness_score=readiness_from(categories),
        categories=categories,
        strong_areas=strong,
        weak_areas=weak,
        tasks_completed=completed,
        tasks_total=total,
        avg_score=avg,
        latest_interview_score=interview_score,
        projected_readiness=projected_readiness(categories),
        next_steps=steps,
    )


def _build_pdf(user_name: str, goal: Goal, report: ReportResponse) -> bytes:
    """Render the report card as a one-page-ish PDF. Returns raw bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    parts = [
        Paragraph("AGENTOS Career Report", styles["Title"]),
        Spacer(1, 0.4 * cm),
        Paragraph(f"{user_name} &mdash; {goal.title} ({goal.target_role})", styles["Normal"]),
        Paragraph(f"Date: {datetime.now().strftime('%Y-%m-%d')}", styles["Normal"]),
        Spacer(1, 0.4 * cm),
        Paragraph(f"Readiness score: {report.readiness_score} / 100", styles["Heading2"]),
        Spacer(1, 0.2 * cm),
        Paragraph("Category scores", styles["Heading3"]),
        Table(
            [["Category", "Score"]] + [[CATEGORY_LABELS.get(k, k), v] for k, v in report.categories.items()],
            colWidths=[9 * cm, 4 * cm],
            style=TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "grey"), ("BACKGROUND", (0, 0), (-1, 0), "lightgrey")]),
        ),
        Spacer(1, 0.4 * cm),
        Paragraph(f"Strong areas: {', '.join(report.strong_areas) or '—'}", styles["Normal"]),
        Paragraph(f"Weak areas: {', '.join(report.weak_areas) or '—'}", styles["Normal"]),
        Paragraph(
            f"Tasks: {report.tasks_completed}/{report.tasks_total} completed"
            + (f", average score {report.avg_score}" if report.avg_score is not None else ""), styles["Normal"],
        ),
        Spacer(1, 0.4 * cm),
        Paragraph("Recommended next steps", styles["Heading3"]),
    ]
    for i, step in enumerate(report.next_steps, 1):
        parts.append(Paragraph(f"{i}. {step}", styles["Normal"]))
    doc.build(parts)
    return buf.getvalue()


@router.get("/{goal_id}/report", response_model=ReportResponse)
def get_report(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ReportResponse:
    """Return the career report card as JSON."""
    goal = get_owned_goal(db, goal_id, user.id)
    return _build_report(db, goal, user_id=user.id)


@router.get("/{goal_id}/report/pdf")
def get_report_pdf(
    goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> StreamingResponse:
    """Return the career report card as a downloadable PDF."""
    goal = get_owned_goal(db, goal_id, user.id)
    report = _build_report(db, goal, user_id=user.id)
    pdf = _build_pdf(user.name, goal, report)
    logger.info("Built report PDF for goal_id=%s bytes=%d", goal_id, len(pdf))
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=agentos-report-goal-{goal_id}.pdf"},
    )
