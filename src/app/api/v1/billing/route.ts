import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import {
  ApiError,
  apiFailure,
  apiOptions,
  apiSuccess,
  readJson,
} from "@/lib/api/http";
import { LocalizedError } from "@/lib/i18n/error";
import { requireApiOnboardedTenant } from "@/lib/auth/api-session";
import {
  BillingConfigurationError,
  CREDIT_PACKS,
  PRO_PLAN,
  createCheckoutSession,
  createCreditPackCheckout,
  createCustomerPortal,
  detectStripeMode,
} from "@/lib/billing";
import { getTenantEntitlements } from "@/lib/entitlements/check";

const checkoutSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("subscription") }),
  z.object({
    kind: z.literal("credit_pack"),
    packId: z.enum(["credits_50", "credits_200"]),
  }),
  z.object({ kind: z.literal("portal") }),
]);

export async function GET(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    const [entitlements, subscription] = await Promise.all([
      getTenantEntitlements(context.tenant.id),
      db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, context.tenant.id),
            eq(subscriptions.provider, "stripe"),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    const mode = detectStripeMode();
    return apiSuccess({
      configured: mode !== "unconfigured",
      mode,
      plan: entitlements.plan,
      isPro:
        entitlements.plan === PRO_PLAN.id &&
        (subscription?.status === "active" ||
          subscription?.status === "trialing"),
      creditBalance: context.tenant.creditBalance,
      subscriptionStatus: subscription?.status,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString(),
      pro: {
        name: PRO_PLAN.name,
        priceCents: PRO_PLAN.priceCents,
        currency: PRO_PLAN.currency,
        monthlyCredits: PRO_PLAN.monthlyCredits,
      },
      creditPacks: Object.values(CREDIT_PACKS),
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiOnboardedTenant(request);
    if (context.role === "member") {
      throw new ApiError(403, "manager_required", "billing.error.role");
    }
    const input = checkoutSchema.parse(await readJson(request));
    const tenant = {
      tenantId: context.tenant.id,
      email: context.user.email,
      name: context.tenant.name,
      client: "mobile" as const,
    };
    const result =
      input.kind === "subscription"
        ? await createCheckoutSession(tenant)
        : input.kind === "credit_pack"
          ? await createCreditPackCheckout(tenant, input.packId)
          : await createCustomerPortal(context.tenant.id, "mobile");
    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      return apiFailure(ApiError.passthrough(503, error.code, error.message));
    }
    if (error instanceof ZodError) {
      return apiFailure(
        new ApiError(
          422,
          "invalid_checkout",
          "api.error.invalidData",
          undefined,
          error.issues,
        ),
      );
    }
    if (error instanceof LocalizedError) {
      return apiFailure(ApiError.from(400, "billing_failed", error));
    }
    return apiFailure(error);
  }
}

export const OPTIONS = apiOptions;
