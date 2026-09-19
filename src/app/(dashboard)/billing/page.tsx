import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { getTenantEntitlements } from "@/lib/entitlements/check";
import { PRO_PLAN } from "@/lib/billing/config";
import { detectStripeMode } from "@/lib/billing/mode";
import { getTranslator } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreditPackButtons,
  ProCheckoutButton,
} from "./_components/billing-controls";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BillingPage({
  searchParams,
}: BillingPageProps) {
  const { tenant } = await requireOnboardedTenant();
  const [entitlements, query, t] = await Promise.all([
    getTenantEntitlements(tenant.id),
    searchParams,
    getTranslator(),
  ]);
  const stripeMode = detectStripeMode();

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, tenant.id),
        eq(subscriptions.provider, "stripe"),
      ),
    )
    .limit(1);

  const isPro =
    entitlements.plan === PRO_PLAN.id &&
    (subscription?.status === "active" || subscription?.status === "trialing");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-zinc-500">{t("billing.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {t("billing.title")}
        </h1>
      </div>

      {stripeMode === "test" ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {t("billing.testMode")}
        </p>
      ) : null}

      {query.checkout === "success" || query.credits === "success" ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {t("billing.paymentReceived")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("billing.currentPlan", {
              plan: isPro ? t("billing.plan.pro") : t("billing.plan.free"),
            })}
          </CardTitle>
          <CardDescription>
            {t("billing.creditBalance", { credits: tenant.creditBalance })}
            {subscription
              ? ` · ${t("billing.subscriptionStatus", { status: subscription.status })}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-medium">
              {t("billing.proPrice", {
                price: (PRO_PLAN.priceCents / 100).toFixed(2),
              })}
            </p>
            <p className="mt-1 text-zinc-500">
              {t("billing.proPerks", { credits: PRO_PLAN.monthlyCredits })}
            </p>
          </div>
          <ProCheckoutButton isPro={isPro} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("billing.packs.title")}</CardTitle>
          <CardDescription>{t("billing.packs.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreditPackButtons />
        </CardContent>
      </Card>
    </div>
  );
}
