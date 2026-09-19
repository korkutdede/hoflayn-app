"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKS } from "@/lib/billing/config";
import { useTranslator } from "@/lib/i18n/client";
import {
  openCustomerPortal,
  startCreditCheckout,
  startProCheckout,
  type BillingActionState,
} from "../_actions/billing-actions";

const initial: BillingActionState = {};

function ErrorText({ text }: { text?: string }) {
  return text ? (
    <p className="text-sm text-red-600" role="alert">
      {text}
    </p>
  ) : null;
}

export function ProCheckoutButton({ isPro }: { isPro: boolean }) {
  const [state, action, pending] = useActionState(startProCheckout, initial);
  const [portalState, portalAction, portalPending] = useActionState(
    openCustomerPortal,
    initial,
  );
  const t = useTranslator();

  if (isPro) {
    return (
      <div className="space-y-2">
        <form action={portalAction}>
          <Button type="submit" variant="outline" disabled={portalPending}>
            {portalPending
              ? t("billing.managePortalOpening")
              : t("billing.managePortal")}
          </Button>
        </form>
        <ErrorText text={portalState.error} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending ? t("billing.upgradeOpening") : t("billing.upgrade")}
        </Button>
      </form>
      <ErrorText text={state.error} />
    </div>
  );
}

export function CreditPackButtons() {
  const [state, action, pending] = useActionState(
    startCreditCheckout,
    initial,
  );
  const t = useTranslator();

  return (
    <div className="space-y-3">
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        {Object.values(CREDIT_PACKS).map((pack) => (
          <Button
            key={pack.id}
            type="submit"
            name="packId"
            value={pack.id}
            variant="outline"
            disabled={pending}
            className="h-auto justify-between py-3"
          >
            <span>{t("billing.packs.label", { credits: pack.credits })}</span>
            <span>${(pack.priceCents / 100).toFixed(2)}</span>
          </Button>
        ))}
      </form>
      <ErrorText text={state.error} />
    </div>
  );
}
