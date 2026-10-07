# AGENTOS Frontend

React 18 + Vite + Tailwind + React Router v6 + Axios UI for the AGENTOS
AI career planning app. Talks to the FastAPI backend (default
`http://127.0.0.1:8000`).

## Setup

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL if the backend is elsewhere
npm install
npm run dev                 # http://localhost:5173
```

Backend must be running (`uvicorn app.main:app --reload` in `backend/`)
with CORS allowing `http://localhost:5173`.

## Build

```bash
npm run build
```

## Pages

- **Dashboard (`/`)** — greeting, readiness stat cards (today/overdue/streak),
  today's tasks, 5-category breakdown, SVG readiness trend, goal form, goal cards.
- **GoalDetail (`/goals/:id`)** — analysis header, edit-goal form, Re-plan button,
  progress panel, week-grouped tasks with status filter, agent trace timeline.
- **TaskDetail (`/tasks/:id`)** — task info, "Get AI Tutor" explainer,
  answer textarea + submit, scored result circle with breakdown bars and
  remedial-task banner, plus submission history.
- **Interviews (`/interviews`)** — start-a-session goal picker plus history list.
- **InterviewRunner (`/interviews/:id`)** — one question at a time with progress,
  per-answer feedback, completion summary with per-round scores.
- **Report (`/goals/:id/report`)** — report card (readiness circle, categories,
  chips, next steps) with Download PDF and Print.
- **Settings (`/settings`)** — rename, change password, delete account (typed confirm).
- **Auth (`/login`, `/register`)** — JWT stored in localStorage, 401 auto-redirect.
- **NotFound (`*`)** — 404 page with a back-to-dashboard link.

Shared pieces: `Layout` (sidebar/topbar), `ProtectedRoute`, `AuthContext`,
`ToastContext` (auto-dismiss toasts), `Skeleton`/`EmptyState`/`Loader`/`ErrorBanner`,
and `api/client.js` (one function per endpoint, token interceptor).
