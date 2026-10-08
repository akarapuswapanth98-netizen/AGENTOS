"""Resume endpoints: upload + analyze, latest analysis."""
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.agents.analyst import run_resume_analysis
from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import ResumeAnalysis, User
from app.schemas import ResumeAnalysisResponse
from app.utils.badges import check_and_award_badges
from app.utils.rate_limit import QuotaExceeded
from app.utils.resume_text import extract_resume_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    goal_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ResumeAnalysisResponse:
    """Analyze an uploaded resume PDF/txt against an optional goal."""
    goal_skills: list[str] = []
    if goal_id is not None:
        goal = get_owned_goal(db, goal_id, user.id)
        goal_skills = list(goal.current_skills or [])
    try:
        result = run_resume_analysis(await extract_resume_text(file), goal_skills, user_id=user.id)
    except QuotaExceeded:
        raise
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Resume analysis failed")
        raise HTTPException(status_code=502, detail=f"Resume analysis failed: {exc}") from exc
    row = ResumeAnalysis(
        user_id=user.id,
        goal_id=goal_id,
        detected_skills=result["detected_skills"],
        skill_gaps=result["skill_gaps"],
        score=result["resume_score"],
        feedback=result["feedback"],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    check_and_award_badges(db, user.id)  # resume_uploaded badge (no new activity day)
    logger.info("Stored resume analysis id=%s score=%s", row.id, row.score)
    return ResumeAnalysisResponse.model_validate(row)


@router.get("/latest", response_model=ResumeAnalysisResponse)
def latest_analysis(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ResumeAnalysisResponse:
    """Return the user's most recent resume analysis."""
    row = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == user.id)
        .order_by(ResumeAnalysis.id.desc())
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="No resume analysis found")
    return ResumeAnalysisResponse.model_validate(row)
