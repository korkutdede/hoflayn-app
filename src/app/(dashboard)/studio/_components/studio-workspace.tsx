"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createStudioJobAction,
  type StudioJobState,
} from "../_actions/create-studio-job";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { useTranslator } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const initial: StudioJobState = {};

type Mode = "remove_bg" | "white_bg";

const MODES: Mode[] = ["remove_bg", "white_bg"];

/** Mirrors MAX_BYTES in the studio action. */
const MAX_MB = 8;

export function StudioWorkspace({ creditBalance }: { creditBalance: number }) {
  const [mode, setMode] = useState<Mode>("remove_bg");
  const t = useTranslator();
  const [preview, setPreview] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    createStudioJobAction,
    initial,
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const cost = CREDIT_COSTS[mode];

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-6">
        <input type="hidden" name="mode" value={mode} />

        <div className="space-y-2">
          <Label>{t("studio.mode")}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors",
                  mode === id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:bg-zinc-50",
                )}
              >
                <p className="font-medium text-zinc-900">
                  {t(`studio.mode.${id}.title`)}
                </p>
                <p className="text-sm text-zinc-500">
                  {t("studio.mode.cost", {
                    desc: t(`studio.mode.${id}.desc`),
                    credits: CREDIT_COSTS[id],
                  })}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">{t("studio.image")}</Label>
          <label
            htmlFor="image"
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center hover:border-zinc-400"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={t("studio.alt.preview")}
                className="max-h-48 rounded object-contain"
              />
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-800">
                  {t("studio.upload.cta")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {t("studio.upload.hint", { mb: MAX_MB })}
                </p>
              </>
            )}
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (preview) URL.revokeObjectURL(preview);
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || creditBalance < cost}>
            {pending
              ? t("studio.processing")
              : t("studio.process", { credits: cost })}
          </Button>
          <p className="text-sm text-zinc-500">
            {t("studio.balanceLabel")}:{" "}
            <span className="font-medium text-zinc-800">{creditBalance}</span>
          </p>
        </div>

        {state.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>

      {(state.beforeUrl || state.afterUrl) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-800">
              {t("studio.compare")}
              {state.status ? (
                <span className="ml-2 font-normal text-zinc-500">
                  · {state.status}
                  {state.provider ? ` · ${state.provider}` : ""}
                </span>
              ) : null}
            </h2>
            {state.afterUrl ? (
              <a
                href={state.afterUrl}
                download={`hoflayn-${state.operation ?? "result"}.png`}
                className="text-sm font-medium text-zinc-900 underline"
              >
                {t("studio.download")}
              </a>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <figure className="rounded-lg border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] p-3">
              <figcaption className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.before")}
              </figcaption>
              {state.beforeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.beforeUrl}
                  alt={t("studio.alt.original")}
                  className="mx-auto max-h-64 object-contain"
                />
              ) : null}
            </figure>
            <figure className="rounded-lg border border-zinc-200 bg-white p-3">
              <figcaption className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.after")}
              </figcaption>
              {state.afterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.afterUrl}
                  alt={t("studio.alt.result")}
                  className="mx-auto max-h-64 object-contain"
                />
              ) : (
                <p className="py-12 text-center text-sm text-zinc-400">—</p>
              )}
            </figure>
          </div>
        </div>
      )}
    </div>
  );
}
