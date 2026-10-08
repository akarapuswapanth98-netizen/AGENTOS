# AGENTOS — turn a career goal into an executable, adaptive plan

[![CI](https://github.com/akarapuswapanth98-netizen/AGENTOS/actions/workflows/ci.yml/badge.svg)](https://github.com/akarapuswapanth98-netizen/AGENTOS/actions/workflows/ci.yml)

AGENTOS takes "become a backend developer in 28 days" and produces a week-by-week
plan of tasks, scores every answer with an AI validator, adds remedial work and
spaced-repetition reviews where you struggle, simulates interviews, and tracks a
single readiness number — with PDFs to prove it.

## Features

- Agents (Analyst, Planner, Validator/Coach): skill-gap analysis, plan generation,
  strict 0–100 answer scoring, coaching paragraphs.
- Plans and tasks with due dates, manual status edits, and re-planning that keeps
  completed work.
- Answer validation with remedial tasks plus a 5-round interview simulator.
- Resume analyzer (PDF/txt upload, skill detection, gap analysis, pre-filled goals).
- Spaced repetition reviews on a simplified Leitner-style 1/3/7/14-day schedule.
- Practice quizzes: 5 timed multiple-choice questions, server-side grading and clock.
- Streaks and badges (6 total) with a personal progress page.
- Due dates and overdue tracking with per-task flags.
- Task notes (private, never sent to the AI) and task search and filters.
- Weekly summary with coaching note, plus PDF exports (weekly and career report).
- Readiness model: five weighted categories plus a synthetic-data ML projection demo.
- Deployment support: Docker images, `/health` checks, production config guards.

## Architecture overview

```mermaid
flowchart LR
    UI[React 18 + Vite\nTailwind, Router, Axios] --> API[FastAPI\nrouters + JWT auth]
    API --> Agents[Plain-function agents\nAnalyst Planner Validator\nInterviewer Reporter Coach]
    Agents --> LLM[LLM provider\nAnthropic or Groq\nJSON mode + repair]
    Agents --> DB[(SQLite dev\nPostgres prod\nSQLAlchemy 2.0)]
    API --> DB
```

## How the agents work

AI parts: question generation, answer scoring, plan drafting, resume skill
detection, coaching paragraphs, and interview evaluation — every call goes
through one `call_llm_json` wrapper that demands JSON, retries once on bad
output, and falls back to deterministic mocks. Plain-code parts: readiness math,
streaks, spaced-repetition scheduling, quiz grading, PDF building, due-date and
overdue rules, rate limiting, and all CRUD. Rule of thumb: the LLM proposes,
plain code disposes — scores are validated, clamped, or rejected, never trusted raw.

## Local setup

```bash
# backend — SQLite quick start
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill keys, or keep USE_MOCK_LLM=true for demo
python -m app.ml.train     # after cloning: builds app/ml/readiness_model.joblib
USE_MOCK_LLM=true python scripts/seed_demo.py   # demo@agentos.dev / demo12345
uvicorn app.main:app --reload   # http://127.0.0.1:8000, docs at /docs

# Postgres with Docker
docker compose --profile postgres up --build -d db
# in backend/.env (never commit it):
# DATABASE_URL=postgresql+psycopg2://agentos:agentos@localhost:5432/agentos
cd backend && python -m alembic -c alembic.ini upgrade head

# frontend (second terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

## Running tests

```bash
cd backend && python -m pytest tests/ -q   # mock LLM, no network
cd frontend && npm run build
```

## Security notes

- Resume text, quiz answers, and interview replies travel inside delimiters with
  explicit ignore-embedded-instructions orders; validator scores are range-checked.
- Quiz answers and the quiz timer live server-side; the client never sees answers
  before submitting.
- Uploads are type- and size-checked (PDF magic bytes, 2 MB cap) and never saved.
- Every resource checks ownership (other users' rows read as 404); destructive
  account deletion requires the current password.
- Production refuses to start with a missing/short/placeholder JWT secret or a
  wildcard CORS origin. Health checks expose status only, never details.

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) (Render + Vercel, checklists, smoke test,
rollback). Docker images are built in CI but were not run locally here.

## Future work

Email reminders and spaced-repetition nudges, richer interviewer voices per role,
team/mentor views, Postgres-first production hardening, and observability
(structured logs, metrics, tracing).
