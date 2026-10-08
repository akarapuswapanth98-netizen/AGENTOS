# Manual check list - frontend fixes (branch `fix-bugs-batch`)

There is no frontend test framework in this repo, so every frontend fix below
is verified by hand in a browser. There are no backend changes in this branch,
so the backend tests stay the source of truth for API behaviour.

## Setup for the checks

```bash
# terminal 1 - backend (mock LLM, so no API key is used)
cd backend
cp .env.example .env          # keep USE_MOCK_LLM=true
uvicorn app.main:app --reload

# terminal 2 - frontend
cd frontend
npm install
npm run dev
```

Open the printed Vite URL, sign in with any account that has at least one goal
with tasks (the demo seed is the fastest way: `python scripts/seed_demo.py`,
then `demo@agentos.dev` / `demo12345`).

Open the browser devtools Network tab and filter by `resume`, `search`,
`quiz`, `auth` - the checks below tell you what to look for.

## BUG-01 (High) - resume upload

- [ ] Resume page -> choose a `.txt` file -> **Analyze resume**.
      Network: `POST /resume/analyze` is `multipart/form-data`, part name
      `file`, **no** `Content-Type` in the request headers list.
      Response `200`, results panel shows score, skills, gaps, feedback.
- [ ] Analyze a second file right away. Response `200` again (this used to be
      `422 Field required` from the UI).
- [ ] After each attempt the file input shows **empty** again.
- [ ] Press Enter in the form with no file chosen -> banner says
      **"Choose a .pdf or .txt file first"**, no request is sent.
- [ ] Pick a `.exe` (or rename a text file to `.exe`) -> friendly message
      **"That file type is not supported. Please choose a .pdf or .txt file."**,
      never raw `Field required` JSON.
- [ ] Pick a file bigger than 2 MB -> **"That file is larger than 2 MB..."**.
- [ ] Any other page still sends `Content-Type: application/json` for normal
      POSTs (e.g. create a goal) - confirm the header is present there.

## BUG-02 (Medium) - dashboard overdue card

- [ ] With zero overdue tasks: the Overdue card is **not** a link (cursor is
      default, no hover shadow change) and reads "Nothing overdue".
- [ ] With at least one overdue task: the card links to
      `/goals/<id>?filter=overdue` and the list opens filtered to overdue.

## BUG-03 (Medium) - search count text

- [ ] Goal detail -> leave the search box empty, tick **Overdue only**.
      The count reads e.g. "3 matches for overdue only" (never `for ""`).
- [ ] Pick a skill in the dropdown instead -> "... for python" or
      "... for python / overdue only".
- [ ] Type `sql` as well -> "... for "sql" / python".

## BUG-04 (Medium) - status chips during search

- [ ] Type `sql` in the search box, then click the **pending** chip. The list
      narrows to pending tasks matching `sql` (chip stays highlighted and now
      actually applies).
- [ ] Click the **overdue** chip while the search is active -> only overdue
      matches are listed.
- [ ] Click **all** -> only the query remains in effect.
- [ ] Clear the search box -> the plain status filter takes over again and the
      task list reloads.

## BUG-05 (Low) - quiz double submit

- [ ] Start a quiz, answer everything, then double-click **Submit answers**
      quickly. Devtools shows **exactly one** `POST /quizzes/<id>/submit`, no
      `409`, no error toast.
- [ ] Answering nothing and pressing Enter in the form also sends one request.

## BUG-06 (Low) - quiet refresh

- [ ] Review page -> answer a due item. The list updates in place; the skeleton
      does **not** flash over the page.
- [ ] Dashboard -> delete a goal (confirm the dialog). The card is removed and
      the rest of the dashboard stays put; no full-page "Loading dashboard...".

## BUG-07 (Low) - dead API wrappers removed

- [ ] `grep -rn "getLatestResume\|api.getQuiz(\|updateTaskStatus" frontend/src`
      returns nothing. Every page still loads (no "not a function" console
      errors) - check the browser console on Dashboard, GoalDetail, TaskDetail,
      Resume, Review, Quiz, Interviews, Weekly, Report, Settings.

## BUG-08 (Low) - settings name field

- [ ] Throttle the network to "Slow 3G" in devtools, log in, then open
      **Settings**. The name field shows your name once the profile arrives.
- [ ] Type a new name and save - the value stays, no other field is clobbered.

## BUG-09 (Low) - filter fetch errors are visible

- [ ] Goal detail -> set the status chip to **pending**, then stop the backend.
      The error banner appears instead of the list silently going stale.
- [ ] Restart the backend and press **Retry** in the banner -> the list reloads.

## BUG-10 (Low) - task due-date saves

- [ ] Task detail -> click **Save** on the due date repeatedly. The button
      shows "Saving..." and is disabled until the request returns; only one
      `PATCH /tasks/<id>/due-date` is sent per click.
- [ ] Same for **Clear**.