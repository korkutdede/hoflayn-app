import "server-only";
import { redirect } from "next/navigation";
import {
  getCurrentTenant,
  requireTenant,
  type TenantContext,
} from "@/lib/auth/session";

export function needsOnboarding(tenant: { craftCategory: string | null }): boolean {
  return !tenant.craftCategory;
}

/**
 * Auth required; if craft category is missing, send to the one-screen onboarding.
 */
export async function requireOnboardedTenant(): Promise<TenantContext> {
  const ctx = await requireTenant();
  if (needsOnboarding(ctx.tenant)) {
    redirect("/onboarding");
  }
  return ctx;
}

/**
 * For /onboarding itself: must be logged in; if already onboarded → studio.
 */
export async function requireOnboardingPage(): Promise<TenantContext> {
  const ctx = await requireTenant();
  if (!needsOnboarding(ctx.tenant)) {
    redirect("/studio");
  }
  return ctx;
}

export async function getOnboardingRedirect(): Promise<string> {
  const ctx = await getCurrentTenant();
  if (!ctx) return "/login";
  if (needsOnboarding(ctx.tenant)) return "/onboarding";
  return "/studio";
}
