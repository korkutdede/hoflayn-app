"use client";

import { useActionState } from "react";
import {
  confirmAiDescriptionAction,
  generateProductDescriptionAction,
  type AiDescriptionState,
} from "../_actions/ai-description-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { useTranslator } from "@/lib/i18n/client";

const initial: AiDescriptionState = {};

export function AiDescriptionPanel({
  productId,
  productName,
  category,
  writerEnabled,
  creditBalance,
}: {
  productId: string;
  productName: string;
  category: string;
  writerEnabled: boolean;
  creditBalance: number;
}) {
  const [genState, genAction, genPending] = useActionState(
    generateProductDescriptionAction,
    initial,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmAiDescriptionAction,
    initial,
  );

  const blocked = !writerEnabled && !genState.usedDevBypass;
  const desc = genState.description;
  const t = useTranslator();

  return (
    <div className="space-y-4">
      {!writerEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("ai.writer.disabled")}{" "}
          {process.env.NODE_ENV === "development"
            ? t("ai.writer.devBypass")
            : t("ai.writer.upgrade")}
        </div>
      ) : null}

      <form action={genAction} className="space-y-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="productName" value={productName} />
        <input type="hidden" name="category" value={category} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="material">{t("ai.description.material")}</Label>
            <Input
              id="material"
              name="material"
              placeholder={t("ai.description.materialPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">{t("ai.description.audience")}</Label>
            <Input
              id="audience"
              name="audience"
              placeholder={t("ai.description.audiencePlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="features">{t("ai.description.features")}</Label>
          <Input
            id="features"
            name="features"
            placeholder={t("ai.description.featuresPlaceholder")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={
              genPending ||
              creditBalance < CREDIT_COSTS.generate_description ||
              (blocked && process.env.NODE_ENV === "production")
            }
            variant={writerEnabled ? "default" : "secondary"}
          >
            {genPending
              ? t("ai.generating")
              : writerEnabled
                ? t("ai.description.generate", {
                    credits: CREDIT_COSTS.generate_description,
                  })
                : t("ai.description.generateMock", {
                    credits: CREDIT_COSTS.generate_description,
                  })}
          </Button>
          <p className="text-sm text-zinc-500">
            {t("ai.balance", { credits: creditBalance })}
          </p>
        </div>
      </form>

      {genState.error ? (
        <p className="text-sm text-red-600" role="alert">
          {genState.error}
        </p>
      ) : null}

      {desc ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("ai.description.preview")}
            {genState.provider ? ` · ${genState.provider}` : ""}
          </p>
          <div>
            <p className="font-medium text-zinc-900">{desc.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{desc.shortDescription}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-700">
            {desc.longDescription}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {desc.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            SEO: {desc.seoKeywords.join(", ")}
          </p>

          <form action={confirmAction} className="pt-2">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="title" value={desc.title} />
            <input
              type="hidden"
              name="shortDescription"
              value={desc.shortDescription}
            />
            <input
              type="hidden"
              name="longDescription"
              value={desc.longDescription}
            />
            <input type="hidden" name="bullets" value={desc.bullets.join("\n")} />
            <input
              type="hidden"
              name="seoKeywords"
              value={desc.seoKeywords.join(",")}
            />
            <Button type="submit" disabled={confirmPending}>
              {confirmPending
                ? t("products.form.saving")
                : t("ai.description.save")}
            </Button>
          </form>
          {confirmState.ok ? (
            <p className="text-sm text-emerald-700" role="status">
              {t("ai.description.saved")}
            </p>
          ) : null}
          {confirmState.error ? (
            <p className="text-sm text-red-600" role="alert">
              {confirmState.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
