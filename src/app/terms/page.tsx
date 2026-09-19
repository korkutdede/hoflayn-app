import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("legal.terms.title") };
}

export default async function TermsPage() {
  const t = await getTranslator();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="underline">
          {t("legal.back")}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900">
        {t("legal.terms.title")}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{t("legal.terms.updated")}</p>
      <div className="mt-8 space-y-4 text-sm leading-6 text-zinc-700">
        <p>{t("legal.terms.p1")}</p>
        <p>{t("legal.terms.p2")}</p>
        <p>{t("legal.terms.p3")}</p>
        <p>{t("legal.terms.p4")}</p>
        <p>{t("legal.terms.p5")}</p>
      </div>
      <SiteFooter />
    </main>
  );
}
