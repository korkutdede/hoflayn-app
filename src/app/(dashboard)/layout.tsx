import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslator();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            {t("app.name")}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <Link href="/dashboard" className="hover:text-zinc-900">
              {t("nav.dashboard")}
            </Link>
            <Link href="/studio" className="hover:text-zinc-900">
              {t("nav.studio")}
            </Link>
            <Link href="/products" className="hover:text-zinc-900">
              {t("nav.products")}
            </Link>
            <Link href="/billing" className="hover:text-zinc-900">
              {t("nav.billing")}
            </Link>
            <Link href="/settings" className="hover:text-zinc-900">
              {t("nav.settings")}
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
