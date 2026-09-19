import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import {
  checkInviteEmail,
  inviteGateMode,
  parseBetaMaxTenants,
  type InviteCheckResult,
  type InviteGateMode,
} from "@/lib/auth/allowlist";

export async function countTenants(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenants);
  return Number(row?.count ?? 0);
}

export async function getInviteGateStatus(): Promise<{
  gate: InviteGateMode;
  maxTenants: number | null;
  tenantCount: number | null;
  remaining: number | null;
}> {
  const gate = inviteGateMode();
  const maxTenants = parseBetaMaxTenants();
  if (maxTenants == null) {
    return { gate, maxTenants: null, tenantCount: null, remaining: null };
  }
  const tenantCount = await countTenants();
  return {
    gate: gate === "closed" ? "closed" : gate,
    maxTenants,
    tenantCount,
    remaining: Math.max(0, maxTenants - tenantCount),
  };
}

export async function verifyInviteEmail(
  email: string,
): Promise<InviteCheckResult> {
  const maxTenants = parseBetaMaxTenants();
  const tenantCount =
    maxTenants != null ? await countTenants() : null;
  return checkInviteEmail(email, { tenantCount });
}
