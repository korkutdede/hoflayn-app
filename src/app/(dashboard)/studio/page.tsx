import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { isModuleEnabled } from "@/lib/entitlements/check";
import { getTranslator } from "@/lib/i18n/server";
import { StudioWorkspace } from "./_components/studio-workspace";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { tenant } = await requireOnboardedTenant();
  const [enabled, t] = await Promise.all([
    isModuleEnabled(tenant.id, "studio"),
    getTranslator(),
  ]);

  if (!enabled) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <EmptyState
          title={t("studio.disabled.title")}
          description={t("studio.disabled.description")}
          actionHref="/billing"
          actionLabel={t("studio.disabled.action")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-zinc-500">{t("dashboard.studio.title")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {t("studio.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {tenant.name}
          {tenant.craftCategory ? ` · ${tenant.craftCategory}` : ""}
        </p>
      </div>

      {tenant.creditBalance < 1 ? (
        <EmptyState
          title={t("studio.noCredits.title")}
          description={t("studio.noCredits.description")}
          actionHref="/billing"
          actionLabel={t("studio.noCredits.action")}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("studio.card.title")}</CardTitle>
          <CardDescription>{t("studio.card.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StudioWorkspace creditBalance={tenant.creditBalance} />
        </CardContent>
      </Card>
    </div>
  );
}
