import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";
import { MARKETPLACE_ORIGIN } from "@/lib/marketplace";

export default async function HomePage() {
  const t = await getTranslator();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          {t("app.name")}
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-900">
          {t("landing.title")}
        </h1>
        <p className="mx-auto max-w-md text-zinc-600">{t("landing.subtitle")}</p>
        <p className="mx-auto max-w-lg text-sm leading-6 text-zinc-500">
          {t("landing.relation")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/signup">{t("landing.cta.signup")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">{t("landing.cta.login")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <a href={MARKETPLACE_ORIGIN} rel="noreferrer">
            {t("landing.cta.marketplace")}
          </a>
        </Button>
      </div>
      <SiteFooter />
    </main>
  );
}
