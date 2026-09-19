"use server";

import type { Translator } from "@hoflayn/i18n";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { mediaAssets, products } from "@/db/schema";
import { requireOnboardedTenant } from "@/lib/auth/onboarding";
import { createSignedUrl } from "@/lib/media/storage";
import { assertStorageConfigured } from "@/lib/media/paths";
import {
  markMediaOrphanIfUnused,
  markPreviousCoverOrphan,
} from "@/lib/media/orphan";
import { getTranslator } from "@/lib/i18n/server";
import { logFunnel } from "@/lib/observability/log";

export type ProductActionState = {
  error?: string;
  success?: string;
};

const NAME_MIN_LENGTH = 2;

function productSchema(t: Translator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(
        NAME_MIN_LENGTH,
        t("products.error.nameMin", { min: NAME_MIN_LENGTH }),
      )
      .max(160),
    description: z.string().trim().max(8000).optional().or(z.literal("")),
    price: z.string().trim().optional().or(z.literal("")),
    costPrice: z.string().trim().optional().or(z.literal("")),
    stockQuantity: z.coerce.number().int().min(0).default(0),
    category: z.string().trim().max(80).optional().or(z.literal("")),
    tags: z.string().trim().max(400).optional().or(z.literal("")),
    coverImageId: z.string().uuid().optional().or(z.literal("")),
  });
}

/** Messages thrown here surface verbatim in the form, so they need a locale. */
function optionalNumeric(
  value: string | undefined,
  t: Translator,
): string | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(t("products.error.invalidPrice"));
  }
  return n.toFixed(2);
}

async function assertCoverBelongsToTenant(
  tenantId: string,
  coverImageId: string | null,
  t: Translator,
) {
  if (!coverImageId) return;
  const [asset] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.id, coverImageId), eq(mediaAssets.tenantId, tenantId)),
    )
    .limit(1);
  if (!asset) {
    throw new Error(t("products.error.coverNotOwned"));
  }
}

export async function createProductAction(
  prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  void prev;
  const { tenant } = await requireOnboardedTenant();
  const t = await getTranslator();

  const parsed = productSchema(t).safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    price: formData.get("price") || "",
    costPrice: formData.get("costPrice") || "",
    stockQuantity: formData.get("stockQuantity") || 0,
    category: formData.get("category") || "",
    tags: formData.get("tags") || "",
    coverImageId: formData.get("coverImageId") || "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  try {
    const coverImageId = parsed.data.coverImageId || null;
    await assertCoverBelongsToTenant(tenant.id, coverImageId, t);

    const [row] = await db
      .insert(products)
      .values({
        tenantId: tenant.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        descriptionAiGenerated: false,
        price: optionalNumeric(parsed.data.price, t),
        costPrice: optionalNumeric(parsed.data.costPrice, t),
        stockQuantity: parsed.data.stockQuantity,
        category: parsed.data.category || null,
        tags: parsed.data.tags || null,
        coverImageId,
      })
      .returning({ id: products.id });

    if (!row) return { error: t("products.error.createFailed") };

    logFunnel("funnel.product_created", {
      tenantId: tenant.id,
      productId: row.id,
      hasCover: Boolean(coverImageId),
    });

    revalidatePath("/products");
    redirect(`/products/${row.id}`);
  } catch (err) {
    if (
      err instanceof Error &&
      "digest" in err &&
      String((err as Error & { digest?: string }).digest).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw err;
    }
    return {
      error:
        err instanceof Error ? err.message : t("products.error.createFailed"),
    };
  }
}

export async function updateProductAction(
  prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  void prev;
  const { tenant } = await requireOnboardedTenant();
  const t = await getTranslator();
  const productId = String(formData.get("productId") ?? "");

  if (!z.string().uuid().safeParse(productId).success) {
    return { error: t("products.error.invalidProduct") };
  }

  const parsed = productSchema(t).safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    price: formData.get("price") || "",
    costPrice: formData.get("costPrice") || "",
    stockQuantity: formData.get("stockQuantity") || 0,
    category: formData.get("category") || "",
    tags: formData.get("tags") || "",
    coverImageId: formData.get("coverImageId") || "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  try {
    const coverImageId = parsed.data.coverImageId || null;
    await assertCoverBelongsToTenant(tenant.id, coverImageId, t);

    const [existing] = await db
      .select({ id: products.id, coverImageId: products.coverImageId })
      .from(products)
      .where(
        and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
      )
      .limit(1);

    if (!existing) return { error: t("products.error.notFound") };

    const [row] = await db
      .update(products)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: optionalNumeric(parsed.data.price, t),
        costPrice: optionalNumeric(parsed.data.costPrice, t),
        stockQuantity: parsed.data.stockQuantity,
        category: parsed.data.category || null,
        tags: parsed.data.tags || null,
        coverImageId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(products.id, productId), eq(products.tenantId, tenant.id)),
      )
      .returning({ id: products.id });

    if (!row) return { error: t("products.error.notFound") };

    await markPreviousCoverOrphan({
      tenantId: tenant.id,
      previousCoverId: existing.coverImageId,
      nextCoverId: coverImageId,
    });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: t("products.saved") };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : t("products.error.saveFailed"),
    };
  }
}

export async function deleteProductAction(
  prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  void prev;
  const { tenant, role } = await requireOnboardedTenant();
  const t = await getTranslator();
  if (role === "member") {
    return { error: t("products.error.deleteRole") };
  }
  const productId = String(formData.get("productId") ?? "");

  if (!z.string().uuid().safeParse(productId).success) {
    return { error: t("products.error.invalidProduct") };
  }

  const [existing] = await db
    .select({ id: products.id, coverImageId: products.coverImageId })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)))
    .limit(1);

  if (!existing) return { error: t("products.error.notFound") };

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenant.id)));

  await markMediaOrphanIfUnused(tenant.id, existing.coverImageId);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/products");
}

export type CoverOption = {
  id: string;
  url: string;
  kind: string;
  createdAt: string;
};

/** Studio processed/upload assets available as product covers. */
export async function listCoverOptions(
  tenantId: string,
): Promise<CoverOption[]> {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.tenantId, tenantId))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(24);

  const options: CoverOption[] = [];
  for (const row of rows) {
    let url = "";
    try {
      assertStorageConfigured();
      url = await createSignedUrl(row.path, 3600);
    } catch {
      continue;
    }
    options.push({
      id: row.id,
      url,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return options;
}
