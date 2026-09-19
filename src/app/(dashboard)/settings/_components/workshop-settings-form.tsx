"use client";

import { useActionState } from "react";
import {
  updateWorkshopSettingsAction,
  type SettingsActionState,
} from "../_actions/settings-actions";
import {
  CRAFT_CATEGORIES,
  craftDescriptionKey,
  craftLabelKey,
} from "@/lib/craft/categories";
import { useTranslator } from "@/lib/i18n/client";
import { SUPPORTED_CURRENCIES } from "@/lib/tenant/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SettingsActionState = {};

export function WorkshopSettingsForm({
  defaultName,
  defaultCategory,
  defaultCurrency,
}: {
  defaultName: string;
  defaultCategory: string | null;
  defaultCurrency: string;
}) {
  const [state, action, pending] = useActionState(
    updateWorkshopSettingsAction,
    initial,
  );
  const t = useTranslator();

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t("onboarding.name")}</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultName}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t("settings.currency")}</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={defaultCurrency}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {t(`currency.${code}`)}
            </option>
          ))}
        </select>
        <p className="text-sm text-zinc-500">
          {t("settings.currency.hint")}
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-700">
          {t("settings.craftLegend")}
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {CRAFT_CATEGORIES.map((cat) => (
            <label
              key={cat.id}
              className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
            >
              <input
                type="radio"
                name="craftCategory"
                value={cat.id}
                required
                className="mt-1 accent-zinc-900"
                defaultChecked={
                  (defaultCategory ?? "ceramics") === cat.id
                }
              />
              <span>
                <span className="block font-medium text-zinc-900">
                  {t(craftLabelKey(cat.id))}
                </span>
                <span className="mt-0.5 block text-zinc-500">
                  {t(craftDescriptionKey(cat.id))}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("settings.saving") : t("settings.save")}
      </Button>
    </form>
  );
}
