import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiJobs, tenants } from "@/db/schema";
import type { TenantContext } from "@/lib/auth/session";
import {
  CRAFT_CATEGORY_IDS,
  parseCraftCategories,
  serializeCraftCategories,
} from "@/lib/craft/categories";
import { tenantContentLocale } from "@/lib/i18n/content";
import { logFunnel } from "@/lib/observability/log";
import { SUPPORTED_CURRENCIES, tenantCurrency } from "@/lib/tenant/currency";
import { LOCALES } from "@hoflayn/i18n";

export const workshopInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    contentLocale: z.enum(LOCALES).optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    craftCategory: z.enum(CRAFT_CATEGORY_IDS).optional(),
    craftCategories: z
      .array(z.enum(CRAFT_CATEGORY_IDS))
      .min(1)
      .max(3)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.craftCategories?.length && !value.craftCategory) {
      ctx.addIssue({
        code: "custom",
        // Surfaces in `details`, so it stays a key the client can translate.
        message: "craft.error.required",
        path: ["craftCategories"],
      });
    }
  })
  .transform((value) => {
    const craftCategories = value.craftCategories?.length
      ? value.craftCategories
      : value.craftCategory
        ? [value.craftCategory]
        : [];
    return {
      name: value.name,
      contentLocale: value.contentLocale,
      currency: value.currency,
      craftCategories,
      craftCategory: serializeCraftCategories(craftCategories),
    };
  });

export async function completeWorkshop(
  context: TenantContext,
  input: unknown,
) {
  const parsed = workshopInputSchema.parse(input);
  const [tenant] = await db
    .update(tenants)
    .set({
      name: parsed.name,
      craftCategory: parsed.craftCategory,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, context.tenant.id))
    .returning();

  logFunnel("funnel.onboarding_done", {
    tenantId: context.tenant.id,
    craftCategory: parsed.craftCategory,
  });

  return tenant;
}

export async function updateWorkshop(
  context: TenantContext,
  input: unknown,
) {
  const parsed = workshopInputSchema.parse(input);
  const [tenant] = await db
    .update(tenants)
    .set({
      name: parsed.name,
      craftCategory: parsed.craftCategory,
      // Omitted leaves the workshop's current setting untouched.
      ...(parsed.contentLocale ? { contentLocale: parsed.contentLocale } : {}),
      ...(parsed.currency ? { currency: parsed.currency } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, context.tenant.id))
    .returning();
  if (!tenant) throw new LocalizedError("workshop.error.notFound");
  return tenant;
}

export async function getMobileMe(context: TenantContext) {
  const jobs = await db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.tenantId, context.tenant.id))
    .orderBy(desc(aiJobs.createdAt))
    .limit(5);
  const craftCategories = parseCraftCategories(context.tenant.craftCategory);

  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      fullName: context.user.fullName,
    },
    workshop: {
      id: context.tenant.id,
      name: context.tenant.name,
      slug: context.tenant.slug,
      craftCategory: craftCategories[0] ?? null,
      craftCategories,
      contentLocale: tenantContentLocale(context.tenant),
      currency: tenantCurrency(context.tenant),
      creditBalance: context.tenant.creditBalance,
      role: context.role,
    },
    needsOnboarding: craftCategories.length === 0,
    recentJobs: jobs.map((job) => ({
      id: job.id,
      operation: job.operation,
      status: job.status,
      creditsCharged: job.creditsCharged,
      createdAt: job.createdAt.toISOString(),
      beforeUrl:
        typeof job.input?.imageUrl === "string" ? job.input.imageUrl : undefined,
      afterUrl:
        typeof job.output?.imageUrl === "string"
          ? job.output.imageUrl
          : undefined,
    })),
  };
}
