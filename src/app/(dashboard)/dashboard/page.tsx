import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { signOutAction } from "@/lib/auth/actions";
import { db } from "@/db";
import { aiJobs } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TestAiJobButton } from "./_components/test-ai-job-button";
import { BetaWelcomeStrip } from "./_components/beta-welcome-strip";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { EmptyState } from "@/components/empty-state";
import { getTenantCostSummary } from "@/lib/ai/cost-summary";
import { getBetaWelcomeProgress } from "@/lib/beta/welcome-progress";
import { getPluralTranslator, getTranslator } from "@/lib/i18n/server";
import { supportMailto } from "@/lib/support";

export const dynamic = "force-dynamic";

const USAGE_WINDOW_DAYS = 7;

export default async function DashboardPage() {
  const { user, tenant, role } = await requireOnboardedTenant();
  const [t, tPlural] = await Promise.all([
    getTranslator(),
    getPluralTranslator(),
  ]);

  const supportHref = supportMailto({
    subject: t("dashboard.support.mail.subject", { slug: tenant.slug }),
    body: t("dashboard.support.mail.body", {
      name: tenant.name,
      email: user.email,
    }),
  });

  let recentJobs: (typeof aiJobs.$inferSelect)[] = [];
  let costSummary = {
    windowDays: USAGE_WINDOW_DAYS,
    estimatedUsd: 0,
    creditsUsed: 0,
    jobCount: 0,
    succeededJobs: 0,
  };
  let welcomeProgress = {
    studioPhoto: false,
    productCreated: false,
    captionGenerated: false,
    allDone: false,
  };

  if (process.env.DATABASE_URL) {
    try {
      const [jobs, summary, progress] = await Promise.all([
        db
          .select()
          .from(aiJobs)
          .where(eq(aiJobs.tenantId, tenant.id))
          .orderBy(desc(aiJobs.createdAt))
          .limit(5),
        getTenantCostSummary(tenant.id, USAGE_WINDOW_DAYS),
        getBetaWelcomeProgress(tenant.id),
      ]);
      recentJobs = jobs;
      costSummary = summary;
      welcomeProgress = progress;
    } catch {
      recentJobs = [];
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{t("dashboard.eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {tenant.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {user.email} · {role}
            {tenant.craftCategory ? ` · ${tenant.craftCategory}` : ""}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            {t("nav.signOut")}
          </Button>
        </form>
      </div>

      <BetaWelcomeStrip progress={welcomeProgress} />

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.credits.title")}</CardTitle>
          <CardDescription>
            {t("dashboard.credits.costs", {
              removeBg: CREDIT_COSTS.remove_bg,
              whiteBg: CREDIT_COSTS.white_bg,
              description: CREDIT_COSTS.generate_description,
              caption: CREDIT_COSTS.generate_caption,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4">
            <p className="text-4xl font-semibold tabular-nums text-zinc-900">
              {tenant.creditBalance}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/billing">{t("dashboard.credits.cta")}</Link>
            </Button>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {t("dashboard.slugLabel")}:{" "}
            <code className="text-zinc-700">{tenant.slug}</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {tPlural("dashboard.usage.title", costSummary.windowDays)}
          </CardTitle>
          <CardDescription>{t("dashboard.usage.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {t("dashboard.usage.credits")}
              </dt>
              <dd className="text-xl font-semibold tabular-nums text-zinc-900">
                {costSummary.creditsUsed}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {t("dashboard.usage.usd")}
              </dt>
              <dd className="text-xl font-semibold tabular-nums text-zinc-900">
                ${costSummary.estimatedUsd.toFixed(3)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {t("dashboard.usage.jobs")}
              </dt>
              <dd className="text-xl font-semibold tabular-nums text-zinc-900">
                {costSummary.jobCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {t("dashboard.usage.succeeded")}
              </dt>
              <dd className="text-xl font-semibold tabular-nums text-zinc-900">
                {costSummary.succeededJobs}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.studio.title")}</CardTitle>
          <CardDescription>{t("dashboard.studio.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/studio">{t("dashboard.studio.cta")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">{t("nav.products")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.testJob.title")}</CardTitle>
          <CardDescription>
            {t("dashboard.testJob.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestAiJobButton />
          {recentJobs.length > 0 ? (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {recentJobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="truncate text-zinc-700">
                    {job.module}/{job.operation}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {job.status}
                    {job.creditsCharged > 0
                      ? ` · −${job.creditsCharged}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t("dashboard.jobs.empty.title")}
              description={t("dashboard.jobs.empty.description")}
              actionHref="/products"
              actionLabel={t("dashboard.jobs.empty.action")}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("beta.problem")}</CardTitle>
          <CardDescription>
            {t("dashboard.support.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href={supportHref}>{t("dashboard.support.cta")}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
