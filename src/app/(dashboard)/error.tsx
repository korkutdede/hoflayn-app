"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslator } from "@/lib/i18n/client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslator();

  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        {t("error.eyebrow")}
      </p>
      <h1 className="text-xl font-semibold text-zinc-900">
        {t("error.title")}
      </h1>
      <p className="text-sm text-zinc-600">{t("error.description")}</p>
      {error.digest ? (
        <p className="font-mono text-xs text-zinc-400">ref: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button type="button" onClick={reset}>
          {t("error.retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("nav.dashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
