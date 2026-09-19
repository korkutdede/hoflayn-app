"use client";

import { useActionState } from "react";
import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "../_actions/complete-onboarding";
import {
  CRAFT_CATEGORIES,
  craftDescriptionKey,
  craftLabelKey,
} from "@/lib/craft/categories";
import { useTranslator } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: OnboardingActionState = {};

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initial,
  );
  const t = useTranslator();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{t("onboarding.title")}</CardTitle>
        <CardDescription>{t("onboarding.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{t("onboarding.name")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultName}
              placeholder={t("onboarding.namePlaceholder")}
              maxLength={80}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-zinc-700">
              {t("onboarding.craftLegend")}
            </legend>
            <p className="text-sm text-zinc-500">{t("onboarding.craftHint")}</p>
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
                    defaultChecked={cat.id === "ceramics"}
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("settings.saving") : t("onboarding.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
