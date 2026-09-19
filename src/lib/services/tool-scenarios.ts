import "server-only";
import { LocalizedError } from "@/lib/i18n/error";
import {
  CalcError,
  calculateDesi,
  calculateProfit,
  formatCalcMessages,
} from "@hoflayn/calc";
import type { Translator } from "@hoflayn/i18n";
import { getTranslator } from "@/lib/i18n/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, toolScenarios } from "@/db/schema";
import type { TenantContext } from "@/lib/auth/session";
import { updateProduct } from "@/lib/services/products";

const desiInputsSchema = z.object({
  lengthCm: z.coerce.number().positive(),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().min(0).nullable().optional(),
  carrierId: z.enum(["yurtici", "aras", "mng", "custom"]).optional(),
  divisor: z.coerce.number().positive().nullable().optional(),
});

const expenseCategorySchema = z.enum([
  "materials",
  "labor",
  "packaging",
  "commission",
  "shipping",
  "other",
]);

const profitInputsSchema = z.object({
  components: z.object({
    materials: z.string().optional().nullable(),
    labor: z.string().optional().nullable(),
    packaging: z.string().optional().nullable(),
    commission: z.string().optional().nullable(),
    shipping: z.string().optional().nullable(),
    other: z.string().optional().nullable(),
  }),
  sellPrice: z.string().optional().nullable(),
  targetMarginPercent: z.coerce.number().min(0).lt(100).nullable().optional(),
  quantity: z.coerce.number().int().positive().nullable().optional(),
  commissionPercent: z.coerce.number().min(0).lt(100).nullable().optional(),
  /** Gider defteri satırı; hesap motoru için opsiyonel meta. */
  ledger: z
    .object({
      category: expenseCategorySchema,
      note: z.string().trim().max(200).nullable().optional(),
      occurredAt: z.string().datetime().nullable().optional(),
    })
    .optional(),
});

export const toolScenarioInputSchema = z.object({
  kind: z.enum(["desi", "profit"]),
  name: z.string().trim().min(2).max(120),
  productId: z.string().uuid().nullable().optional().default(null),
  currency: z.string().trim().min(3).max(3).optional().default("TRY"),
  inputs: z.record(z.string(), z.unknown()),
});

export const applyScenarioSchema = z.object({
  applyCostPrice: z.boolean().optional().default(false),
  applyDimensions: z.boolean().optional().default(false),
  applySellPrice: z.boolean().optional().default(false),
});

function computeResults(kind: "desi" | "profit", inputs: Record<string, unknown>) {
  try {
    if (kind === "desi") {
      return calculateDesi(desiInputsSchema.parse(inputs));
    }
    const parsed = profitInputsSchema.parse(inputs);
    const { ledger: _ledger, ...profitInput } = parsed;
    void _ledger;
    return calculateProfit(profitInput);
  } catch (error) {
    if (error instanceof CalcError) {
      throw new LocalizedError(error.messageKey, error.vars);
    }
    throw error;
  }
}

function localizeResults(
  results: Record<string, unknown>,
  t: Translator,
): Record<string, unknown> {
  const assumptions = results.assumptions;
  if (!Array.isArray(assumptions)) return results;
  return {
    ...results,
    assumptions: formatCalcMessages(
      assumptions as Parameters<typeof formatCalcMessages>[0],
      t,
    ),
  };
}

async function serialize(row: typeof toolScenarios.$inferSelect) {
  const t = await getTranslator();
  return {
    id: row.id,
    productId: row.productId,
    kind: row.kind,
    name: row.name,
    currency: row.currency,
    inputs: row.inputs,
    results: localizeResults(row.results as Record<string, unknown>, t),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertProduct(
  tenantId: string,
  productId: string | null | undefined,
) {
  if (!productId) return;
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new LocalizedError("products.error.notFound");
}

export async function listToolScenarios(
  tenantId: string,
  kind?: "desi" | "profit",
) {
  const rows = await db
    .select()
    .from(toolScenarios)
    .where(
      kind
        ? and(eq(toolScenarios.tenantId, tenantId), eq(toolScenarios.kind, kind))
        : eq(toolScenarios.tenantId, tenantId),
    )
    .orderBy(desc(toolScenarios.updatedAt))
    .limit(100);
  return Promise.all(rows.map(serialize));
}

export async function getToolScenario(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(toolScenarios)
    .where(and(eq(toolScenarios.id, id), eq(toolScenarios.tenantId, tenantId)))
    .limit(1);
  return row ? serialize(row) : null;
}

export async function createToolScenario(
  context: TenantContext,
  rawInput: unknown,
) {
  const input = toolScenarioInputSchema.parse(rawInput);
  await assertProduct(context.tenant.id, input.productId);
  const results = computeResults(input.kind, input.inputs);
  const [row] = await db
    .insert(toolScenarios)
    .values({
      tenantId: context.tenant.id,
      productId: input.productId,
      kind: input.kind,
      name: input.name,
      currency: input.currency.toUpperCase(),
      inputs: input.inputs,
      results: results as unknown as Record<string, unknown>,
    })
    .returning();
  if (!row) throw new LocalizedError("scenarios.error.saveFailed");
  return serialize(row);
}

export async function updateToolScenario(
  context: TenantContext,
  id: string,
  rawInput: unknown,
) {
  const input = toolScenarioInputSchema.partial().parse(rawInput);
  const existing = await getToolScenario(context.tenant.id, id);
  if (!existing) return null;
  const kind = input.kind ?? existing.kind;
  const scenarioInputs = input.inputs ?? existing.inputs;
  await assertProduct(
    context.tenant.id,
    input.productId === undefined ? existing.productId : input.productId,
  );
  const results = computeResults(kind, scenarioInputs);
  const [row] = await db
    .update(toolScenarios)
    .set({
      kind,
      name: input.name ?? existing.name,
      productId:
        input.productId === undefined ? existing.productId : input.productId,
      currency: (input.currency ?? existing.currency).toUpperCase(),
      inputs: scenarioInputs,
      results: results as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(
      and(eq(toolScenarios.id, id), eq(toolScenarios.tenantId, context.tenant.id)),
    )
    .returning();
  return row ? serialize(row) : null;
}

export async function deleteToolScenario(tenantId: string, id: string) {
  const [row] = await db
    .delete(toolScenarios)
    .where(and(eq(toolScenarios.id, id), eq(toolScenarios.tenantId, tenantId)))
    .returning({ id: toolScenarios.id });
  return Boolean(row);
}

export async function applyToolScenarioToProduct(
  context: TenantContext,
  scenarioId: string,
  rawOptions: unknown,
) {
  const options = applyScenarioSchema.parse(rawOptions);
  const scenario = await getToolScenario(context.tenant.id, scenarioId);
  if (!scenario) throw new LocalizedError("scenarios.error.notFound");
  if (!scenario.productId) {
    throw new LocalizedError("scenarios.error.productRequired");
  }
  if (!options.applyCostPrice && !options.applyDimensions && !options.applySellPrice) {
    throw new LocalizedError("scenarios.error.fieldRequired");
  }

  const product = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, scenario.productId),
        eq(products.tenantId, context.tenant.id),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!product) throw new LocalizedError("products.error.notFound");

  const next = {
    name: product.name,
    description: product.description ?? "",
    price: product.price ?? "",
    costPrice: product.costPrice ?? "",
    stockQuantity: product.stockQuantity,
    category: product.category ?? "",
    tags: product.tags ?? "",
    coverImageId: product.coverImageId,
    lengthCm: product.lengthCm ?? "",
    widthCm: product.widthCm ?? "",
    heightCm: product.heightCm ?? "",
    weightKg: product.weightKg ?? "",
  };

  if (scenario.kind === "desi" && options.applyDimensions) {
    const inputs = desiInputsSchema.parse(scenario.inputs);
    next.lengthCm = inputs.lengthCm.toFixed(2);
    next.widthCm = inputs.widthCm.toFixed(2);
    next.heightCm = inputs.heightCm.toFixed(2);
    next.weightKg =
      inputs.weightKg == null ? "" : Number(inputs.weightKg).toFixed(3);
  }

  if (scenario.kind === "profit") {
    const results = scenario.results as {
      unitCost?: string;
      targetPrice?: string | null;
      sellPrice?: string | null;
    };
    if (options.applyCostPrice && results.unitCost) {
      next.costPrice = results.unitCost;
    }
    if (options.applySellPrice) {
      next.price = results.targetPrice || results.sellPrice || next.price;
    }
  }

  return updateProduct(context.tenant.id, scenario.productId, next);
}
