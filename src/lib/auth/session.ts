import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, tenants, users } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { provisionNewUser } from "@/lib/auth/provision";

export type AppUser = typeof users.$inferSelect;
export type AppTenant = typeof tenants.$inferSelect;

export type TenantContext = {
  user: AppUser;
  tenant: AppTenant;
  role: "owner" | "admin" | "member";
  membershipId: string;
};

/**
 * Returns the authenticated app user, or null.
 * Triggers provisioning if Auth exists but public.users is missing.
 *
 * ADR-012: identity from Supabase Auth (JWT); app data via privileged Drizzle
 * with mandatory membership checks. RLS defends PostgREST/client paths.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (existing) return existing;

  await provisionNewUser({
    id: authUser.id,
    email: authUser.email,
    fullName:
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
  });

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  return row ?? null;
}

/**
 * Resolves the caller's primary tenant (first membership).
 * Returns null when unauthenticated or not provisioned.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, membership.tenantId))
    .limit(1);
  if (!tenant) return null;

  return {
    user,
    tenant,
    role: membership.role,
    membershipId: membership.id,
  };
}

/**
 * Same as getCurrentTenant, but redirects to /login when missing.
 */
export async function requireTenant(): Promise<TenantContext> {
  const ctx = await getCurrentTenant();
  if (!ctx) {
    redirect("/login");
  }
  return ctx;
}
