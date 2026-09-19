-- RLS + free plan seed (Stage 1)
-- Applies defense-in-depth tenant isolation for any path using the
-- authenticated/anon Supabase role. Privileged Drizzle connections
-- (DATABASE_URL as postgres) bypass RLS and MUST filter by tenant in app code
-- (ADR-012).

-- Membership helper (SECURITY DEFINER so policies can read memberships
-- without recursive RLS loops).
CREATE OR REPLACE FUNCTION public.is_member_of(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_member_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_tenant_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid) TO authenticated;

-- ---------- users ----------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select_own
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- tenants ----------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_member
  ON public.tenants FOR SELECT
  TO authenticated
  USING (public.is_member_of(id));

CREATE POLICY tenants_update_admin
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(id))
  WITH CHECK (public.is_tenant_admin(id));

-- ---------- memberships ----------
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_select_member
  ON public.memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_member_of(tenant_id));

-- ---------- plans (catalog: readable by all signed-in users) ----------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans FORCE ROW LEVEL SECURITY;

CREATE POLICY plans_select_authenticated
  ON public.plans FOR SELECT
  TO authenticated
  USING (true);

-- ---------- tenant_entitlements ----------
ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_entitlements FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_entitlements_select_member
  ON public.tenant_entitlements FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));

-- ---------- credit_transactions ----------
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY credit_transactions_select_member
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));

-- ---------- ai_jobs ----------
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_jobs_select_member
  ON public.ai_jobs FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));

CREATE POLICY ai_jobs_insert_member
  ON public.ai_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));

CREATE POLICY ai_jobs_update_member
  ON public.ai_jobs FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));

-- ---------- ai_usage_logs ----------
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_logs_select_member
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));

-- ---------- media_assets ----------
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY media_assets_select_member
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (public.is_member_of(tenant_id));

CREATE POLICY media_assets_insert_member
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of(tenant_id));

CREATE POLICY media_assets_update_member
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (public.is_member_of(tenant_id))
  WITH CHECK (public.is_member_of(tenant_id));

CREATE POLICY media_assets_delete_member
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (public.is_member_of(tenant_id));

-- ---------- seed free plan ----------
INSERT INTO public.plans (id, name, monthly_credits, price_cents, currency, defaults)
VALUES (
  'free',
  'Ücretsiz',
  90,
  0,
  'USD',
  '{"modules":{"studio":true,"writer":false,"catalog":false,"barcode":false},"limits":{"max_ai_jobs_per_day":10,"storage_gb":1}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
