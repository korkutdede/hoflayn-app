import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { getTranslator } from "@/lib/i18n/server";
import { getSupportEmail, supportMailto } from "@/lib/support";
import { WorkshopSettingsForm } from "./_components/workshop-settings-form";
import {
  ContentLanguageSwitcher,
  LanguageSwitcher,
} from "@/components/language-switcher";
import { tenantContentLocale } from "@/lib/i18n/content";
import { tenantCurrency } from "@/lib/tenant/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, tenant, role } = await requireOnboardedTenant();
  const t = await getTranslator();

  const supportHref = supportMailto({
    subject: t("settings.support.mail.subject", { slug: tenant.slug }),
    body: t("settings.support.mail.body", {
      name: tenant.name,
      email: user.email,
    }),
  });

  const deleteHref = supportMailto({
    subject: t("settings.delete.mail.subject", { slug: tenant.slug }),
    body: t("settings.delete.mail.body", {
      name: tenant.name,
      email: user.email,
      tenantId: tenant.id,
    }),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-zinc-500">{t("settings.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {t("nav.settings")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.workshop.title")}</CardTitle>
          <CardDescription>
            {t("settings.workshop.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkshopSettingsForm
            defaultName={tenant.name}
            defaultCategory={tenant.craftCategory}
            defaultCurrency={tenantCurrency(tenant)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language.title")}</CardTitle>
          <CardDescription>
            {t("settings.language.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.contentLanguage.title")}</CardTitle>
          <CardDescription>
            {t("settings.contentLanguage.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ContentLanguageSwitcher
            active={tenantContentLocale(tenant)}
            readOnly={role === "member"}
          />
          {role === "member" ? (
            <p className="text-sm text-zinc-500">
              {t("settings.contentLanguage.readOnly")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.support.title")}</CardTitle>
          <CardDescription>
            {t("settings.support.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href={supportHref}>
              {t("settings.support.cta", { email: getSupportEmail() })}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.delete.title")}</CardTitle>
          <CardDescription>{t("settings.delete.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href={deleteHref}>{t("settings.delete.cta")}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
