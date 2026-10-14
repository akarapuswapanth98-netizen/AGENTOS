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
