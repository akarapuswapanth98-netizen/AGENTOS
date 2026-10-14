# Deploying AGENTOS v2.0

AGENTOS v2.0 is designed for hybrid enterprise deployment:
- **Frontend & Serverless Edge**: Hosted on **Vercel** (`https://agentos-six-omega.vercel.app`).
- **Core Persistence & Realtime**: Powered by **Supabase** (PostgreSQL 16, Auth, Storage, Realtime SSE, and `pgvector`).
- **FastAPI Core Engine (Optional/Companion)**: Containerized on Render, Railway, or AWS ECS.

---

## ⚡ 1. Supabase Setup (Postgres, Auth, Storage & Vector)

Follow these steps to initialize your Supabase cloud backend:

1. **Create a Supabase Project**:
   - Go to [database.new](https://database.new) and create a new project.
   - Note down your database password and target region.

2. **Execute Database Migrations**:
   - In your Supabase Dashboard, open the **SQL Editor**.
   - Sequentially run the following migration scripts located in `supabase/migrations/`:
     1. `20261014000001_core_schema.sql`: Installs `uuid-ossp`, `pgcrypto`, `vector`, and builds the 22 core tables (profiles, workspaces, agents, runs, run_logs, embeddings, schedules, etc.).
     2. `20261014000002_rls_policies.sql`: Enables Row Level Security (RLS) across all 22 tables with multi-tenant RBAC helper functions.
     3. `20261014000003_triggers_and_functions.sql`: Installs `handle_new_user()` onboarding trigger, updated-at triggers, `match_knowledge_embeddings()` cosine search RPC, and run telemetry aggregators.
     4. `20261014000004_storage_buckets.sql`: Provisions the `avatars` (public) and `knowledge-files` (private, tenant-isolated) storage buckets with strict RLS storage policies.
   - Run `supabase/seed.sql`: Seeds 6 pre-built production agent templates with React Flow DAG graph topologies.

3. **Retrieve API Credentials**:
   - Navigate to **Project Settings > API**.
   - Copy:
     - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
     - **Project API Anon Key** (`anon` `public`)
     - **Service Role Key** (`service_role` secret for Edge Functions)

4. **Deploy Supabase Edge Functions** (Optional / Cloud Agent Runners):
   Using the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   # Link your project
   supabase link --project-ref <your-project-ref>

   # Deploy edge functions
   supabase functions deploy run-agent
   supabase functions deploy embed-document
   supabase functions deploy webhook-trigger
   ```

---

## 🚀 2. Vercel Frontend Deployment

1. **Import Repository**:
   - In [Vercel Dashboard](https://vercel.com/dashboard), select **Add New Project** and import `akarapuswapanth98-netizen/AGENTOS`.
   - Set **Root Directory** to `frontend`.
   - Framework preset: **Vite**.

2. **Configure Environment Variables**:
   Add the following environment variables in **Project Settings > Environment Variables**:
   | Variable | Value | Description |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://<your-project>.supabase.co` | Your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Public Anon Key |
   | `VITE_API_URL` | `https://agentos-backend.onrender.com` | FastAPI backend URL (optional) |

3. **Deploy**:
   - Trigger the deployment.
   - The production build runs `npm run build` with optimized Rollup code-splitting across React, Three.js, React Flow, and Supabase.

---

## 🐍 3. FastAPI Backend Deployment (Render Blueprint)

1. In Render: **New > Blueprint**, select this repo. The `render.yaml` creates the `agentos-backend` web service and `agentos-db` PostgreSQL instance.
2. Fill in `GROQ_API_KEY` (or `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
3. Add your production Vercel frontend URL to `CORS_ORIGINS` (e.g. `https://agentos-six-omega.vercel.app`).
4. Start command automatically executes Alembic migrations:
   ```bash
   python -m alembic -c alembic.ini upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

---

## ✅ Pre-Deploy Verification Checklist

- [x] All 157 backend test fixtures passing (`python -m pytest tests/`).
- [x] Vite frontend bundle builds with 0 errors and chunk-splitting configured.
- [x] Storage buckets `avatars` and `knowledge-files` created and policies enabled.
- [x] Vector extension and HNSW cosine search index verified in Supabase.
- [x] Row Level Security (RLS) active on all 22 schema tables.
- [x] CORS allowed origins configured with exact production frontend domains.

---

## 🔍 Post-Deploy Smoke Test

1. **Authentication**: Register a new user, verify profile auto-creation via `handle_new_user()` trigger, and test password recovery.
2. **Workspaces**: Navigate to `/workspaces`, create an auxiliary workspace, invite a collaborator, and verify role permissions.
3. **Agent Builder**: Open `/builder`, load a template from `/marketplace`, tweak node prompts, and trigger an autonomous run.
4. **Live Telemetry**: Open `/monitoring`, observe real-time run logs streaming via Supabase Realtime channel.
5. **Knowledge Base**: Navigate to `/knowledge`, upload a PDF or Markdown document, verify chunking and cosine similarity query retrieval.
6. **Job Match & Skills**: Test JD matching on `/job-match` and browse the interactive skill matrix on `/skills`.

