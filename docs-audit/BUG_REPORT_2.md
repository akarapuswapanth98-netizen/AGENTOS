# AGENTOS Re-Audit — after the `fix-bugs-batch` fixes

Date: 2026-10-08. Branch: `fix-bugs-batch` @ `436441f` (11 commits on top of
`cf0892b`). Read-only: nothing was edited, committed, pushed, merged or
tagged. Only this file was created, and it is untracked.

Method: uvicorn on port 8765 against a throwaway SQLite DB in
`%TEMP%/agentos-audit2` with `USE_MOCK_LLM=true` and `alembic upgrade head`;
157 black-box HTTP checks as user A and user B; the **real axios 1.20.0
request pipeline** replayed in Node (this is what caught NEW-01); 139 pytest;
Vite production build. `backend/.env` was never opened.

Scale: 157 HTTP checks (154 pass, 3 were my own wrong expectations — explained
below), 18 cross-user isolation checks, 44-route unauthenticated sweep, 9-case
axios pipeline simulation, 139 pytest, Vite build clean.

---

## Part 0 — the previous 10 findings

| ID | Severity | Status | Evidence |
|----|----------|--------|----------|
| BUG-01 | High | **STILL BROKEN** (new root cause) | The interceptor fix is undone further down the axios pipeline. `frontend/node_modules/axios/lib/core/dispatchRequest.js:48-50` (axios 1.20.0, the version in `package-lock.json`) runs **after** request interceptors and adds `Content-Type: application/x-www-form-urlencoded` to every post/put/patch whose Content-Type is missing. `config.headers.delete('Content-Type')` (`frontend/src/api/client.js:19`) leaves the header absent, so axios re-adds the wrong one. The browser XHR adapter only clears Content-Type when the body is `undefined` (`axios/lib/adapters/xhr.js:202`); the FormData clearing in `axios/lib/helpers/resolveConfig.js:71` is **React Native only**. Node replay of the real pipeline: `POST /resume/analyze` reaches the adapter as `FormData` with `Content-Type: application/x-www-form-urlencoded`. Live request with exactly that header + a real multipart body: **422 `{"type":"missing","loc":["body","file"],"msg":"Field required"}`** — the original symptom. Same body with `multipart/form-data; boundary=…`: **200**. See NEW-01. |
| BUG-02 | Medium | **VERIFIED FIXED** (static) | `Dashboard.jsx:158-181`: the card renders a plain `<div>` reading "Nothing overdue" when `overdue_tasks.length === 0`, and a `<Link to={/goals/${goal_id}?filter=overdue}>` only when there is one. No `to="/"` remains in the file; build passes. The click behaviour itself needs a browser. |
| BUG-03 | Medium | **VERIFIED FIXED** (static) | `GoalDetail.jsx:133-138` builds `filterLabel` from query text, skill and overdue; line 245 renders `{searchTotal} match…{filterLabel ? ` for ${filterLabel}` : ''}`. `for “{searchQ}”` is gone. |
| BUG-04 | Medium | **VERIFIED FIXED** (request + static) | `GoalDetail.jsx:121-131` now sends `status` and `overdue` to `/tasks/search`. Live: `GET /tasks/search?status=pending&overdue=true&goal_id=1` → 200 and correctly filtered; `?status=in_progress` + `?skill=sql&status=completed` also 200. Edge case noted as NEW-08. |
| BUG-05 | Low | **VERIFIED FIXED** (static) | `Quiz.jsx:37-39,64-66,79`: `sendingRef` is set before the first `await` and cleared in `finally`, so the second click returns early. Same guard covers the timer auto-submit. |
| BUG-06 | Low | **VERIFIED FIXED** (static) | `Review.jsx:22-27,67` and `Dashboard.jsx:73-78,124` take `quiet = false` and skip `setLoading` for background refreshes. Both `onRetry` handlers were changed to `() => load()` so the click event cannot be mistaken for `quiet`. |
| BUG-07 | Low | **VERIFIED FIXED** (confirmed) | `grep` for `getQuiz(\|getLatestResume\|updateTaskStatus` in `frontend/src` returns nothing (only `getQuizHistory` on `Quiz.jsx:45`, a different function). Vite build clean, so no dangling reference. Consequence tracked as NEW-04. |
| BUG-08 | Low | **VERIFIED FIXED** (static) | `Settings.jsx:21-26`: `useEffect(() => { if (user?.name) setName(user.name) }, [user?.name])`. Keyed on the value, so typing is not clobbered. Needs a browser to see the slow-auth case. |
| BUG-09 | Low | **VERIFIED FIXED** (static) | `GoalDetail.jsx:112-118`: the filter fetch now calls `setError(getErrorMessage(err, 'Could not load tasks'))` instead of `.catch(() => {})`. |
| BUG-10 | Low | **VERIFIED FIXED** (static) | `TaskDetail.jsx:26,45-48,58-60,150-157`: `savingDue` guards `saveDueDate`, and both Save and Clear are `disabled={savingDue}` with a "Saving…" label. |

**Old findings: 1 still broken (BUG-01), 9 verified fixed.** The two
"VERIFIED FIXED (static)" notes mean the code path is correct but only a
browser can exercise the pixels; everything marked "request" was proved with a
live HTTP call.

### BUG-01 replay, exactly as requested

| Request | Result |
|---------|--------|
| `POST /resume/analyze` multipart, part `file`, **no manual Content-Type**, upload #1 | **200** (score 40) |
| the same request again, upload #2 | **200** |
| same with a real reportlab PDF | **200** |
| same with `goal_id` omitted | **200** |
| same with a valid `goal_id` | **200** |
| same body, header forced to `application/x-www-form-urlencoded` (what the browser now sends) | **422 Field required** |
| same body, no Content-Type at all | **422 Field required** |
| same body, `multipart/form-data; boundary=…` | **200** |

The first five rows pass because httpx, like a browser, generates the correct
multipart header. That is exactly why the fix batch's verification was green:
the axios layer was never exercised. Row six is what the browser does today.

---

## Part A — backend black-box results

**157 checks, 154 pass.** The three non-passes were wrong expectations in my
script, not app defects:

| Check | My expectation | Actual | Verdict |
|-------|----------------|--------|---------|
| `GET /goals/{id}/tasks?status=all` | 200 | 422 `Invalid status filter` | Backend accepts only pending/in_progress/completed (`tasks.py:56-57`). The client omits the param for `all`, so the UI is unaffected → NEW-06. |
| `POST /tasks/{id}/submit {"answer_text": ""}` | 422 | 200, score 10 | Schema default (`schemas.py:118`) → NEW-02 / NEW-03. |
| `POST /interviews/{sid}/questions/{qid}/answer {"answer_text": "x"}` | 422 | 200, score 25 | Schema default (`schemas.py:309`) → NEW-02 / NEW-03. |

Everything else passed, including:

- **auth** — register 201 (token + `token_type: bearer`), duplicate email 400,
  bad password 401, unknown email 401, `/auth/me` 200, rename 200, empty name
  422, change-password 200 + wrong-current 401, and four malformed tokens
  (`garbage.token.here`, `Bearer`, `a.b.c`, and a token sent without the
  `Bearer ` prefix) all 401.
- **goals** — create with and without skills (12 tasks each), `timeline_days=0`
  422, empty title 422, list, detail, 404 for a missing id, replan, patch,
  patch `{}` 422, trace, per-status task filters, `status=bogus` 422,
  progress, history, report, report PDF (`%PDF-`).
- **tasks** — detail carries all 18 fields the UI reads; status patch + bogus
  422; due-date set/clear/`yesterday` 422; note trim, clear, 2000 chars,
  2001 chars 422; **search** with `q`, `%` literal, `_` literal (both match the
  stored note), `skill`, `status`, `overdue`, combinations, pagination,
  `goal_id`, `q` > 200 chars 422, `limit=500` 422, `offset=-1` 422,
  bad status 422; tutor returns exactly 3 practice questions.
- **validator** — weak answer scores 10 and creates a remedial task, strong
  answer scores 85 and completes the task, score always in 0..100,
  `newly_earned_badges` present, submissions listed.
- **resume** — txt ×2, PDF, goal_id omitted/valid, empty `goal_id` string,
  wrong type 415, fake PDF 415, empty file 400, >2 MB 413, no file 422,
  `/resume/latest` 200.
- **reviews** — `/reviews/due` shape; a backdated item (written directly into
  the temp DB) then start → answer → `/reviews/due` returns 0; a second answer
  on the same item is accepted; unknown item 404 for both routes.
- **quizzes** — start 201 with exactly 5 questions and **no `correct_index`
  leak**; `GET /quizzes/{id}` also hides it; 5/5 → 100; all-skipped → 0; wrong
  length 422; too long 422; double submit 409; unknown id 404; history list;
  result carries `correct_index`, `explanation`, `timed_out`, `review_created`.
- **me/reports** — `/me/progress`, `/me/overdue`, `/dashboard`,
  `/me/weekly-summary` offsets 0 and 1, and 13 / -1 / abc all 422; weekly PDF,
  goal report PDF, career PDF with and without `goal_id`, and
  `goal_id` of another user → 404.
- **health/docs** — `{"status":"ok"}` and `/docs` 200.
- **unauthenticated sweep** — every protected route taken from
  `/openapi.json` (**44** of them) answered 401 or 422. None leaked data.
- **cross-user isolation** — 18 route/method pairs (goal read, tasks, trace,
  progress, history, report, report PDF, replan, patch, delete, task read,
  status patch, due-date patch, note put, tutor, submit, submissions,
  interview read) all answered 403/404 for user B. User B's quiz history is
  empty, B's search returns 0 rows and 404 for A's `goal_id`, B has no resume,
  B's overdue list is empty.

**Any 500s: none.** 420 lines of server log, zero `ERROR`, zero `WARNING`,
zero tracebacks.

**Response fields the frontend uses: all present.** I dumped the top-level keys
of every endpoint the app calls and compared them with each page/component:

| Page → endpoint | Fields the UI reads | In the response? |
|---|---|---|
| Dashboard → `/dashboard` | `active_goal.{id,title,readiness_score}`, `today_tasks[]`, `overdue_tasks[].{id,goal_id,due_date,skill,title}`, `overdue_count`, `completed_this_week` | yes |
| Dashboard → `/me/progress` | `current_streak`, `earned[].{badge,awarded_at}`, `locked[].{badge,hint}` | yes |
| Dashboard → `/goals/{id}/progress` | `categories{}` | yes |
| Dashboard → `/goals/{id}/history` | `[] .score` | yes |
| Dashboard → `/goals` | `id,title,target_role,timeline_days,created_at,current_skills,analysis` | yes |
| GoalDetail → `/goals/{id}` | `goal{…,analysis.difficulty,analysis.summary,current_skills}`, `tasks[]` | yes |
| GoalDetail → `/tasks/search` | `items[]`, `total` | yes |
| GoalDetail → `/goals/{id}/progress` | `readiness_score,completion_pct,avg_score,tasks_completed,tasks_total,skill_scores[].{skill,score},weak_areas[],strong_areas[]` | yes |
| GoalDetail → `/goals/{id}/trace` | `id,agent_name,created_at,message,status` | yes |
| TaskDetail → `/tasks/{id}` | `goal_id,task_type,status,skill,title,description,week,order,attempts,score,due_date,note` | yes |
| TaskDetail → `/tasks/{id}/submit` | `score,feedback.{breakdown,strengths,missing,recommendation},remedial_task.{id,title},newly_earned_badges` | yes |
| TaskDetail → `/tasks/{id}/tutor` | `explanation,example,practice_questions[],hints[]` | yes |
| TaskDetail → `/tasks/{id}/submissions` | `id,score,created_at,answer_text` | yes |
| Review → `/reviews/due` | `count`, `items[].{id,skill,due_date,stage}` | yes |
| Review → `/reviews/{id}/start` | `question` | yes |
| Review → `/reviews/{id}/answer` | `score,feedback.recommendation,next_due_date,stage,newly_earned_badges` | yes |
| Quiz → `/quizzes/start` | `id,skill,questions[].{question,options}` | yes |
| Quiz → `/quizzes/{id}/submit` | `score,results[].{question,options,correct_index,your_answer,correct,explanation},timed_out,review_created` | yes |
| Quiz → `/quizzes/history` | `id,skill,score,elapsed_seconds,timed_out,submitted_at` | yes |
| Interviews → `/interviews` | `id,role,status,overall_score,created_at,questions[].score` | yes |
| Interviews → `/interviews` POST | `id,questions[].{id,round_name,question_text}` | yes |
| InterviewRunner → `…/answer` | `score,feedback` | yes |
| InterviewRunner → `…/complete` | `overall_score,round_scores{},status,goal_id,role` | yes |
| Report → `/goals/{id}/report` | `readiness_score,tasks_completed,tasks_total,avg_score,latest_interview_score,categories{},strong_areas[],weak_areas[],next_steps[]` | yes |
| Weekly → `/me/weekly-summary` | `tasks_completed,average_score,weakest_skill,reviews_done,active_days,current_streak,week_start,week_end,coaching_note` | yes |
| Resume → `/resume/analyze` | `score,detected_skills[],skill_gaps[],feedback[]` | yes |
| Settings → `/auth/me` | `name,email,id` | yes |

**Endpoints with no test coverage: 2 of 47.** I matched every OpenAPI route
against the pytest sources: 45 appear; `PATCH /tasks/{task_id}/status` and
`GET /tasks/{task_id}/submissions` do not. Both work when called (200, and a
list respectively) — they are simply untested → NEW-04.

---

## Part B — frontend vs backend contract (static)

Every one of the 40 wrappers in `frontend/src/api/client.js` was compared with
the backend schema: URL, method, body keys, query params, FormData keys,
headers, and the response fields the pages read.

**Mismatches found: 1** — the FormData Content-Type (NEW-01). Everything else
lines up:

- **URL + method**: all 40 match the 47 OpenAPI routes exactly, including the
  two odd-looking ones: `PUT /tasks/{id}/note` (a PUT, deliberate) and the
  two PDF downloads that use `responseType: 'blob'`.
- **Query params**: `getGoalTasks` omits `status` for `all`; `downloadCareerPdf`
  omits `goal_id` when falsy; `getWeeklySummary` always sends `week_offset`
  (0 or 1 from `Weekly.jsx:69`, so the 422 cases are unreachable from the UI);
  `searchTasks` sends `undefined` values which axios drops (verified in the
  Node run: `params={"q":"100%","overdue":true,"goal_id":1}`).
- **Empty-string optional fields**: `GoalDetail` sends `q: searchQ.trim() || undefined`
  (never `""`); `analyzeResume` appends `goal_id` only when truthy; `Report`
  passes `Number(id)`; `Interviews` passes `Number(goalId)`. No `""` reaches a
  numeric or optional field.
- **JSON bodies after removing the global header**: no regression. The Node
  run shows `Content-Type: application/json` on every plain-object body —
  including `DELETE /auth/me` with a body (`client.js:52`), which was the risk.
  Live `DELETE /auth/me` → 204 and a follow-up login → 401.
- **401 handling**: one interceptor (`client.js:25-32`) clears the token and
  redirects for any 401 outside `/login`, and `AuthContext` re-validates the
  stored token on boot. Two pages pass `onRetry={load}` where `load` now takes
  a parameter — harmless, because the click event is ignored by those
  callbacks; `Dashboard` and `Review` were changed to `() => load()` anyway.
- **Loading / error handling**: every page has a loading branch and an
  `ErrorBanner`; every async handler resets `error` before the call and
  restores its busy flag in `finally`.
- **Raw backend text**: `getErrorMessage` still shows `detail` strings by
  design; the Resume page is the only one that maps status codes to friendly
  text (`Resume.jsx:9-15`).
- **Double-clickable buttons**: covered everywhere except one — the GoalDetail
  "Save changes" button (`GoalDetail.jsx:206`) has no `disabled` flag. Two
  identical PATCHes are harmless → NEW-07.
- **Crashes on empty data**: none. `dash.overdue_tasks[0]` is only reached when
  the array is non-empty; `session.round_scores` is a dict for both
  `in_progress` and `completed` sessions (verified live); `progress.skill_scores`,
  `weak_areas`, `strong_areas` and `report.categories` are always lists/dicts;
  `ReadyChart` and `EmptyState` guard empty arrays.
- **Regression check on the 11 fix commits** (`git diff main..HEAD`): no
  removed symbol is imported anywhere; the Dashboard overdue-card IIFE, the
  `load(quiet)` signature, the Settings effect and the `sendingRef`/`savingDue`
  guards are all internally consistent. `useSearchParams` is memoised on
  `location.search` (`react-router-dom` UMD build line 1123), so
  `Interviews`' `load` dependency cannot loop.
- One cosmetic leftover: `App.jsx:36-39` has two-space-lost indentation on four
  routes → NEW-09.

---

## Part C — UI flows simulated without a browser

**Confirmed by a request** (ran the real axios pipeline in Node against the
live server):

| Simulated flow | Result |
|---|---|
| Resume page upload (FormData, field `file`) | body reaches the adapter as `FormData` (no longer stringified) but the header is `application/x-www-form-urlencoded` → server 422 — **this is the one place the fix failed** |
| Login / create goal / patch due-date / put note / quiz start | `application/json` preserved, incl. `null` and `undefined` fields |
| `GET /tasks/search?q=100%&status=undefined&overdue=true&goal_id=1` | `100%` is sent literally, `status` dropped |
| `POST /goals/1/replan` with no body | no crash, empty body |
| `DELETE /auth/me` with a JSON body | header present, live 204 |
| GoalDetail chip + search combo (the BUG-04 request) | `?status=pending&overdue=true&goal_id=1` → 200, filtered |
| Task submit with empty / missing / 5000-char answer | 200 in all three cases (NEW-03) |
| Interview answer with 1-char / empty / missing / 5000-char answer | 200 in all four cases (NEW-03) |
| Review start → answer → due list | 200, item leaves `/reviews/due` |

**Suspected from reading code only** (needs a browser): every visual
behaviour in the "VERIFIED FIXED (static)" rows of Part 0, the toast timing,
the double-click timing, `useSearchParams` navigation from the Resume page, and
the `setTimeout`-driven quiz timer. I did not attempt to run a headless
browser — none is installed and none is allowed to be added.

---

## Part D — cross-cutting

- **pytest**: `139 passed, 4 warnings in 53.88s` (mock LLM) — unchanged.
- **Vite build**: `vite v5.4.21`, `✓ built in 8.38s`, no warnings, no errors.
- **Dependencies**: every third-party backend import is pinned except
  `numpy` (`app/ml/train.py:15`) → NEW-05. Frontend bare imports are exactly
  `axios`, `react`, `react-dom/client`, `react-router-dom`, all declared in
  `package.json` (caret ranges, but `package-lock.json` pins exact versions,
  so CI is reproducible).
- **Server log**: 420 lines, no `ERROR`, no `WARNING`, no traceback. The only
  non-2xx lines are the deliberate 4xx checks and the validator's
  "Coach output invalid, using fallback paragraph" style INFO lines.
- **`docs/MANUAL_CHECKS.md`**: 10 sections, one per finding. Eight are exact
  matches for the current UI. Three items are worded in a way the UI cannot
  produce, and one is the check that would have caught NEW-01 → NEW-07.

---

## New findings

| ID | Severity | Area | Where | Exact reproduction | Expected vs actual | Confirmed? | Minimal fix |
|----|----------|------|-------|--------------------|--------------------|-------------|-------------|
| NEW-01 | **Critical** | Resume upload (regression: still the original bug) | `frontend/src/api/client.js:19`; `frontend/node_modules/axios/lib/core/dispatchRequest.js:48-50`; `axios/lib/adapters/xhr.js:202` | 1) `npm run dev`, open `/resume`, pick a `.txt`, click Analyze. (Or offline: run axios 1.20.0 with this interceptor and read the config at adapter time.) | Expected: browser sends `multipart/form-data; boundary=…` and the API returns 200. Actual: browser sends `Content-Type: application/x-www-form-urlencoded`; `POST /resume/analyze` → **422 `Field required`** (reproduced with that exact header + a real multipart body). The body is no longer JSON-stringified, but the header is now wrong instead. | **Confirmed** — axios 1.20.0 source, a Node replay of the real pipeline (header value at adapter time), and a live 422 with the identical header. The last hop (a real XHR) is the only untested link. | Replace the `delete` with a value axios will not overwrite: `config.headers.setContentType(false)` in the interceptor. Verified: `AxiosHeaders` keeps a `false` value, `dispatchRequest.js:49` does not overwrite it, and `toByteStringHeaderObject` drops falsy values, so no Content-Type reaches `setRequestHeader` and the browser generates the boundary. |
| NEW-02 | Medium | TaskDetail / Review / InterviewRunner | `frontend/src/pages/TaskDetail.jsx:203`, `Review.jsx:109`, `InterviewRunner.jsx:140` | Open a task, leave the answer box empty, click **Submit answer**. Repeat on `/review` and in an interview. | Expected: the button is disabled (or the API rejects it). Actual: enabled → `POST /tasks/{id}/submit {"answer_text":""}` → **200 score 10**, a submission row is stored, the task flips to `in_progress`, a **remedial task is created**, a review is scheduled, and a badge can be awarded. On `/review` the item is rescheduled; in an interview the question is marked answered, which unlocks the "Complete interview" button. | **Confirmed** — live request (empty, whitespace-only and even a *missing* field all return 200) plus the button markup. | Add `|| !answer.trim()` (and the equivalent) to each `disabled` prop. Keep the backend as-is unless you want a 422 as well. |
| NEW-03 | Medium | Backend validation | `backend/app/schemas.py:118` (`SubmitRequest`), `:309` (`InterviewAnswerRequest`), `:400-401` (`ReviewAnswerRequest`) | `curl -X POST /tasks/1/submit -H "Authorization: Bearer …" -d '{}'`; same for the interview and review answer routes. | Expected: 422 for a missing/empty answer. Actual: **200 with a score of 10 (task) / 25 (interview)**, i.e. garbage input silently creates submissions and triggers the adaptive side effects. | **Confirmed** — all three routes return 200 for `{}`, `""` and whitespace. | `answer_text: str = Field(min_length=1, max_length=20000)` on the three schemas (this is a validation tightening, so add tests in the same change). |
| NEW-04 | Low | Dead endpoints / test coverage | `backend/app/routers/tasks.py:91` (`PATCH /tasks/{id}/status`), `:...` (`GET /tasks/{id}/submissions`), `routers/me.py` (`/me/overdue`), `routers/resume.py` (`/resume/latest`), `routers/quizzes.py` (`GET /quizzes/{id}`) | Route-vs-test scan: 45 of 47 routes appear in the pytest sources; `PATCH /tasks/{id}/status` and `GET /tasks/{id}/submissions` do not. Grep `frontend/src` for callers: `/me/overdue`, `/resume/latest`, `GET /quizzes/{id}` and `PATCH /tasks/{id}/status` have none. | Expected: every endpoint has either a caller or a test. Actual: `PATCH /tasks/{id}/status` has **neither** (its client wrapper was removed by BUG-07); three others are tested but unreachable from the UI. | **Confirmed** — grep + route scan; all four still answer 200/404 correctly when called. | Add one pytest test for the two untested routes. Decide per endpoint: keep it as documented API surface (then add the test) or drop it. Do not re-add dead wrappers to the client. |
| NEW-05 | Low | Dependency pinning | `backend/app/ml/train.py:15`, `backend/requirements.txt` | `grep -rn "import numpy" backend/app`; compare with `requirements.txt`. | Expected: direct imports pinned. Actual: `numpy` is imported directly but only present transitively via `scikit-learn==1.5.2`. A scikit-learn bump could break the ML job. | **Confirmed** — file contents. | Add `numpy==<installed version>` to `requirements.txt`. |
| NEW-06 | Low | API strictness | `backend/app/routers/tasks.py:56-57` | `GET /goals/1/tasks?status=all` | Expected: 200 (every other filter accepts a natural "no filter" value). Actual: 422 `Invalid status filter`. The UI is unaffected because `client.js:67-68` omits the parameter for `all`. | **Confirmed** — live 422. | Treat `all` as "no filter" in the validator, or document the enum. |
| NEW-07 | Low | Docs + minor UI nits | `docs/MANUAL_CHECKS.md:37-38, 58, 77`; `frontend/src/pages/GoalDetail.jsx:206` | (a) tick only "Overdue only" and read the count line; (b) open the checklist and try the quoted steps; (c) double-click "Save changes" in the edit-goal form; (d) pick chip "completed" **and** tick "Overdue only" | Expected: the checklist text matches the UI. Actual: (a) the UI prints `·` between filters, the doc says `/`; (b) "press Enter with no file chosen" is unreachable because the submit button is `disabled` while no file is picked; the quiz step "pressing Enter in the form" refers to a button that is not in a form; (c) the GoalDetail edit-save button has no `disabled` flag; (d) "completed" + "overdue only" always returns 0 rows with no explanation (the backend ANDs the filters, confirmed live). | **Confirmed** — code read + live request for (d). | Reword the three checklist lines, add `disabled={saving}` to the edit-save button, and mention the contradictory combination in the count text. |
| NEW-08 | Low | GoalDetail copy | `frontend/src/pages/GoalDetail.jsx:133-138` | Tick "Overdue only", then click the **completed** chip | Expected: either zero results with a hint, or the contradictory pair disabled. Actual: "0 matches for completed · overdue only", which reads like a bug. | **Confirmed** — live `?status=completed&overdue=true` returns `total: 0`. | Add a short note when `statusParam === 'completed' && overdueParam`. |
| NEW-09 | Low | Cosmetic | `frontend/src/App.jsx:36-39` | Open the file | Expected: routes indented like their neighbours. Actual: four `<Route>` lines are indented two spaces short. | **Confirmed** — file read. | Re-indent. No behaviour change. |

### Notes that are not bugs

- `getErrorMessage` still surfaces backend `detail` text — intended.
- Review items are scheduled for tomorrow, so `/reviews/due` reads 0 right
  after a low score — intended (Leitner stage 1).
- Re-answering the same review item is allowed and simply reschedules it.
- `PUT /note` vs `PATCH /due-date` is inconsistent but documented in `/docs`.
- The log line `Validator started for task_id=25 answer_len=5000` followed by
  `short-answer fast path` looks alarming but is correct: the guard is
  `len(answer) < 30 or len(answer.split()) < 5`
  (`app/agents/validator.py:84`, same rule in `interviewer.py:70`,
  `llm.py:110,174`, `validator.py:127`), and my 5000-char probe was the single
  word `"xxxx…"`, i.e. 1 word. Real prose is graded by the normal path (a
  259-char, 40-word answer scored 85).
- Frontend `package.json` uses caret ranges; `package-lock.json` pins exact
  versions, so CI is reproducible.
- The build produces `frontend/dist/` as usual — it is git-ignored, and
  `git ls-files` shows no build output, `.env`, `.db`, `.pyc`, `__pycache__`,
  `.joblib` or `node_modules` entries.