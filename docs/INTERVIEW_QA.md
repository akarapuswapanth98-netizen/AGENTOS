# AGENTOS interview Q&A

## What's different from ChatGPT?

ChatGPT answers questions; AGENTOS runs a loop around your goal. It generates a
week-by-week plan, scores your answers with a strict rubric, creates remedial
tasks and spaced reviews when you score low, and tracks one readiness number over
time. Every AI output lands in a stored artifact — a task, a score, a trace row,
a PDF — so progress compounds instead of evaporating when the chat scrolls away.
The trade-off is scope: it only understands the career-prep workflow it was built
for, while ChatGPT handles anything.

## Which parts are AI vs normal code?

AI writes and judges text: plan drafts, tutor explanations, answer scores,
resume skill detection, interview questions, coaching notes. Normal code does
everything structural: readiness math, streaks, the 1/3/7/14-day review schedule,
quiz grading (correct/5 × 100), PDF layout, due-date rules, auth, rate limiting,
and all CRUD. The boundary is deliberate and visible in the codebase: agents live
in `app/agents/`, deterministic logic in `app/utils/`, and one `call_llm_json`
wrapper sits between them handling JSON repair and mock fallbacks.

## How does the validator score and how reliable is it?

It prompts for an integer 0–100 plus a four-field breakdown, rejects empty or
tiny answers with a low fast-path score, then validates the returned score is
actually on the 0–100 scale — retrying once with a correction, then raising
instead of silently rescaling. It is approximately fair, not precise: small
models sometimes answer on a 0–10 scale or ramble, strictness drifts between
calls, and there is no calibration against human graders. Treat scores as
directional feedback (weak vs strong, improving vs stuck), never as grades.

## How does spaced repetition work?

Each weak skill gets a review item at stage 0, due tomorrow. Scoring 70 or more
climbs one stage through fixed 1, 3, 7, then 14-day waits; anything lower resets
to stage 0. Saying this plainly: it is a simplified Leitner-style schedule, not
SM-2 — there is no easiness factor, no per-card adaptation, and intervals never
shrink except by full reset. It is easy to explain and test, which is why this
project chose it over the real algorithm.

## How do you stop prompt injection from resumes and answers?

Three layers, none trusted alone. First, untrusted text travels inside explicit
delimiters with an order to ignore embedded instructions (resumes, quiz skills,
review questions and answers all use this). Second, outputs are shape- and
range-validated — a coerced "score 100" or missing field triggers retry, then a
safe fallback, never silent acceptance. Third, high-stakes paths keep secrets and
answers server-side: quiz correct answers never leave the server until grading,
and the timer is computed from stored timestamps, not client claims. None of this
makes injection impossible; it makes successful injection unprofitable.

## How does CI work and what did it catch?

Three backend runs (SQLite suite, Postgres suite against a service container with
migrations applied, plus model training first) and one frontend build, all on
push and pull requests with dummy-only secrets. It caught real issues: an
unpinned `python-multipart` that crashed test collection on fresh machines, a
test asserting on the gitignored ML model file that only existed locally, and a
health-check test that deleted the shared DB override and poisoned every later
test in the process. Each fix was one line plus a regression test.

## What would you build next?

Email reminders for due reviews (the one loop still open — everything else the
app tracks, nothing nudges you back). Then per-role interviewer voices with
calibrated rubrics, since generic strictness is the weakest scoring link. Then
mentor views over the existing progress endpoints, and Postgres-first production
hardening with structured logs and metrics. Deliberately not next: more agents —
the current six cover the workflow and each new one doubles the prompt surface.

## What was the hardest bug?

A test that deleted FastAPI's shared test-database override in its cleanup,
silently redirecting every later test in the process onto the real dev database.
Symptoms shifted per run — missing tables one day, duplicate-email collisions the
next — because they depended on whatever the dev database happened to contain.
The fix was restoring the override instead of deleting it, and the lesson stuck:
shared test fixtures must be restored, never removed, and cross-run mysteries
usually mean the isolation boundary moved, not the code.
