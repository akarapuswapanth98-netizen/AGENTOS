"""Cross-goal exports: career report PDF reusing the per-goal report builder."""
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import Goal, User
from app.routers.report import _build_pdf, _build_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/career/pdf")
def career_pdf(
    goal_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Career report PDF for one goal (latest by default), built in memory."""
    if goal_id is None:
        goal = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.id.desc()).first()
        if goal is None:
            raise HTTPException(status_code=404, detail="No goals to report on")
    else:
        goal = get_owned_goal(db, goal_id, user.id)
    report = _build_report(db, goal, user_id=user.id)
    pdf = _build_pdf(user.name, goal, report)
    logger.info("Built career PDF goal_id=%s bytes=%d", goal.id, len(pdf))
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=career-report.pdf"},
    )
