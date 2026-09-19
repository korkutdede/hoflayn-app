import type { MessageKey } from "@hoflayn/i18n";
import { CREDIT_PACKS } from "./config";
import type { CreditPackId } from "./types";

export const MANAGER_REQUIRED_BILLING_KEY: MessageKey = "billing.error.role";

export function listCreditPacks() {
  return Object.values(CREDIT_PACKS);
}

export function isKnownCreditPackId(value: string): value is CreditPackId {
  return value === "credits_50" || value === "credits_200";
}

export function canStartBillingCheckout(
  role: "owner" | "admin" | "member" | string,
): boolean {
  return role === "owner" || role === "admin";
}

export function billingReturnBanner(
  result: string | undefined,
): { tone: "success" | "muted"; messageKey: MessageKey } | null {
  if (result === "success") {
    return { tone: "success", messageKey: "billing.return.success" };
  }
  if (result === "canceled") {
    return { tone: "muted", messageKey: "billing.return.canceled" };
  }
  return null;
}
