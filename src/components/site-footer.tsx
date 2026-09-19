import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { MARKETPLACE_ORIGIN } from "@/lib/marketplace";

export async function SiteFooter() {
  const t = await getTranslator();
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-6 text-xs text-zinc-500">
      <a
        href={MARKETPLACE_ORIGIN}
        className="hover:text-zinc-800"
        rel="noreferrer"
      >
        {t("landing.legal.marketplace")}
      </a>
      <Link href="/privacy" className="hover:text-zinc-800">
        {t("landing.legal.privacy")}
      </Link>
      <Link href="/terms" className="hover:text-zinc-800">
        {t("landing.legal.terms")}
      </Link>
      <Link href="/account-delete" className="hover:text-zinc-800">
        {t("legal.delete.title")}
      </Link>
    </footer>
  );
}
