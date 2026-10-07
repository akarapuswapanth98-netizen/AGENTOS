# AGENTOS — AI career planner that turns a goal into an executable, adaptive plan.

## Problem

Career changers drown in generic advice: tutorials with no order, no feedback,
and no sense of readiness. AGENTOS turns "become a backend developer in 28 days"
into a week-by-week plan, scores every answer with an AI validator, adds remedial
work where you struggle, simulates interviews, and tracks a single readiness number.

## Architecture (text)

```
Browser (React 18 + Vite, :5173)
   |  Axios + JWT (localStorage), toasts, SVG charts (no chart lib)
   v
FastAPI (:8000, CORS for :5173/:3000)
   +-- routers/auth.py        register / login / me / change-password / delete
   +-- routers/goals.py       CRUD + replan + PATCH + trace + task listing
   +-- routers/tasks.py       tutor / submit (validator + remedial) / history
   +-- routers/interviews.py  5 rounds x 2 questions, answer, complete
   +-- routers/progress.py    5-category readiness + snapshot history
   +-- routers/report.py      JSON report card + reportlab PDF
   +-- routers/dashboard.py   today/overdue tasks, streak, active goal
        |
        v
   Agents (plain functions, NO LangGraph): analyst / planner / tutor /
   validator / interviewer / reporter via llm.py (anthropic|groq,
   JSON repair, USE_MOCK_LLM fallback, per-user hourly quota -> 429)
        v
   SQLite (SQLAlchemy 2.0): users -> goals -> tasks -> submissions,
   traces, skill scores, interview sessions/questions, readiness snapshots
```

## Features

- JWT auth with per-user ownership on every resource (404 otherwise).
- Analyst -> Planner pipeline with trace timeline and plan sanity checks.
- Tutor explanations, strict validator scoring, one-shot remedial tasks.
- 5-round interview simulator feeding back into skill scores.
- Readiness engine: 5 weighted categories, streaks, trend snapshots, synthetic-data ML projection.
- Report card (JSON + PDF), plan re-planning, goal editing, settings, toasts, 30→60/hr AI quota guard.

## Tech stack

Backend: Python 3.11+, FastAPI, Uvicorn, SQLite + SQLAlchemy 2.0, Pydantic v2,
Anthropic SDK + OpenAI SDK (Groq), bcrypt, PyJWT, scikit-learn, reportlab, pytest.
Frontend: React 18, Vite, Tailwind CSS, React Router v6, Axios. No UI/chart libraries.

## Local setup

```bash
# backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill keys, or keep USE_MOCK_LLM=true for demo
python -m app.ml.train     # after cloning: builds app/ml/readiness_model.joblib
USE_MOCK_LLM=true python scripts/seed_demo.py   # demo@agentos.dev / demo12345
uvicorn app.main:app --reload   # http://127.0.0.1:8000, docs at /docs

# frontend (second terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Tests (mock LLM, no network): `cd backend && python -m pytest tests/ -q`.
Frontend build: `cd frontend && npm run build`.

## Docker setup

```bash
cp backend/.env.example backend/.env   # fill real values (never commit .env)
docker compose up --build
# frontend http://localhost:5173, backend http://127.0.0.1:8000
```

The backend image regenerates the ML model at build time (`python -m app.ml.train`)
because `*.joblib` is gitignored. SQLite persists in the `agentos-data` volume.
Docker files are written but untested here (Docker is not installed in this environment).

## Demo credentials

Email `demo@agentos.dev`, password `demo12345` (via the seed script above):
one goal, finished plan, scored submissions including a remedial task, a completed
interview (80), and 14 days of rising snapshots.

## Limitations (honest)

- LLM scoring is approximate: prompts ask for 0-100 integers, but small models
  sometimes answer on other scales; the validator retries once, then raises.
- The ML readiness model trains on synthetic data: a plumbing demo, not a
  validated predictor of real outcomes.
- SQLite is for demo/small-team use; no connection pooling story.
- The in-memory AI rate limit resets on restart and is per-process.

## Future work

PostgreSQL, Alembic migrations, LangGraph orchestration, email reminders,
production deployment (managed DB, secret store, HTTPS, observability).
