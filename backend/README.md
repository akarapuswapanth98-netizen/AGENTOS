# AGENTOS — AI Career Planning Backend

Multi-user FastAPI + SQLite + SQLAlchemy 2.0 backend that turns a career goal
into an executable plan, tutors the user, validates answers, adapts with
remedial tasks, simulates interviews, and tracks readiness.

## Setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: pick LLM_PROVIDER=anthropic (ANTHROPIC_API_KEY) or groq
# (GROQ_API_KEY + GROQ_MODEL_NAME, default openai/gpt-oss-20b),
# or keep USE_MOCK_LLM=true for a no-network demo
```

## Configuration

All settings come from `backend/.env` (see `.env.example`). LLM options:

- `LLM_PROVIDER=anthropic|groq` — which API `call_llm_json` uses.
- `GROQ_MODEL_NAME` — if Groq returns 404, the logs say exactly this: the
  model name is wrong or retired, so update it in `backend/.env`
  (see console.groq.com/docs/models). The app keeps working via mock fallback.
- `GROQ_MAX_TOKENS` (default 4000) — Groq-only limit so long plans from
  reasoning models are not cut off. The Anthropic path stays at 2000.
- `python scripts/check_llm_config.py` prints the effective provider, model,
  `max_tokens`, and key set/missing without ever showing secrets.

## Run

```bash
cd backend
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Tests

```bash
cd backend
USE_MOCK_LLM=true python -m pytest tests/ -q
```

Demo data: `USE_MOCK_LLM=true python scripts/seed_demo.py` creates
`demo@agentos.dev / demo12345` (goal, submissions incl. remedial, interview,
14-day snapshots). Live checks: `python scripts/check_llm_config.py` (safe),
`python scripts/test_llm_live.py` (real calls, run yourself).

## Example curl

```bash
BASE=http://127.0.0.1:8000

# health
curl $BASE/health

# create goal (runs Analyst -> Planner)
curl -X POST $BASE/goals -H "Content-Type: application/json" -d '{
  "title": "Become backend developer",
  "target_role": "Backend Developer",
  "timeline_days": 28,
  "current_skills": ["python", "sql"]
}'

# list goals
curl $BASE/goals

# goal detail
curl $BASE/goals/1

# trace
curl $BASE/goals/1/trace

# tasks (optional ?status=pending|in_progress|completed)
curl "$BASE/goals/1/tasks?status=pending"

# task detail
curl $BASE/tasks/1

# manual status update
curl -X PATCH $BASE/tasks/1 -H "Content-Type: application/json" -d '{"status":"in_progress"}'

# tutor
curl -X POST $BASE/tasks/1/tutor

# submit answer (low score -> remedial task; high score -> completed)
curl -X POST $BASE/tasks/1/submit -H "Content-Type: application/json" -d '{"answer_text":"idk"}'
curl -X POST $BASE/tasks/1/submit -H "Content-Type: application/json" -d '{"answer_text":"REST APIs use ... (a few sentences with an example)"}'

# submissions
curl $BASE/tasks/1/submissions

# progress
curl $BASE/goals/1/progress

# delete goal
curl -X DELETE $BASE/goals/1
```

## Architecture (text diagram)

```
Client (localhost:5173 / :3000)
        |  HTTP/JSON
        v
  FastAPI (app/main.py, CORS, routers)
   +-- routers/goals.py    POST/GET/DELETE /goals, /trace, /tasks
   +-- routers/tasks.py    GET/PATCH /tasks, /tutor, /submit, /submissions
   +-- routers/progress.py GET /goals/{id}/progress (pure Python math)
        |
        v
  Agents (plain functions, no LangGraph)
   orchestrator.py -> analyst.py -> planner.py
                   -> tutor.py / validator.py (per-task)
        |  via agents/llm.py (call_llm_json, 30s timeout, JSON repair,
        |                     USE_MOCK_LLM fallback) + utils/json_utils.py
        v
  SQLite (SQLAlchemy ORM, app/models.py)
   Goal -> Task -> Submission | AgentTrace | SkillScore
```

Adaptive loop (`POST /tasks/{id}/submit`): save Submission, bump
`attempts`, set `score`, complete if >= 60 else `in_progress`, update
`SkillScore` as `0.6*old + 0.4*new`, create one `remedial` task from the
validator's `missing` list (skip if one is already pending), write a trace.

## Readiness engine

Readiness is a weighted sum of five 0-100 categories: Technical Skills (0.30,
average SkillScore), Projects (0.20, project-task completion), Problem Solving
(0.20, practice-task scores), Interview (0.20, latest interview score, 0 if
none), Communication (0.10, average validator `clarity`). Missing data falls
back to overall completion/averages, else 0. `GET /dashboard` returns today's
and overdue tasks (from per-week `due_date`s), weekly completions, and the
activity streak; daily snapshots feed `GET /goals/{id}/history`.

### ML projection (demonstration only)

`backend/app/ml/train.py` trains a small `GradientBoostingRegressor` on
**synthetic** data (random category scores mapped through the same weighted
formula plus noise) and saves `app/ml/readiness_model.joblib`. The progress
response exposes its prediction as `projected_readiness` (null when the file
is missing). This is a plumbing demo, **not a validated predictor** of real
learning outcomes.

## Future work

- PostgreSQL + Alembic migrations
- LangGraph migration (graph-based orchestration, retries, human-in-the-loop)
- Email reminders, production deployment (secret store, HTTPS, observability)
