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
