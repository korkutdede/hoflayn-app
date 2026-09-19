import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-footer";
import { getTranslator } from "@/lib/i18n/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslator();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900"
        >
          {t("app.name")}
        </Link>
        <LanguageSwitcher />
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
