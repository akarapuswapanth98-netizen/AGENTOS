# AGENTOS Bug Audit — full-app black-box + contract review

Date: 2026-10-08. Backend exercised over real HTTP (temp SQLite DB, mock LLM,
79 + 16 checks, all passing except where noted). Frontend reviewed statically.
Nothing was fixed; this file is untracked on purpose.

## How to read this table

- Severity: Critical (data loss / security / whole feature dead), High (feature
  broken or wrong data shown), Medium (confusing UX, recoverable), Low (cosmetic).
- "Confirmed" = reproduced with a real HTTP request or read verbatim in code.
  "Suspected" = inferred, needs a browser to prove.

| ID | Severity | Area | Where | Reproduction | Expected vs actual | Confirmed? | Minimal fix |
|----|----------|------|-------|--------------|--------------------|------------|-------------|
| BUG-01 | High | Resume upload | `frontend/src/api/client.js:7`, `frontend/src/api/client.js:69-73` | Upload any resume twice (or once) via the Resume page → 422 `{"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required"}]}` | Expected: 200 with analysis. Actual: every UI upload fails | Confirmed (reproduced live by forcing the same header; axios source `node_modules/axios/lib/defaults/index.js:54-58` stringifies FormData when a JSON Content-Type is preset) | Send this one request without the global JSON header, e.g. pass a per-request `transformRequest: [(data) => data]` so the browser sets the multipart boundary |
| BUG-02 | Medium | Dashboard | `frontend/src/pages/Dashboard.jsx:158` | With zero overdue tasks, click the "Overdue / View overdue →" card | Expected: useful destination. Actual: links to `/` (the page you are on) | Confirmed by reading | Link to `/review`, or render a non-link card when count is 0 |
| BUG-03 | Medium | GoalDetail search | `frontend/src/pages/GoalDetail.jsx:229-231` | Tick "Overdue only" (or pick a skill) with empty search box | Expected: count text matches the filter. Actual: shows `N matches for ""` | Confirmed by reading | Show the active filter description instead of only `searchQ` |
| BUG-04 | Medium | GoalDetail filters | `frontend/src/pages/GoalDetail.jsx:109-117` | Type a search, then click a status chip | Expected: chips combine or visibly disable. Actual: chips stay highlighted but are silently ignored while search is active | Confirmed by reading | Disable the chips (or combine them into the search params) while `searchActive` |
| BUG-05 | Low | Quiz submit | `frontend/src/pages/Quiz.jsx:162-165` | Double-click "Submit answers" fast | Expected: one request. Actual: two submits fire; the second gets 409 and an error toast (answers are preserved) | Confirmed by reading (`sending` only disables after state flush) | Disable on first click via a ref guard, or ignore 409s silently when a result already exists |
| BUG-06 | Low | Review/Dashboard refresh | `frontend/src/pages/Review.jsx:65`, `Dashboard.jsx:handleDelete` | Answer a review or delete a goal | Expected: list updates in place. Actual: full-page `load()` flashes the Skeleton over content the user was reading | Confirmed by reading | Update the single row in state instead of full reload |
| BUG-07 | Low | Dead client wrappers | `frontend/src/api/client.js:67,75,84` | `getQuiz`, `getLatestResume`, `updateTaskStatus` | Expected: used or removed. Actual: defined, tested on the backend, but no page calls them | Confirmed by grep (zero call sites in `pages/`) | Delete the wrappers or wire them (e.g. manual status control, latest-resume banner) |
| BUG-08 | Low | Settings | `frontend/src/pages/Settings.jsx:14` | Open Settings before the profile finishes loading | Expected: name field fills in. Actual: `useState(user?.name \|\| '')` snapshots once and can stay empty | Suspected from reading (needs slow-auth timing in a browser) | Sync `name` from `user` with an effect when it arrives |
| BUG-09 | Low | GoalDetail filter fetch | `frontend/src/pages/GoalDetail.jsx:115` | Status-filter request fails (offline backend) | Expected: an error message. Actual: `.catch(() => {})` swallows it; the list just goes stale | Confirmed by reading | Surface via `setError` like the search effect does |
| BUG-10 | Low | TaskDetail saves | `frontend/src/pages/TaskDetail.jsx:44,66` | Hammer Save on due-date/note | Expected: serialized saves. Actual: parallel PATCH/PUT race, last response wins (harmless: same field, idempotent) | Confirmed by reading | Add a busy flag like the other buttons |

## Notes that are NOT bugs

- `getErrorMessage` shows raw backend `detail` strings: intended (spec asked for it).
- Validator returning 10 for "idk" and mock 85/80s: intended mock behavior.
- Review item due tomorrow (so `/due` reads 0 right after a low score): intended.
- `PUT /note` vs `PATCH /due-date`: inconsistent verbs but both documented in `/docs`.
- Quiz `startQuiz(skill, undefined)` posts `{skill}` only: backend `goal_id` is optional, fine.
- No 500s seen on any route; every backend route has pytest coverage; all third-party
  imports are pinned in `requirements.txt`/`package.json`; server log shows no
  tracebacks (only expected 4xx validation codes); no `dangerouslySetInnerHTML`,
  `eval`, or manual Content-Type anywhere else.
