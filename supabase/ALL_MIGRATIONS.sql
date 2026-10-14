-- ==============================================
-- FILE: supabase/migrations/20261014000001_core_schema.sql
-- ==============================================
-- ==============================================================================
-- AGENT OS — MIGRATION 01: CORE SCHEMA
-- Multi-Tenant Agentic Architecture, Execution Pipeline, and pgvector RAG
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Enumerated Domain Types
DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE run_status AS ENUM ('queued', 'running', 'success', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE trigger_type AS ENUM ('manual', 'schedule', 'webhook', 'api', 'workflow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE model_provider AS ENUM ('anthropic', 'openai', 'gemini', 'groq');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    theme TEXT NOT NULL DEFAULT 'dark',
    notification_preferences JSONB NOT NULL DEFAULT '{"email_runs": true, "email_weekly": true, "in_app": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Workspaces (Multi-Tenant Container)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Workspace Members (RBAC)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'member',
    invited_email TEXT,
    invite_token TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

-- 6. Subscriptions & Usage Limits
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    max_agents INT NOT NULL DEFAULT 5,
    max_monthly_runs INT NOT NULL DEFAULT 500,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Workspace Encrypted API Keys (Per-workspace LLM credentials)
CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider model_provider NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hint TEXT NOT NULL, -- e.g. "sk-ant-...49a2"
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, provider)
);

-- 8. Agents
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    role TEXT NOT NULL DEFAULT 'GENERAL',
    avatar_color TEXT NOT NULL DEFAULT '#6366f1',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Agent Versions (Immutable configuration snapshots)
CREATE TABLE IF NOT EXISTS public.agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    model_provider model_provider NOT NULL DEFAULT 'anthropic',
    model_name TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20,
    system_prompt TEXT NOT NULL,
    workflow_graph JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(agent_id, version_number)
);

-- 10. Runs (Agent and DAG workflow executions)
CREATE TABLE IF NOT EXISTS public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    agent_version_id UUID NOT NULL REFERENCES public.agent_versions(id) ON DELETE RESTRICT,
    triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    trigger_type trigger_type NOT NULL DEFAULT 'manual',
    status run_status NOT NULL DEFAULT 'queued',
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_data JSONB,
    error_message TEXT,
    total_tokens INT NOT NULL DEFAULT 0,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000000,
    latency_ms INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Run Logs (Step-by-step real-time telemetry stream)
CREATE TABLE IF NOT EXISTS public.run_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    agent_node_id TEXT, -- Node identifier from the workflow canvas
    step_index INT NOT NULL DEFAULT 0,
    level log_level NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Tools
CREATE TABLE IF NOT EXISTS public.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, name)
);

-- 13. Templates (Pre-configured agent marketplace)
CREATE TABLE IF NOT EXISTS public.templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Engineering',
    difficulty TEXT NOT NULL DEFAULT 'Intermediate',
    skills TEXT[] NOT NULL DEFAULT '{}',
    workflow_graph JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Knowledge Documents (RAG)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    chunk_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. Embeddings (pgvector semantic search)
CREATE TABLE IF NOT EXISTS public.embeddings (
    id BIGSERIAL PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- 1,536 dimensions for standard embedding models
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. Schedules (Cron Triggers)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Webhooks (Inbound HTTP Triggers)
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 18. API Keys (Public Developer API)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['runs:trigger', 'agents:read'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 21. Usage Metrics (Aggregated Time-Series)
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    model TEXT NOT NULL,
    call_count INT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000000,
    UNIQUE(workspace_id, period_start, model)
);

-- ==============================================================================
-- 22. Legacy Features Preservation (Career Goals, Tasks, Reviews, Interviews)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_role TEXT NOT NULL,
    timeline_days INT NOT NULL DEFAULT 30,
    current_skills TEXT[] DEFAULT '{}',
    analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT REFERENCES public.goals(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL DEFAULT 'study',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    skill TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    week INT NOT NULL DEFAULT 1,
    order_num INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    score INT,
    due_date DATE,
    note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.review_items (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    stage INT NOT NULL DEFAULT 1,
    due_date DATE NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.interviews (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id BIGINT REFERENCES public.goals(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    overall_score INT,
    round_scores JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id BIGSERIAL PRIMARY KEY,
    interview_id BIGINT NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    round_name TEXT NOT NULL,
    skill TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    score INT,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 23. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_ws ON public.agents(workspace_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_runs_agent ON public.runs(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_runs_ws ON public.runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_logs_run_id ON public.run_logs(run_id, step_index ASC);
CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON public.embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_ws ON public.embeddings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schedules_ws ON public.schedules(workspace_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_audit_logs_ws ON public.audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read) WHERE NOT read;

-- Vector HNSW Index for Fast Cosine Similarity
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);


-- ==============================================
-- FILE: supabase/migrations/20261014000002_rls_policies.sql
-- ==============================================
-- ==============================================================================
-- AGENT OS — MIGRATION 02: ROW LEVEL SECURITY (RLS) POLICIES
-- Enterprise Multi-Tenant Isolation with RBAC Hierarchy
-- ==============================================================================

-- 1. Helper Security Functions (SECURITY DEFINER to avoid infinite recursion)

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id
          AND user_id = auth.uid()
          AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = ws_id
          AND owner_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = ws_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_role(ws_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = auth.uid()) THEN 'owner'
        ELSE (
            SELECT role::text FROM public.workspace_members
            WHERE workspace_id = ws_id AND user_id = auth.uid() AND status = 'active'
            LIMIT 1
        )
    END;
$$;

-- 2. Enable Row-Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Workspaces Policies
CREATE POLICY "Users can view workspaces they belong to"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(id));

CREATE POLICY "Users can create their own workspaces"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins and owners can update their workspace"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (public.is_workspace_admin_or_owner(id))
    WITH CHECK (public.is_workspace_admin_or_owner(id));

CREATE POLICY "Only owners can delete their workspace"
    ON public.workspaces FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- 5. Workspace Members Policies
CREATE POLICY "Workspace members can view member list"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

CREATE POLICY "Admins and owners can manage members"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins and owners can update members"
    ON public.workspace_members FOR UPDATE
    TO authenticated
    USING (public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins and owners can delete members"
    ON public.workspace_members FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin_or_owner(workspace_id) OR user_id = auth.uid());

-- 6. Subscriptions Policies
CREATE POLICY "Workspace members can view subscription tier"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- 7. Workspace Encrypted API Keys Policies
CREATE POLICY "Only admins and owners can view and manage API keys"
    ON public.workspace_api_keys FOR ALL
    TO authenticated
    USING (public.is_workspace_admin_or_owner(workspace_id))
    WITH CHECK (public.is_workspace_admin_or_owner(workspace_id));

-- 8. Agents Policies
CREATE POLICY "Workspace members can view agents"
    ON public.agents FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create agents"
    ON public.agents FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update agents"
    ON public.agents FOR UPDATE
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete/archive agents"
    ON public.agents FOR DELETE
    TO authenticated
    USING (public.is_workspace_admin_or_owner(workspace_id));

-- 9. Agent Versions Policies
CREATE POLICY "Workspace members can view agent versions"
    ON public.agent_versions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.id = agent_versions.agent_id
              AND public.is_workspace_member(a.workspace_id)
        )
    );

CREATE POLICY "Workspace members can create agent versions"
    ON public.agent_versions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.id = agent_versions.agent_id
              AND public.is_workspace_member(a.workspace_id)
        )
    );

-- 10. Runs Policies
CREATE POLICY "Workspace members can view runs"
    ON public.runs FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can trigger runs"
    ON public.runs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update run status"
    ON public.runs FOR UPDATE
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- 11. Run Logs Policies
CREATE POLICY "Workspace members can view run logs"
    ON public.run_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.runs r
            WHERE r.id = run_logs.run_id
              AND public.is_workspace_member(r.workspace_id)
        )
    );

CREATE POLICY "Workspace members can insert run logs"
    ON public.run_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.runs r
            WHERE r.id = run_logs.run_id
              AND public.is_workspace_member(r.workspace_id)
        )
    );

-- 12. Tools Policies
CREATE POLICY "Workspace members can view tools"
    ON public.tools FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage tools"
    ON public.tools FOR ALL
    TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

-- 13. Templates Policies
CREATE POLICY "Templates are viewable by everyone"
    ON public.templates FOR SELECT
    USING (is_public = true);

-- 14. Knowledge Documents & Embeddings Policies
CREATE POLICY "Workspace members can view knowledge documents"
    ON public.knowledge_documents FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage knowledge documents"
    ON public.knowledge_documents FOR ALL
    TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view embeddings"
    ON public.embeddings FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage embeddings"
    ON public.embeddings FOR ALL
    TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

-- 15. Schedules & Webhooks Policies
CREATE POLICY "Workspace members can view schedules"
    ON public.schedules FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage schedules"
    ON public.schedules FOR ALL
    TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view webhooks"
    ON public.webhooks FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can manage webhooks"
    ON public.webhooks FOR ALL
    TO authenticated
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

-- 16. API Keys & Audit Logs Policies
CREATE POLICY "Admins can view and manage API keys"
    ON public.api_keys FOR ALL
    TO authenticated
    USING (public.is_workspace_admin_or_owner(workspace_id))
    WITH CHECK (public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Workspace members can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can record audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view usage metrics"
    ON public.usage_metrics FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- 17. Notifications Policies
CREATE POLICY "Users can manage their own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 18. Legacy Career Features Policies
CREATE POLICY "Users can manage their career goals"
    ON public.goals FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
    WITH CHECK (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));

CREATE POLICY "Users can manage their career tasks"
    ON public.tasks FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = tasks.goal_id
              AND (g.user_id = auth.uid() OR (g.workspace_id IS NOT NULL AND public.is_workspace_member(g.workspace_id)))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = tasks.goal_id
              AND (g.user_id = auth.uid() OR (g.workspace_id IS NOT NULL AND public.is_workspace_member(g.workspace_id)))
        )
    );

CREATE POLICY "Users can manage review items"
    ON public.review_items FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
    WITH CHECK (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));

CREATE POLICY "Users can manage interviews"
    ON public.interviews FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
    WITH CHECK (user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));

CREATE POLICY "Users can manage interview questions"
    ON public.interview_questions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews i
            WHERE i.id = interview_questions.interview_id
              AND (i.user_id = auth.uid() OR (i.workspace_id IS NOT NULL AND public.is_workspace_member(i.workspace_id)))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews i
            WHERE i.id = interview_questions.interview_id
              AND (i.user_id = auth.uid() OR (i.workspace_id IS NOT NULL AND public.is_workspace_member(i.workspace_id)))
        )
    );


-- ==============================================
-- FILE: supabase/migrations/20261014000003_triggers_and_functions.sql
-- ==============================================
-- ==============================================================================
-- AGENT OS — MIGRATION 03: TRIGGERS, AUTOMATION & RPC FUNCTIONS
-- Automated Profile Provisioning, Updated-At Handlers, and pgvector RAG Search
-- ==============================================================================

-- 1. Automatic Timestamp Maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply timestamp triggers to relevant tables
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workspace_api_keys_updated_at ON public.workspace_api_keys;
CREATE TRIGGER set_workspace_api_keys_updated_at
    BEFORE UPDATE ON public.workspace_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_agents_updated_at ON public.agents;
CREATE TRIGGER set_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_goals_updated_at ON public.goals;
CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 2. Auth User Provisioning Trigger (Auto-create Profile, Workspace & Free Subscription)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_workspace_id UUID;
    user_display_name TEXT;
    user_avatar TEXT;
    slug_candidate TEXT;
BEGIN
    user_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- 1. Create Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, user_display_name, user_avatar)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

    -- 2. Generate unique slug for default workspace
    slug_candidate := lower(regexp_replace(user_display_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substring(NEW.id::text, 1, 6);

    -- 3. Create Default Workspace
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (user_display_name || '''s Workspace', slug_candidate, NEW.id)
    RETURNING id INTO new_workspace_id;

    -- 4. Add User as Owner in workspace_members
    INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
    VALUES (new_workspace_id, NEW.id, 'owner', 'active');

    -- 5. Create Free Tier Subscription
    INSERT INTO public.subscriptions (workspace_id, tier, status, max_agents, max_monthly_runs)
    VALUES (new_workspace_id, 'free', 'active', 5, 500);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. pgvector RAG Semantic Search RPC Function
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.60,
    match_count int DEFAULT 5,
    filter_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    document_id uuid,
    document_title text,
    content text,
    similarity float,
    metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        e.id,
        e.document_id,
        d.title AS document_title,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.metadata
    FROM public.embeddings e
    JOIN public.knowledge_documents d ON d.id = e.document_id
    WHERE (filter_workspace_id IS NULL OR e.workspace_id = filter_workspace_id)
      AND (1 - (e.embedding <=> query_embedding)) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;


-- 4. Run Telemetry Aggregator (Auto-update usage metrics on Run completion)
CREATE OR REPLACE FUNCTION public.handle_run_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trunc_date TIMESTAMPTZ;
    agent_model TEXT;
BEGIN
    IF (NEW.status IN ('success', 'failed') AND OLD.status NOT IN ('success', 'failed')) THEN
        trunc_date := date_trunc('day', timezone('utc'::text, now()));
        
        SELECT COALESCE(v.model_name, 'unknown') INTO agent_model
        FROM public.agent_versions v
        WHERE v.id = NEW.agent_version_id;

        INSERT INTO public.usage_metrics (
            workspace_id,
            period_start,
            model,
            call_count,
            total_tokens,
            cost_usd
        )
        VALUES (
            NEW.workspace_id,
            trunc_date,
            agent_model,
            1,
            NEW.total_tokens,
            NEW.cost_usd
        )
        ON CONFLICT (workspace_id, period_start, model)
        DO UPDATE SET
            call_count = public.usage_metrics.call_count + 1,
            total_tokens = public.usage_metrics.total_tokens + EXCLUDED.total_tokens,
            cost_usd = public.usage_metrics.cost_usd + EXCLUDED.cost_usd;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_run_completed ON public.runs;
CREATE TRIGGER on_run_completed
    AFTER UPDATE ON public.runs
    FOR EACH ROW EXECUTE FUNCTION public.handle_run_completion();


-- ==============================================
-- FILE: supabase/migrations/20261014000004_storage_buckets.sql
-- ==============================================
-- ==============================================================================
-- AGENT OS — MIGRATION 04: STORAGE BUCKETS & POLICIES
-- Multi-Tenant Avatar Uploads and Private RAG Document Storage
-- ==============================================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
    ('knowledge-files', 'knowledge-files', false, 26214400, ARRAY['application/pdf', 'text/plain', 'text/markdown', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Avatars Storage Policies
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 3. Knowledge Files Storage Policies (Secured per workspace directory: <workspace_id>/<filename>)
CREATE POLICY "Workspace members can read knowledge files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'knowledge-files'
        AND public.is_workspace_member((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "Workspace members can upload knowledge files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'knowledge-files'
        AND public.is_workspace_member((storage.foldername(name))[1]::uuid)
    );

CREATE POLICY "Workspace members can delete knowledge files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'knowledge-files'
        AND public.is_workspace_admin_or_owner((storage.foldername(name))[1]::uuid)
    );


-- ==============================================
-- FILE: supabase/seed.sql
-- ==============================================
-- ==============================================================================
-- AGENT OS — DATABASE SEED DATA
-- Default Agent Templates, System Tools, and Starter Configurations
-- ==============================================================================

-- 1. Insert Production Agent Templates into public.templates
INSERT INTO public.templates (id, title, description, role, category, difficulty, skills, workflow_graph, is_public)
VALUES
(
    'ai-fullstack',
    'Full-Stack AI Application Architect',
    'Autonomous pipeline specializing in LLM tool calling, streaming RAG architectures, and reactive frontend engineering.',
    'Full-Stack AI Engineer',
    'Engineering',
    'Advanced',
    ARRAY['react', 'fastapi', 'vector-rag', 'langchain', 'typescript', 'tailwind'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Analyst Agent", "role": "ANALYST", "model": "claude-3-5-sonnet", "systemPrompt": "Analyze requirement specs and decompose into core architectural constraints."}},
            {"id": "node-2", "type": "agent", "position": {"x": 350, "y": 150}, "data": {"label": "Planner Agent", "role": "PLANNER", "model": "gpt-4o", "systemPrompt": "Generate step-by-step implementation milestones with test coverage gates."}},
            {"id": "node-3", "type": "agent", "position": {"x": 600, "y": 150}, "data": {"label": "Validator Agent", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Verify types, error boundaries, and security vulnerabilities."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true},
            {"id": "edge-2-3", "source": "node-2", "target": "node-3", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'dist-systems',
    'Distributed Systems & Backend Lead',
    'High-throughput system architecture with rigorous focus on CAP theorem trade-offs, raft consensus, and partitioned streaming.',
    'Staff Backend Engineer',
    'Infrastructure',
    'Expert',
    ARRAY['go', 'distributed-consensus', 'kafka', 'kubernetes', 'postgresql-tuning'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "System Architect", "role": "ARCHITECT", "model": "claude-3-5-sonnet", "systemPrompt": "Design data replication, partition tolerance, and load balancing topologies."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "Concurrency Validator", "role": "VALIDATOR", "model": "gpt-4o", "systemPrompt": "Analyze race conditions, deadlocks, and connection pool saturation."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'algo-master',
    'Algorithmic Rigor & Interview Specialist',
    'Focused 3-week sprint dedicated to mastering top 75 FAANG-style algorithmic patterns and spaced-repetition edge cases.',
    'Competitive Programmer & Algorithmic Specialist',
    'Education',
    'Challenging',
    ARRAY['dynamic-programming', 'graph-theory', 'sliding-window', 'trees-and-tries', 'complexity-analysis'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Pattern Analyst", "role": "ANALYST", "model": "claude-3-5-sonnet", "systemPrompt": "Identify algorithmic pattern category, invariant rules, and space-time boundaries."}},
            {"id": "node-2", "type": "agent", "position": {"x": 380, "y": 150}, "data": {"label": "Mock Interviewer", "role": "INTERVIEWER", "model": "gpt-4o", "systemPrompt": "Conduct interactive coding problem probing with edge cases."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'cloud-sre',
    'Cloud Infrastructure & SRE Architect',
    'Production-ready cloud reliability engineering, zero-downtime rolling deployments, and container orchestration.',
    'DevOps & Cloud SRE',
    'DevOps',
    'Advanced',
    ARRAY['terraform', 'kubernetes', 'aws-well-architected', 'prometheus-grafana', 'ci-cd'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Infra Auditor", "role": "AUDITOR", "model": "claude-3-5-sonnet", "systemPrompt": "Review Terraform plans and Kubernetes manifests for security & cost leaks."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "SLO Engine", "role": "PLANNER", "model": "claude-3-5-sonnet", "systemPrompt": "Compute error budgets and define Prometheus alert thresholds."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'mlops-ai',
    'MLOps & LLM Fine-Tuning Engineer',
    'Practical open-source LLM customization, parameter-efficient fine-tuning (PEFT), and high-throughput vLLM inference.',
    'Machine Learning Engineer',
    'AI & Data',
    'Advanced',
    ARRAY['pytorch', 'huggingface', 'lora-finetuning', 'vllm-serving', 'model-quantization'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Dataset Curating Agent", "role": "ANALYST", "model": "gpt-4o", "systemPrompt": "Format and validate conversational pairs for QLoRA instruction tuning."}},
            {"id": "node-2", "type": "agent", "position": {"x": 420, "y": 150}, "data": {"label": "Benchmark Validator", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Evaluate perplexity, MT-Bench scores, and catastrophic forgetting."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'cyber-security',
    'Application Security & Pen-Tester',
    'Deep security posture analysis, JWT/OAuth hardening, and automated vulnerability scanning protocols.',
    'Security Engineer',
    'Security',
    'Advanced',
    ARRAY['owasp-top-10', 'cryptography', 'auth-protocols', 'threat-modeling', 'container-security'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Threat Modeler", "role": "AUDITOR", "model": "claude-3-5-sonnet", "systemPrompt": "Perform STRIDE analysis across all network ingresses and RPC handlers."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "Security Auditor", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Scan dependencies, CORS policies, and rate limits for CVE exposures."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    role = EXCLUDED.role,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    skills = EXCLUDED.skills,
    workflow_graph = EXCLUDED.workflow_graph,
    is_public = EXCLUDED.is_public;


