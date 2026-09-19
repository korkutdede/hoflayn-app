import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  tenants,
  memberships,
  plans,
  tenantEntitlements,
  creditTransactions,
} from "@/db/schema";
import {
  FREE_INITIAL_CREDITS,
  FREE_MONTHLY_CREDITS,
  FREE_PLAN_DEFAULTS,
  FREE_PLAN_ID,
} from "@/lib/constants";
import { getTranslator } from "@/lib/i18n/server";
import { buildTenantSlug, defaultTenantName } from "@/lib/tenant/slug";

export type AuthUserInput = {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export type ProvisionResult = {
  userId: string;
  tenantId: string;
  created: boolean;
};

/**
 * Idempotent signup provisioning.
 *
 * Creates (in one transaction): public.users, free plan (if missing), tenant,
 * owner membership, entitlements, and the initial free_grant credit.
 *
 * Safe to call on every login / OAuth callback — if the user already exists,
 * returns their existing primary tenant without mutating credits.
 */
export async function provisionNewUser(
  input: AuthUserInput,
): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("provisionNewUser: email is required");
  }

  const t = await getTranslator();

  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.id))
      .limit(1);

    if (existingUser) {
      const [membership] = await tx
        .select()
        .from(memberships)
        .where(eq(memberships.userId, input.id))
        .limit(1);
      if (!membership) {
        throw new Error(
          `provisionNewUser: user ${input.id} exists without a membership`,
        );
      }
      return {
        userId: existingUser.id,
        tenantId: membership.tenantId,
        created: false,
      };
    }

    await tx
      .insert(plans)
      .values({
        id: FREE_PLAN_ID,
        // Internal label; the UI renders the "billing.plan.free" key instead.
        name: "Free",
        monthlyCredits: FREE_MONTHLY_CREDITS,
        priceCents: 0,
        currency: "USD",
        defaults: FREE_PLAN_DEFAULTS,
      })
      .onConflictDoNothing();

    await tx.insert(users).values({
      id: input.id,
      email,
      fullName: input.fullName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    });

    const [tenant] = await tx
      .insert(tenants)
      .values({
        slug: buildTenantSlug(email),
        name: defaultTenantName(email, input.fullName, t),
        creditBalance: FREE_INITIAL_CREDITS,
      })
      .returning();

    if (!tenant) {
      throw new Error("provisionNewUser: failed to create tenant");
    }

    await tx.insert(memberships).values({
      userId: input.id,
      tenantId: tenant.id,
      role: "owner",
    });

    await tx.insert(tenantEntitlements).values({
      tenantId: tenant.id,
      plan: FREE_PLAN_ID,
      modules: { ...FREE_PLAN_DEFAULTS.modules },
      limits: { ...FREE_PLAN_DEFAULTS.limits },
    });

    await tx.insert(creditTransactions).values({
      tenantId: tenant.id,
      amount: FREE_INITIAL_CREDITS,
      type: "free_grant",
      balanceAfter: FREE_INITIAL_CREDITS,
      description: "Welcome credits",
    });

    return {
      userId: input.id,
      tenantId: tenant.id,
      created: true,
    };
  });
}
