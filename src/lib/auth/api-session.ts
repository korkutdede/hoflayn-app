import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, tenants, users } from "@/db/schema";
import { ApiError } from "@/lib/api/http";
import { checkInviteEmail } from "@/lib/auth/allowlist";
import {
  inviteErrorStatus,
  inviteMessageKey,
  inviteMessageVars,
} from "@/lib/auth/invite-messages";
import { provisionNewUser } from "@/lib/auth/provision";
import type { TenantContext } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new ApiError(401, "missing_token", "api.error.missingToken");
  }
  return match[1];
}

export async function requireApiTenant(request: Request): Promise<TenantContext> {
  const token = bearerToken(request);
  const supabase = createSupabaseAdminClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !authUser?.email) {
    throw new ApiError(401, "invalid_token", "api.error.invalidToken");
  }

  const invite = checkInviteEmail(authUser.email);
  if (!invite.ok) {
    throw new ApiError(
      inviteErrorStatus(invite.code),
      invite.code,
      inviteMessageKey(invite.code),
      inviteMessageVars(),
    );
  }

  let [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!appUser) {
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
    [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);
  }

  if (!appUser) {
    throw new ApiError(409, "provision_failed", "api.error.provisionFailed");
  }

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, appUser.id))
    .limit(1);
  if (!membership) {
    throw new ApiError(
      409,
      "membership_missing",
      "api.error.membershipMissing",
    );
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, membership.tenantId))
    .limit(1);
  if (!tenant) {
    throw new ApiError(409, "tenant_missing", "workshop.error.notFound");
  }

  return {
    user: appUser,
    tenant,
    role: membership.role,
    membershipId: membership.id,
  };
}

export async function requireApiOnboardedTenant(
  request: Request,
): Promise<TenantContext> {
  const context = await requireApiTenant(request);
  if (!context.tenant.craftCategory) {
    throw new ApiError(
      409,
      "onboarding_required",
      "api.error.onboardingRequired",
    );
  }
  return context;
}
