import "server-only";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import {
  billingCustomers,
  billingEvents,
  subscriptions,
  tenantEntitlements,
} from "@/db/schema";
import { grantCredits } from "@/lib/credits";
import { FREE_PLAN_DEFAULTS, FREE_PLAN_ID } from "@/lib/constants";
import {
  CREDIT_PACKS,
  PRO_PLAN,
  getAppUrl,
  isCreditPackId,
} from "./config";
import {
  BillingConfigurationError,
  type BillingProvider,
  type BillingTenant,
  type CheckoutResult,
  type CreditPackId,
  type WebhookResult,
} from "./types";
import { requireStripeModeSafe } from "./mode";
import { logEvent, logFunnel } from "@/lib/observability/log";

function stripeClient(): Stripe {
  try {
    requireStripeModeSafe();
  } catch (err) {
    throw new BillingConfigurationError(
      err instanceof Error ? err.message : "Stripe mode unsafe",
    );
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new BillingConfigurationError(
      "Stripe yapılandırılmamış: STRIPE_SECRET_KEY eksik.",
    );
  }
  return new Stripe(key);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new BillingConfigurationError(
      `Stripe yapılandırılmamış: ${name} eksik.`,
    );
  }
  return value;
}

function billingReturnUrl(
  client: BillingTenant["client"],
  result: "success" | "canceled" | "portal",
) {
  if (client === "mobile") {
    return `${getAppUrl()}/api/v1/billing/return?result=${result}`;
  }
  return `${getAppUrl()}/billing`;
}

function asId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function unixDate(value: number | null | undefined): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function subscriptionPeriod(subscription: Stripe.Subscription): {
  start: Date | null;
  end: Date | null;
} {
  const raw = subscription as unknown as Record<string, unknown>;
  return {
    start: unixDate(
      typeof raw.current_period_start === "number"
        ? raw.current_period_start
        : null,
    ),
    end: unixDate(
      typeof raw.current_period_end === "number"
        ? raw.current_period_end
        : null,
    ),
  };
}

function supportedStatus(
  status: Stripe.Subscription.Status,
): typeof subscriptions.$inferInsert.status {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "unpaid"
  ) {
    return status;
  }
  return "incomplete";
}

export class StripeBillingProvider implements BillingProvider {
  readonly id = "stripe";

  private async getOrCreateCustomer(
    tenant: BillingTenant,
  ): Promise<string> {
    const [existing] = await db
      .select()
      .from(billingCustomers)
      .where(
        and(
          eq(billingCustomers.tenantId, tenant.tenantId),
          eq(billingCustomers.provider, this.id),
        ),
      )
      .limit(1);

    if (existing) return existing.customerId;

    const customer = await stripeClient().customers.create({
      email: tenant.email,
      name: tenant.name,
      metadata: { tenantId: tenant.tenantId },
    });

    const [saved] = await db
      .insert(billingCustomers)
      .values({
        tenantId: tenant.tenantId,
        provider: this.id,
        customerId: customer.id,
      })
      .onConflictDoNothing()
      .returning();

    if (saved) return saved.customerId;

    const [winner] = await db
      .select()
      .from(billingCustomers)
      .where(
        and(
          eq(billingCustomers.tenantId, tenant.tenantId),
          eq(billingCustomers.provider, this.id),
        ),
      )
      .limit(1);
    if (!winner) throw new Error("Stripe customer mapping could not be saved.");
    return winner.customerId;
  }

  async createCheckoutSession(
    tenant: BillingTenant,
  ): Promise<CheckoutResult> {
    const customer = await this.getOrCreateCustomer(tenant);
    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [
        { price: requiredEnv("STRIPE_PRO_PRICE_ID"), quantity: 1 },
      ],
      success_url:
        tenant.client === "mobile"
          ? billingReturnUrl("mobile", "success")
          : `${getAppUrl()}/billing?checkout=success`,
      cancel_url:
        tenant.client === "mobile"
          ? billingReturnUrl("mobile", "canceled")
          : `${getAppUrl()}/billing?checkout=canceled`,
      client_reference_id: tenant.tenantId,
      metadata: {
        kind: "subscription",
        tenantId: tenant.tenantId,
        plan: PRO_PLAN.id,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.tenantId,
          plan: PRO_PLAN.id,
        },
      },
    });

    if (!session.url) throw new Error("Stripe Checkout URL oluşturamadı.");
    logEvent("billing.checkout", {
      kind: "subscription",
      tenantId: tenant.tenantId,
      plan: PRO_PLAN.id,
    });
    logFunnel("funnel.checkout_started", {
      tenantId: tenant.tenantId,
      kind: "subscription",
      plan: PRO_PLAN.id,
    });
    return { url: session.url, provider: this.id };
  }

  async createCreditPackCheckout(
    tenant: BillingTenant,
    packId: CreditPackId,
  ): Promise<CheckoutResult> {
    const customer = await this.getOrCreateCustomer(tenant);
    const pack = CREDIT_PACKS[packId];
    const priceEnv =
      packId === "credits_50"
        ? "STRIPE_CREDITS_50_PRICE_ID"
        : "STRIPE_CREDITS_200_PRICE_ID";

    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [{ price: requiredEnv(priceEnv), quantity: 1 }],
      success_url:
        tenant.client === "mobile"
          ? billingReturnUrl("mobile", "success")
          : `${getAppUrl()}/billing?credits=success`,
      cancel_url:
        tenant.client === "mobile"
          ? billingReturnUrl("mobile", "canceled")
          : `${getAppUrl()}/billing?credits=canceled`,
      client_reference_id: tenant.tenantId,
      metadata: {
        kind: "credit_pack",
        tenantId: tenant.tenantId,
        packId,
        credits: String(pack.credits),
      },
    });

    if (!session.url) throw new Error("Stripe Checkout URL oluşturamadı.");
    logEvent("billing.checkout", {
      kind: "credit_pack",
      tenantId: tenant.tenantId,
      packId,
      credits: pack.credits,
    });
    logFunnel("funnel.checkout_started", {
      tenantId: tenant.tenantId,
      kind: "credit_pack",
      packId,
      credits: pack.credits,
    });
    return { url: session.url, provider: this.id };
  }

  async createCustomerPortal(
    tenantId: string,
    client: "web" | "mobile" = "web",
  ): Promise<CheckoutResult> {
    const [customer] = await db
      .select()
      .from(billingCustomers)
      .where(
        and(
          eq(billingCustomers.tenantId, tenantId),
          eq(billingCustomers.provider, this.id),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new Error("Bu tenant için Stripe müşterisi bulunamadı.");
    }

    const session = await stripeClient().billingPortal.sessions.create({
      customer: customer.customerId,
      return_url: billingReturnUrl(client, "portal"),
    });
    return { url: session.url, provider: this.id };
  }

  async handleWebhook(
    payload: string,
    signature: string,
  ): Promise<WebhookResult> {
    const event = stripeClient().webhooks.constructEvent(
      payload,
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );

    const [inserted] = await db
      .insert(billingEvents)
      .values({
        provider: this.id,
        externalEventId: event.id,
        eventType: event.type,
        status: "processing",
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      const [existing] = await db
        .select()
        .from(billingEvents)
        .where(
          and(
            eq(billingEvents.provider, this.id),
            eq(billingEvents.externalEventId, event.id),
          ),
        )
        .limit(1);

      if (!existing || existing.status !== "failed") {
        return { received: true, duplicate: true, eventType: event.type };
      }

      await db
        .update(billingEvents)
        .set({ status: "processing", error: null })
        .where(eq(billingEvents.id, existing.id));
      await this.applyEvent(event, existing.id);
      return { received: true, eventType: event.type };
    }

    try {
      await this.applyEvent(event, inserted.id);
      return { received: true, eventType: event.type };
    } catch (error) {
      await db
        .update(billingEvents)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(billingEvents.id, inserted.id));
      throw error;
    }
  }

  private async applyEvent(event: Stripe.Event, eventRowId: string) {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        session.metadata?.kind === "credit_pack"
      ) {
        const tenantId = session.metadata.tenantId;
        const packId = session.metadata.packId;
        if (!tenantId || !packId || !isCreditPackId(packId)) {
          throw new Error("Credit pack webhook metadata is invalid.");
        }
        const pack = CREDIT_PACKS[packId];
        await grantCredits(tenantId, pack.credits, "purchase", {
          relatedType: "billing_event",
          relatedId: eventRowId,
          description: `${pack.label} Stripe purchase`,
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await this.applySubscription(event.data.object);
    }

    if (event.type === "invoice.paid") {
      await this.applyPaidInvoice(event.data.object, eventRowId);
    }

    await db
      .update(billingEvents)
      .set({ status: "processed", processedAt: new Date(), error: null })
      .where(eq(billingEvents.id, eventRowId));
  }

  private async applySubscription(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata.tenantId;
    if (!tenantId) throw new Error("Subscription is missing tenantId metadata.");

    const customerId = asId(subscription.customer);
    if (!customerId) throw new Error("Subscription is missing customer.");

    const priceId = subscription.items.data[0]?.price.id ?? null;
    const period = subscriptionPeriod(subscription);
    const status = supportedStatus(subscription.status);
    const enabled = status === "active" || status === "trialing";

    await db
      .insert(billingCustomers)
      .values({
        tenantId,
        provider: this.id,
        customerId,
      })
      .onConflictDoUpdate({
        target: [billingCustomers.tenantId, billingCustomers.provider],
        set: { customerId, updatedAt: new Date() },
      });

    await db
      .insert(subscriptions)
      .values({
        tenantId,
        provider: this.id,
        customerId,
        subscriptionId: subscription.id,
        priceId,
        status,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .onConflictDoUpdate({
        target: [subscriptions.tenantId, subscriptions.provider],
        set: {
          customerId,
          subscriptionId: subscription.id,
          priceId,
          status,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        },
      });

    await db
      .update(tenantEntitlements)
      .set({
        plan: enabled ? PRO_PLAN.id : FREE_PLAN_ID,
        modules: enabled
          ? { ...PRO_PLAN.defaults.modules }
          : { ...FREE_PLAN_DEFAULTS.modules },
        limits: enabled
          ? { ...PRO_PLAN.defaults.limits }
          : { ...FREE_PLAN_DEFAULTS.limits },
        expiresAt: enabled ? period.end : null,
        updatedAt: new Date(),
      })
      .where(eq(tenantEntitlements.tenantId, tenantId));
  }

  private async applyPaidInvoice(invoice: Stripe.Invoice, eventRowId: string) {
    const raw = invoice as unknown as Record<string, unknown>;
    const parent = raw.parent as
      | {
          subscription_details?: {
            subscription?: string | { id: string };
            metadata?: Record<string, string>;
          };
        }
      | undefined;

    const subscriptionRef =
      parent?.subscription_details?.subscription ??
      (raw.subscription as string | { id: string } | undefined);
    const subscriptionId = asId(subscriptionRef);
    let tenantId = parent?.subscription_details?.metadata?.tenantId;

    if (!tenantId && subscriptionId) {
      const [row] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.provider, this.id),
            eq(subscriptions.subscriptionId, subscriptionId),
          ),
        )
        .limit(1);
      tenantId = row?.tenantId;
    }

    if (!tenantId || !subscriptionId) return;

    // One-off invoices / $0 drafts are not monthly credit periods.
    const amountPaid =
      typeof invoice.amount_paid === "number" ? invoice.amount_paid : 0;
    if (amountPaid <= 0) return;

    const periodStartUnix = resolveInvoicePeriodStart(invoice);
    if (periodStartUnix === null) return;

    // Period key lives in billing_events so replayed Stripe events and
    // duplicate invoice.paid deliveries grant at most once per period.
    const periodKey = `period:${subscriptionId}:${periodStartUnix}`;
    const [periodRow] = await db
      .insert(billingEvents)
      .values({
        provider: this.id,
        externalEventId: periodKey,
        eventType: "internal.subscription_period_grant",
        status: "processing",
      })
      .onConflictDoNothing()
      .returning();

    if (!periodRow) {
      // Already granted for this subscription period.
      return;
    }

    try {
      await grantCredits(
        tenantId,
        PRO_PLAN.monthlyCredits,
        "subscription_grant",
        {
          relatedType: "billing_event",
          relatedId: periodRow.id,
          description: `${PRO_PLAN.name} monthly credits · ${periodKey}`,
        },
      );

      await db
        .update(billingEvents)
        .set({
          status: "processed",
          processedAt: new Date(),
          error: null,
        })
        .where(eq(billingEvents.id, periodRow.id));

      logEvent("billing.webhook", {
        kind: "subscription_period_grant",
        tenantId,
        periodKey,
        credits: PRO_PLAN.monthlyCredits,
        stripeEventRowId: eventRowId,
      });
    } catch (error) {
      await db
        .update(billingEvents)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(billingEvents.id, periodRow.id));
      throw error;
    }
  }
}

function resolveInvoicePeriodStart(invoice: Stripe.Invoice): number | null {
  const lines = invoice.lines?.data ?? [];
  for (const line of lines) {
    const period = (line as { period?: { start?: number } }).period;
    if (typeof period?.start === "number") return period.start;
  }
  const raw = invoice as unknown as { period_start?: number };
  return typeof raw.period_start === "number" ? raw.period_start : null;
}
