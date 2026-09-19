import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plans, tenantEntitlements } from "@/db/schema";
import type { PlanDefaults } from "@/db/schema/entitlements";
import { FREE_PLAN_DEFAULTS } from "@/lib/constants";

export class ModuleDisabledError extends Error {
  readonly code = "MODULE_DISABLED" as const;
  constructor(public readonly moduleId: string) {
    super(`Module disabled for tenant: ${moduleId}`);
    this.name = "ModuleDisabledError";
  }
}

export type ResolvedEntitlements = {
  plan: string;
  modules: Record<string, boolean>;
  limits: Record<string, number>;
};

/**
 * Resolves plan defaults + tenant overrides. Missing module key → false
 * except we treat explicit `true` from free defaults as open.
 */
export async function getTenantEntitlements(
  tenantId: string,
): Promise<ResolvedEntitlements> {
  const [row] = await db
    .select()
    .from(tenantEntitlements)
    .where(eq(tenantEntitlements.tenantId, tenantId))
    .limit(1);

  let planDefaults: PlanDefaults = FREE_PLAN_DEFAULTS;
  const planId = row?.plan ?? "free";

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  if (plan?.defaults) {
    planDefaults = plan.defaults;
  }

  return {
    plan: planId,
    modules: {
      ...(planDefaults.modules ?? {}),
      ...(row?.modules ?? {}),
    },
    limits: {
      ...(planDefaults.limits ?? {}),
      ...(row?.limits ?? {}),
    },
  };
}

export async function isModuleEnabled(
  tenantId: string,
  moduleId: string,
): Promise<boolean> {
  const ent = await getTenantEntitlements(tenantId);
  return ent.modules[moduleId] === true;
}

export async function requireModule(
  tenantId: string,
  moduleId: string,
): Promise<ResolvedEntitlements> {
  const ent = await getTenantEntitlements(tenantId);
  if (ent.modules[moduleId] !== true) {
    throw new ModuleDisabledError(moduleId);
  }
  return ent;
}
