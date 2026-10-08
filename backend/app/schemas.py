"""Pydantic v2 request/response schemas for AGENTOS."""
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TaskType = Literal["learn", "practice", "project", "remedial"]
TaskStatus = Literal["pending", "in_progress", "completed"]
GoalStatus = Literal["active", "completed"]


class GoalCreate(BaseModel):
    """Payload to create a new career goal."""

    title: str = Field(min_length=1, max_length=255)
    target_role: str = Field(min_length=1, max_length=255)
    timeline_days: int = Field(ge=1, le=365)
    current_skills: list[str] = Field(default_factory=list)


class GoalResponse(BaseModel):
    """A goal with its stored analysis."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    target_role: str
    timeline_days: int
    current_skills: list[str]
    status: str
    analysis: dict[str, Any] | None = None
    created_at: datetime


class TaskResponse(BaseModel):
    """A single plan task."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    title: str
    description: str
    week: int
    order: int
    task_type: str
    skill: str
    status: str
    score: int | None = None
    attempts: int
    due_date: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime


class TraceResponse(BaseModel):
    """One agent trace entry."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    agent_name: str
    message: str
    status: str
    created_at: datetime


class GoalWithPlanResponse(BaseModel):
    """Response for POST /goals: goal + generated tasks + trace."""

    goal: GoalResponse
    tasks: list[TaskResponse]
    trace: list[TraceResponse]


class GoalDetailResponse(BaseModel):
    """Response for GET /goals/{id}."""

    goal: GoalResponse
    tasks: list[TaskResponse]


class TaskStatusUpdate(BaseModel):
    """Manual status update payload."""

    status: TaskStatus


class TutorResponse(BaseModel):
    """Tutor agent output for a task."""

    task_id: int
    explanation: str
    example: str
    practice_questions: list[str]
    hints: list[str]


class SubmitRequest(BaseModel):
    """User answer submission. Empty strings allowed (validator scores them low)."""

    answer_text: str = Field(default="", max_length=20000)


class SubmitResponse(BaseModel):
    """Validator score + adaptive-plan side effects."""

    submission_id: int
    task_id: int
    score: int
    feedback: dict[str, Any]
    task_status: str
    remedial_task: TaskResponse | None = None
    message: str
    newly_earned_badges: list[str] = []


class SubmissionResponse(BaseModel):
    """One stored submission."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    answer_text: str
    score: int
    feedback: dict[str, Any]
    created_at: datetime


class SkillScoreItem(BaseModel):
    """Skill proficiency snapshot."""

    skill: str
    score: float


class ProgressResponse(BaseModel):
    """Progress/readiness summary (computed without LLM)."""

    completion_pct: float
    tasks_total: int
    tasks_completed: int
    tasks_pending: int
    avg_score: float | None
    skill_scores: list[SkillScoreItem]
    weak_areas: list[str]
    strong_areas: list[str]
    readiness_score: int
    categories: dict[str, float] = {}
    projected_readiness: int | None = None


class SnapshotResponse(BaseModel):
    """One daily readiness snapshot."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    date: date
    score: int


class ActiveGoalSummary(BaseModel):
    """Compact active-goal card for the dashboard."""

    id: int
    title: str
    target_role: str
    readiness_score: int


class DashboardResponse(BaseModel):
    """Cross-goal dashboard: today's/overdue tasks, weekly wins, streak."""

    today_tasks: list[TaskResponse]
    overdue_tasks: list[TaskResponse]
    overdue_count: int
    completed_this_week: int
    streak_days: int
    active_goal: ActiveGoalSummary | None = None


class ReportResponse(BaseModel):
    """Career report card for a goal."""
    goal_id: int
    readiness_score: int
    categories: dict[str, float]
    strong_areas: list[str]
    weak_areas: list[str]
    tasks_completed: int
    tasks_total: int
    avg_score: float | None
    latest_interview_score: int | None
    projected_readiness: int | None
    next_steps: list[str]


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str


def _valid_email(email: str) -> str:
    """Very small email sanity check (must contain @ and a dot)."""
    cleaned = email.strip().lower()
    if "@" not in cleaned or "." not in cleaned.split("@")[-1]:
        raise ValueError("Invalid email address")
    return cleaned


class RegisterRequest(BaseModel):
    """Payload to create a new user account."""

    name: str = Field(min_length=1, max_length=128)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    def normalized_email(self) -> str:
        """Return the validated, lowercased email."""
        return _valid_email(self.email)


class LoginRequest(BaseModel):
    """Payload to log in."""

    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """JWT access token returned on register/login."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Public user profile (never includes the password hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    created_at: datetime


class UpdateMeRequest(BaseModel):
    """Payload to update the user's display name."""

    name: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    """Payload to change the user's password."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    """Simple {message} acknowledgement."""

    message: str


class GoalUpdate(BaseModel):
    """Editable goal fields; at least one must be provided."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    target_role: str | None = Field(default=None, min_length=1, max_length=255)
    timeline_days: int | None = Field(default=None, ge=1, le=365)


class DeleteAccountRequest(BaseModel):
    """Account deletion requires confirming the current password."""

    password: str = Field(min_length=1, max_length=128)


class InterviewCreateRequest(BaseModel):
    """Payload to start an interview for a goal."""

    goal_id: int


class InterviewAnswerRequest(BaseModel):
    """Payload answering one interview question."""

    answer_text: str = Field(default="", max_length=20000)


class InterviewQuestionResponse(BaseModel):
    """One interview question with its answer/score, if given."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    round_name: str
    question_text: str
    order: int
    skill: str
    answer_text: str | None = None
    score: int | None = None
    feedback: dict[str, Any] | None = None


class InterviewAnswerResponse(BaseModel):
    """Per-answer evaluation result."""

    question_id: int
    score: int
    strengths: list[str]
    missing: list[str]
    feedback: str


class InterviewSessionResponse(BaseModel):
    """An interview session with its questions and per-round averages."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int
    role: str
    status: str
    overall_score: int | None = None
    created_at: datetime
    completed_at: datetime | None = None
    questions: list[InterviewQuestionResponse] = []
    round_scores: dict[str, float] = {}


class ResumeAnalysisResponse(BaseModel):
    """One stored resume analysis."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int | None = None
    detected_skills: list[str]
    skill_gaps: list[str]
    score: int
    feedback: list[str]
    created_at: datetime


class ReviewItemResponse(BaseModel):
    """One spaced-repetition review item."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int | None = None
    skill: str
    stage: int
    due_date: date
    last_score: int | None = None
    last_reviewed_at: datetime | None = None
    created_at: datetime


class ReviewDueResponse(BaseModel):
    """Due review items plus a count for the dashboard badge."""

    items: list[ReviewItemResponse]
    count: int


class ReviewQuestionResponse(BaseModel):
    """A fresh practice question (not stored server-side)."""

    item_id: int
    skill: str
    question: str


class ReviewAnswerRequest(BaseModel):
    """Answer a review question; question_text is echoed back by the client."""

    question_text: str = Field(default="", max_length=20000)
    answer_text: str = Field(default="", max_length=20000)


class ReviewAnswerResponse(BaseModel):
    """Review score, feedback, and the next due date."""

    item_id: int
    score: int
    feedback: dict[str, Any]
    stage: int
    next_due_date: date
    newly_earned_badges: list[str] = []


class QuizStartRequest(BaseModel):
    """Start a quiz for a skill, optionally linked to a goal."""

    skill: str = Field(min_length=1, max_length=60)
    goal_id: int | None = None


class QuizQuestionPublic(BaseModel):
    """One question without the answer or explanation."""

    question: str
    options: list[str]


class QuizStartResponse(BaseModel):
    """New attempt id plus answer-free questions."""

    id: int
    skill: str
    questions: list[QuizQuestionPublic]
    time_limit_seconds: int


class QuizSubmitRequest(BaseModel):
    """Five answers (0-3) or null for skipped questions."""

    answers: list[int | None] = Field(min_length=5, max_length=5)

    @field_validator("answers")
    @classmethod
    def _in_range(cls, values: list[int | None]) -> list[int | None]:
        """Each answer must be 0-3 or null (skipped)."""
        for v in values:
            if v is not None and (not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= 3):
                raise ValueError("Each answer must be 0-3 or null")
        return values


class QuizResultItem(BaseModel):
    """Per-question grading with the correct answer and explanation."""

    question: str
    options: list[str]
    your_answer: int | None
    correct_index: int
    correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    """Quiz score, per-question results, timeout flag, review side effect."""

    id: int
    score: int
    results: list[QuizResultItem]
    timed_out: bool
    elapsed_seconds: int
    review_created: bool


class QuizHistoryItem(BaseModel):
    """One submitted attempt for the history list."""

    id: int
    skill: str
    score: int
    elapsed_seconds: int
    timed_out: bool
    submitted_at: datetime | None = None


class QuizAttemptResponse(BaseModel):
    """One attempt; answers included only after submission."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    goal_id: int | None = None
    skill: str
    questions: list[dict[str, Any]]
    answers: list[int | None] | None = None
    score: int | None = None
    status: str
    started_at: datetime
    submitted_at: datetime | None = None
    elapsed_seconds: int | None = None
    timed_out: bool


class EarnedBadge(BaseModel):
    """One earned badge with its award date."""

    badge: str
    awarded_at: datetime


class LockedBadge(BaseModel):
    """One unearned badge with its how-to-earn hint."""

    badge: str
    hint: str


class MeProgressResponse(BaseModel):
    """Streaks plus earned and locked badges for the current user."""

    current_streak: int
    longest_streak: int
    earned: list[EarnedBadge]
    locked: list[LockedBadge]
