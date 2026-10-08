# Deploying AGENTOS

## Render (backend + Postgres)

1. Create a **PostgreSQL** instance; copy its *Internal Database URL*.
2. Create a **Web Service** from this repo: root `backend/`, build `pip install -r requirements.txt`, start `sh -c "python -m alembic -c alembic.ini upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port $PORT"`.
3. Set env vars (Render dashboard; never commit them):
   `ENVIRONMENT=production`, `DATABASE_URL=<internal URL>`,
   `JWT_SECRET=<random string, 32+ chars>`, `JWT_EXPIRE_MINUTES=60`,
   `CORS_ORIGINS=https://<your-frontend-url>`,
   `LLM_PROVIDER=groq`, `GROQ_API_KEY=<key>`, `LLM_MOCK=false`, `LLM_CALLS_PER_HOUR=60`.
4. Deploy. Migrations run automatically on every start.

## Vercel (frontend)

1. Import the repo, set root to `frontend/`, framework preset Vite.
2. Set build env `VITE_API_URL=https://<your-backend-url>` and deploy.
3. Put that exact frontend URL into the backend's `CORS_ORIGINS`.

## Pre-deploy checklist

- Rotate any key ever exposed (it stays burned into git history otherwise).
- Set a strong `JWT_SECRET` (32+ chars, random, unique per environment).
- `CORS_ORIGINS` is the exact frontend URL — never `*` in production (the app refuses to start otherwise).
- `ENVIRONMENT=production` so the startup guard is active.

## Post-deploy smoke test

1. `GET /health` returns `{"status": "ok"}`.
2. Register a user, log in, create a goal.
3. Check backend logs for the `LIVE LLM call` line (proves the real provider path).
4. Submit a short answer; confirm a low score plus a remedial task.

Free tiers may sleep: the first request after idle can take ~30-60 seconds. The
`/health` endpoint doubles as a keep-alive ping and a load-balancer check.

## Rollback

Every release is a tag: `git tag` lists them (`v1.0`, `v1.1`, ...). To roll back,
point Render at the tag (`git checkout v1.0` in a detached deploy or redeploy the
tag) and re-run `alembic upgrade head` — migrations only move forward, so rolling
back code never needs a downgrade unless a migration itself was bad.
