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
