import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getTranslator } from "@/lib/i18n/server";
import { getSupportEmail, supportMailto } from "@/lib/support";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("legal.delete.title") };
}

export default async function AccountDeletePage() {
  const t = await getTranslator();
  const href = supportMailto({
    subject: t("legal.delete.mail.subject"),
    body: t("legal.delete.mail.body"),
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="underline">
          {t("legal.back")}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900">
        {t("legal.delete.title")}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{t("legal.delete.updated")}</p>
      <div className="mt-8 space-y-4 text-sm leading-6 text-zinc-700">
        <p>{t("legal.delete.p1")}</p>
        <p>{t("legal.delete.p2")}</p>
        <p>
          <a href={href} className="font-medium text-zinc-900 underline">
            {t("legal.delete.cta", { email: getSupportEmail() })}
          </a>
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
