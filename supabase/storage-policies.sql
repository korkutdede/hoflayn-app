-- Supabase Storage policies for bucket: media-assets
-- Run in Supabase SQL Editor AFTER first Studio upload (or after creating the bucket).
-- Path convention: {tenant_id}/raw/... | {tenant_id}/processed/... | {tenant_id}/temp/...
--
-- Service role (used by Next.js server via SUPABASE_SERVICE_ROLE_KEY) bypasses
-- these policies. They protect any client/authenticated direct Storage access.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-assets',
  'media-assets',
  false,
  8388608, -- 8 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper: first path segment must be a tenant the user belongs to.
CREATE OR REPLACE FUNCTION public.storage_tenant_id(object_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.can_access_media_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.storage_tenant_id(object_name) IS NOT NULL
    AND public.is_member_of(public.storage_tenant_id(object_name));
$$;

REVOKE ALL ON FUNCTION public.storage_tenant_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_tenant_id(text) TO authenticated;
REVOKE ALL ON FUNCTION public.can_access_media_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_media_object(text) TO authenticated;

DROP POLICY IF EXISTS "media_assets_select_member" ON storage.objects;
DROP POLICY IF EXISTS "media_assets_insert_member" ON storage.objects;
DROP POLICY IF EXISTS "media_assets_update_member" ON storage.objects;
DROP POLICY IF EXISTS "media_assets_delete_member" ON storage.objects;

CREATE POLICY "media_assets_select_member"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND public.can_access_media_object(name)
  );

CREATE POLICY "media_assets_insert_member"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media-assets'
    AND public.can_access_media_object(name)
  );

CREATE POLICY "media_assets_update_member"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND public.can_access_media_object(name)
  )
  WITH CHECK (
    bucket_id = 'media-assets'
    AND public.can_access_media_object(name)
  );

CREATE POLICY "media_assets_delete_member"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND public.can_access_media_object(name)
  );
