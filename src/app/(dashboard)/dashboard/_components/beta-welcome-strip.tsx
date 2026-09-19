import Link from "next/link";
import type { BetaWelcomeProgress } from "@/lib/beta/welcome-progress";
import { getTranslator } from "@/lib/i18n/server";

type StepKey = keyof Omit<BetaWelcomeProgress, "allDone">;

const STEPS: Array<{ key: StepKey; href: string }> = [
  { key: "studioPhoto", href: "/studio" },
  { key: "productCreated", href: "/products/new" },
  { key: "captionGenerated", href: "/products" },
];

export async function BetaWelcomeStrip({
  progress,
}: {
  progress: BetaWelcomeProgress;
}) {
  if (progress.allDone) return null;

  const t = await getTranslator();
  const doneCount = STEPS.filter((s) => progress[s.key]).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("welcome.eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
            {t("welcome.title")}
          </h2>
        </div>
        <p className="text-sm tabular-nums text-zinc-500">
          {t("welcome.progress", { done: doneCount, total: STEPS.length })}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {STEPS.map((step) => {
          const done = progress[step.key];
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-50"
              >
                <span
                  aria-hidden
                  className={
                    done
                      ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white"
                      : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[11px] text-zinc-400"
                  }
                >
                  {done ? "✓" : ""}
                </span>
                <span>
                  <span
                    className={
                      done
                        ? "font-medium text-zinc-500 line-through"
                        : "font-medium text-zinc-900"
                    }
                  >
                    {t(`welcome.step.${step.key}.title`)}
                  </span>
                  <span className="mt-0.5 block text-zinc-500">
                    {t(`welcome.step.${step.key}.hint`)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
