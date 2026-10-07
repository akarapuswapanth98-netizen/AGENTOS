"""Shared auth + ownership dependencies for protected routes."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Goal, InterviewQuestion, InterviewSession, Task, User
from app.utils.security import decode_user_id

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Return the user for a valid Bearer token, else 401."""
    user_id = decode_user_id(creds.credentials) if creds else None
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def get_owned_goal(db: Session, goal_id: int, user_id: int) -> Goal:
    """Return a goal owned by the user, else 404 (hides other users' goals)."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


def get_owned_task(db: Session, task_id: int, user_id: int) -> tuple[Task, Goal]:
    """Return a task whose goal belongs to the user, else 404."""
    row = (
        db.query(Task, Goal)
        .join(Goal, Goal.id == Task.goal_id)
        .filter(Task.id == task_id, Goal.user_id == user_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return row[0], row[1]


def get_owned_session(db: Session, session_id: int, user_id: int) -> InterviewSession:
    """Return an interview session owned by the user, else 404."""
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Interview not found")
    return session


def get_owned_question(db: Session, session_id: int, question_id: int, user_id: int) -> InterviewQuestion:
    """Return a question belonging to the user's session, else 404."""
    get_owned_session(db, session_id, user_id)
    question = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.id == question_id, InterviewQuestion.session_id == session_id)
        .first()
    )
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return question
