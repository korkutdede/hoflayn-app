"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { formatInstagramCaption } from "@/lib/ai/prompts/instagram-caption";
import { useTranslator } from "@/lib/i18n/client";
import {
  generateInstagramCaptionAction,
  type InstagramCaptionState,
} from "../_actions/instagram-caption-actions";

const initialState: InstagramCaptionState = {};

export function InstagramCaptionPanel({
  productId,
  writerEnabled,
  devBypassEnabled,
  creditBalance,
}: {
  productId: string;
  writerEnabled: boolean;
  devBypassEnabled: boolean;
  creditBalance: number;
}) {
  const [state, action, pending] = useActionState(
    generateInstagramCaptionAction,
    initialState,
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const available = writerEnabled || devBypassEnabled;
  const t = useTranslator();

  async function approveAndCopy() {
    if (!state.caption) return;
    try {
      await navigator.clipboard.writeText(formatInstagramCaption(state.caption));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      {!writerEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {devBypassEnabled
            ? t("ai.writer.captionBypass")
            : t("ai.writer.captionProOnly")}
        </div>
      ) : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="productId" value={productId} />
        <div className="max-w-xs space-y-2">
          <Label htmlFor="caption-tone">{t("ai.caption.tone")}</Label>
          <select
            id="caption-tone"
            name="tone"
            defaultValue="samimi"
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            {/* Values are the prompt's tone identifiers; only labels vary. */}
            <option value="samimi">{t("ai.caption.tone.samimi")}</option>
            <option value="hikaye">{t("ai.caption.tone.hikaye")}</option>
            <option value="sade">{t("ai.caption.tone.sade")}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={
              pending ||
              !available ||
              creditBalance < CREDIT_COSTS.generate_caption
            }
            variant={writerEnabled ? "default" : "secondary"}
          >
            {pending
              ? t("ai.generating")
              : t("ai.caption.generate", {
                  credits: CREDIT_COSTS.generate_caption,
                })}
          </Button>
          <p className="text-sm text-zinc-500">
            {t("ai.balance", { credits: creditBalance })}
          </p>
        </div>
      </form>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.caption ? (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("ai.caption.preview")}
            {state.provider ? ` · ${state.provider}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-sm text-zinc-700">
            {state.caption.caption}
          </p>
          <p className="text-sm font-medium text-zinc-900">
            {state.caption.callToAction}
          </p>
          <p className="text-sm text-sky-700">
            {state.caption.hashtags.join(" ")}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={approveAndCopy}>
              {t("ai.caption.copy")}
            </Button>
            {copyStatus === "copied" ? (
              <p className="text-sm text-emerald-700" role="status">
                {t("ai.caption.copied")}
              </p>
            ) : null}
            {copyStatus === "error" ? (
              <p className="text-sm text-red-600" role="alert">
                {t("ai.caption.copyFailed")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
