"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import {
  BridgeConfigurationError,
  BridgeExportError,
  exportProduct,
} from "@/lib/bridge";
import { getTranslator } from "@/lib/i18n/server";

export type ExportActionState = {
  ok?: boolean;
  error?: string;
  status?: string;
  externalId?: string | null;
};

export async function exportProductToHoflaynWebAction(
  prev: ExportActionState,
  formData: FormData,
): Promise<ExportActionState> {
  void prev;
  const { tenant, user, role } = await requireOnboardedTenant();
  const t = await getTranslator();
  const productId = String(formData.get("productId") ?? "");
  const operation =
    formData.get("operation") === "archive" ? "archive" : "upsert";

  if (role === "member") {
    return { ok: false, error: t("bridge.error.role") };
  }

  if (!z.string().uuid().safeParse(productId).success) {
    return { ok: false, error: t("products.error.invalidProduct") };
  }

  try {
    const result = await exportProduct({
      tenantId: tenant.id,
      productId,
      userEmail: user.email,
      operation,
    });

    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");

    return {
      ok: true,
      status: result.status,
      externalId: result.externalId,
    };
  } catch (err) {
    if (
      err instanceof BridgeConfigurationError ||
      err instanceof BridgeExportError
    ) {
      return { ok: false, error: t(err.messageKey, err.vars) };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : t("bridge.error.exportFailed"),
    };
  }
}
