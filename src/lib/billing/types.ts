export type BillingTenant = {
  tenantId: string;
  email: string;
  name: string;
  client?: "web" | "mobile";
};

export type CheckoutResult = {
  url: string;
  provider: string;
};

export type CreditPackId = "credits_50" | "credits_200";

export type WebhookResult = {
  received: true;
  duplicate?: boolean;
  eventType: string;
};

export interface BillingProvider {
  readonly id: string;
  createCheckoutSession(tenant: BillingTenant): Promise<CheckoutResult>;
  createCreditPackCheckout(
    tenant: BillingTenant,
    packId: CreditPackId,
  ): Promise<CheckoutResult>;
  createCustomerPortal(
    tenantId: string,
    client?: "web" | "mobile",
  ): Promise<CheckoutResult>;
  handleWebhook(payload: string, signature: string): Promise<WebhookResult>;
}

export class BillingConfigurationError extends Error {
  readonly code = "BILLING_NOT_CONFIGURED" as const;

  constructor(message: string) {
    super(message);
    this.name = "BillingConfigurationError";
  }
}
