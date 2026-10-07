"""Auth endpoints: register, login, profile, password change."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    AgentTrace,
    Goal,
    InterviewQuestion,
    InterviewSession,
    QuizAttempt,
    ReadinessSnapshot,
    ResumeAnalysis,
    ReviewItem,
    SkillScore,
    Submission,
    Task,
    User,
)
from app.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UpdateMeRequest,
    UserResponse,
)
from app.utils.security import create_access_token, hash_password, verify_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Create a new user account and return a JWT."""
    try:
        email = payload.normalized_email()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Registered user email=%s", email)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Verify credentials and return a JWT."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    logger.info("Login email=%s", email)
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    """Return the current user's profile."""
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
def update_me(payload: UpdateMeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> UserResponse:
    """Update the current user's display name."""
    user.name = payload.name.strip()
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> MessageResponse:
    """Change the current user's password after verifying the old one."""
    # Re-read the row so the hash check uses fresh data.
    fresh = db.query(User).filter(User.id == user.id).first()
    if fresh is None or not verify_password(payload.current_password, fresh.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")
    fresh.password_hash = hash_password(payload.new_password)
    db.add(fresh)
    db.commit()
    logger.info("Password changed for user_id=%s", user.id)
    return MessageResponse(message="Password updated")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    payload: DeleteAccountRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    """Delete the account and ALL of its data (rows only) after password check."""
    fresh = db.query(User).filter(User.id == user.id).first()
    if fresh is None or not verify_password(payload.password, fresh.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    goal_ids = [g.id for g in db.query(Goal.id).filter(Goal.user_id == user.id).all()]
    task_ids: list[int] = []
    if goal_ids:
        task_ids = [t.id for t in db.query(Task.id).filter(Task.goal_id.in_(goal_ids)).all()]
        session_ids = [s.id for s in db.query(InterviewSession.id).filter(InterviewSession.goal_id.in_(goal_ids)).all()]
        if session_ids:
            db.query(InterviewQuestion).filter(InterviewQuestion.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(InterviewSession).filter(InterviewSession.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(ReadinessSnapshot).filter(ReadinessSnapshot.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(ReviewItem).filter(ReviewItem.goal_id.in_(goal_ids)).delete(synchronize_session=False)
    if task_ids:
        db.query(Submission).filter(Submission.task_id.in_(task_ids)).delete(synchronize_session=False)
        db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
    if goal_ids:
        db.query(AgentTrace).filter(AgentTrace.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(SkillScore).filter(SkillScore.goal_id.in_(goal_ids)).delete(synchronize_session=False)
        db.query(Goal).filter(Goal.id.in_(goal_ids)).delete(synchronize_session=False)
    db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user.id).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.user_id == user.id).delete(synchronize_session=False)
    db.query(ReviewItem).filter(ReviewItem.user_id == user.id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()
    logger.info("Deleted account user_id=%s", user.id)
