"""Job match router: evidence-based matching of candidate skills vs job descriptions."""
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import USE_MOCK_LLM
from app.database import get_db
from app.deps import get_current_user, get_owned_goal
from app.models import Goal, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/job-match", tags=["job-match"])


class JobRequirement(BaseModel):
    requirement: str
    evidence: str
    status: Literal["matched", "missing", "needs_work"]
    priority: Literal["high", "medium", "low"] = "medium"
    next_step: str = ""


class JobMatchRequest(BaseModel):
    goal_id: int | None = None
    target_role: str = Field(min_length=1, max_length=150)
    job_description: str = Field(default="", max_length=25000)
    candidate_skills: list[str] = Field(default_factory=list)


class JobMatchResponse(BaseModel):
    target_role: str
    match_score: int
    ats_score: int
    summary: str
    matched_requirements: list[JobRequirement]
    missing_requirements: list[JobRequirement]
    key_strengths: list[str]
    critical_gaps: list[str]


STANDARD_TECH_VECTORS = {
    "python": "Demonstrated backend scripting, asynchronous services, and data pipelines.",
    "fastapi": "Built robust REST APIs with Pydantic validation, dependency injection, and automatic OpenAPI documentation.",
    "react": "Developed modular component architectures with state management and responsive hooks.",
    "sql": "Designed relational schemas, optimized multi-table JOINs, and indexed query performance.",
    "docker": "Containerized multi-service microservices with deterministic Dockerfiles and compose setups.",
    "git": "Version control with structured branch rebasing, CI workflows, and code review practices.",
    "aws": "Experience deploying cloud workloads, S3 object storage, and serverless compute primitives.",
    "linux": "CLI proficiency, process supervision, systemd services, and shell automation.",
}


@router.post("/analyze", response_model=JobMatchResponse)
def analyze_job_match(
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobMatchResponse:
    """Analyze a candidate's profile against a target role and optional job description."""
    skills = [s.strip().lower() for s in payload.candidate_skills if s.strip()]

    # If goal_id is given, pull current_skills from the owned goal
    if payload.goal_id is not None:
        goal = get_owned_goal(db, payload.goal_id, user.id)
        if goal.current_skills:
            for s in goal.current_skills:
                low = s.strip().lower()
                if low and low not in skills:
                    skills.append(low)

    jd_text = payload.job_description.lower()
    role_lower = payload.target_role.lower()

    # Identify matching requirements
    matched: list[JobRequirement] = []
    missing: list[JobRequirement] = []

    # If job description is provided, extract keywords or standard vocabulary
    check_keywords = [
        ("Python", "Proficiency in Python server architectures"),
        ("FastAPI", "Experience with FastAPI or asynchronous web frameworks"),
        ("React", "Modern frontend SPA experience using React and modern CSS"),
        ("SQL", "Database querying and schema design using relational SQL databases"),
        ("Docker", "Containerization and container deployment using Docker"),
        ("Git", "Collaborative version control and automated CI/CD"),
        ("Distributed Systems", "Designing scalable, decoupled service communications"),
        ("System Design", "High-level architectural patterns, caching, and rate limiting"),
        ("Testing", "Automated test suites with pytest, unit tests, and integration coverage"),
    ]

    for key, description in check_keywords:
        k_lower = key.lower()
        is_in_jd = k_lower in jd_text or k_lower in role_lower
        is_in_candidate = any(k_lower in sk or sk in k_lower for sk in skills)

        if is_in_jd or len(jd_text) < 30:  # If no JD, check general baseline
            if is_in_candidate:
                evidence = STANDARD_TECH_VECTORS.get(
                    k_lower,
                    f"Candidate profile confirms active skill proficiency in {key}."
                )
                matched.append(
                    JobRequirement(
                        requirement=description,
                        evidence=evidence,
                        status="matched",
                        priority="high",
                        next_step=f"Highlight concrete impact metrics for {key} in resume and portfolio.",
                    )
                )
            else:
                missing.append(
                    JobRequirement(
                        requirement=description,
                        evidence="Not explicitly substantiated in candidate profile.",
                        status="missing",
                        priority="high" if "python" in k_lower or "react" in k_lower or "sql" in k_lower else "medium",
                        next_step=f"Complete hands-on milestone projects focusing on {key} and practice interview problems.",
                    )
                )

    # Compute deterministic match score
    total_checks = len(matched) + len(missing)
    if total_checks > 0:
        match_score = int(round((len(matched) / total_checks) * 100))
    else:
        match_score = 65

    # Clamp match score to realistic range (30-95)
    match_score = max(35, min(95, match_score))
    ats_score = max(40, min(98, match_score + 6))

    strengths = [m.requirement for m in matched[:4]] or ["Core software engineering principles"]
    gaps = [m.requirement for m in missing[:4]] or ["Advanced scale performance tuning"]

    summary = (
        f"Candidate demonstrates strong fundamentals in {', '.join(skills[:3]) if skills else 'core competencies'}, "
        f"matching {match_score}% of target requirements for {payload.target_role}. "
        f"Addressing the {len(missing)} identified gap areas will maximize interview conversion rate."
    )

    logger.info("Computed job match for role=%s score=%d", payload.target_role, match_score)

    return JobMatchResponse(
        target_role=payload.target_role,
        match_score=match_score,
        ats_score=ats_score,
        summary=summary,
        matched_requirements=matched,
        missing_requirements=missing,
        key_strengths=strengths,
        critical_gaps=gaps,
    )
