"use server";

import { redirect } from "next/navigation";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import {
  BillingConfigurationError,
  createCheckoutSession,
  createCreditPackCheckout,
  createCustomerPortal,
  type CreditPackId,
} from "@/lib/billing";
import { isCreditPackId } from "@/lib/billing/config";
import { getTranslator } from "@/lib/i18n/server";

export type BillingActionState = {
  error?: string;
};

async function message(error: unknown): Promise<string> {
  if (error instanceof BillingConfigurationError) return error.message;
  if (error instanceof Error) return error.message;

  const t = await getTranslator();
  return t("billing.error.checkoutFailed");
}

export async function startProCheckout(
  previous: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  void previous;
  void formData;
  const { tenant, user } = await requireOnboardedTenant();

  try {
    const result = await createCheckoutSession({
      tenantId: tenant.id,
      email: user.email,
      name: tenant.name,
    });
    redirect(result.url);
  } catch (error) {
    // Next redirect throws an internal control-flow error; never swallow it.
    if (
      error instanceof Error &&
      "digest" in error &&
      String((error as Error & { digest?: string }).digest).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    return { error: await message(error) };
  }
}

export async function startCreditCheckout(
  previous: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  void previous;
  const { tenant, user } = await requireOnboardedTenant();
  const packId = String(formData.get("packId") ?? "");

  if (!isCreditPackId(packId)) {
    const t = await getTranslator();
    return { error: t("billing.error.invalidPack") };
  }

  try {
    const result = await createCreditPackCheckout(
      {
        tenantId: tenant.id,
        email: user.email,
        name: tenant.name,
      },
      packId as CreditPackId,
    );
    redirect(result.url);
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      String((error as Error & { digest?: string }).digest).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    return { error: await message(error) };
  }
}

export async function openCustomerPortal(
  previous: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  void previous;
  void formData;
  const { tenant } = await requireOnboardedTenant();

  try {
    const result = await createCustomerPortal(tenant.id);
    redirect(result.url);
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      String((error as Error & { digest?: string }).digest).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    return { error: await message(error) };
  }
}
