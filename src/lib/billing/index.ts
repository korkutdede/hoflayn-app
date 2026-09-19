import "server-only";
import { StripeBillingProvider } from "./stripe";
import type {
  BillingProvider,
  BillingTenant,
  CheckoutResult,
  CreditPackId,
  WebhookResult,
} from "./types";

export function getBillingProvider(): BillingProvider {
  return new StripeBillingProvider();
}

export function createCheckoutSession(
  tenant: BillingTenant,
): Promise<CheckoutResult> {
  return getBillingProvider().createCheckoutSession(tenant);
}

export function createCreditPackCheckout(
  tenant: BillingTenant,
  packId: CreditPackId,
): Promise<CheckoutResult> {
  return getBillingProvider().createCreditPackCheckout(tenant, packId);
}

export function createCustomerPortal(
  tenantId: string,
  client?: "web" | "mobile",
): Promise<CheckoutResult> {
  return getBillingProvider().createCustomerPortal(tenantId, client);
}

export function handleWebhook(
  payload: string,
  signature: string,
): Promise<WebhookResult> {
  return getBillingProvider().handleWebhook(payload, signature);
}

export { CREDIT_PACKS, PRO_PLAN } from "./config";
export {
  MANAGER_REQUIRED_BILLING_KEY,
  billingReturnBanner,
  canStartBillingCheckout,
  isKnownCreditPackId,
  listCreditPacks,
} from "./packs";
export {
  assertStripeModeSafe,
  detectStripeMode,
  getStripeSecretKey,
  type StripeMode,
} from "./mode";
export {
  BillingConfigurationError,
  type BillingTenant,
  type CheckoutResult,
  type CreditPackId,
  type WebhookResult,
} from "./types";
