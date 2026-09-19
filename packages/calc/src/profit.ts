import {
  createTranslator,
  DEFAULT_LOCALE,
  type MessageKey,
  type Translator,
} from "@hoflayn/i18n";
import { CalcError } from "./error";
import type { CalcMessage } from "./messages";
import {
  addMinor,
  formatMinor,
  parseMoneyToMinor,
  requireMoneyToMinor,
  roundMinor,
  type MoneyMinor,
} from "./money";

export type ProfitCostComponents = {
  materials?: string | null;
  labor?: string | null;
  packaging?: string | null;
  commission?: string | null;
  shipping?: string | null;
  other?: string | null;
};

export type ProfitInput = {
  components: ProfitCostComponents;
  sellPrice?: string | null;
  targetMarginPercent?: number | null;
  /**
   * Yield for materials + labor + packaging (how many units come out).
   * Shipping / other are per-unit; commission is a percent of sell price.
   */
  quantity?: number | null;
  /** Commission as a percent of sell price (e.g. 7.5). */
  commissionPercent?: number | null;
};

export type ProfitResult = {
  batchCostMinor: MoneyMinor;
  batchCost: string;
  unitCostMinor: MoneyMinor;
  unitCost: string;
  commissionPercent: number | null;
  sellPriceMinor: MoneyMinor | null;
  sellPrice: string | null;
  grossProfitMinor: MoneyMinor | null;
  grossProfit: string | null;
  marginPercent: number | null;
  breakEvenPrice: string;
  targetPrice: string | null;
  targetMarginPercent: number | null;
  quantity: number;
  totalCost: string;
  totalRevenue: string | null;
  totalProfit: string | null;
  assumptions: CalcMessage[];
  missing: string[];
};

function optionalComponent(
  missingKey: MessageKey,
  value: string | null | undefined,
  assumptions: CalcMessage[],
): MoneyMinor {
  if (value == null || !String(value).trim()) {
    assumptions.push({ messageKey: missingKey });
    return 0;
  }
  return requireMoneyToMinor(value);
}

export function calculateProfit(input: ProfitInput): ProfitResult {
  const assumptions: CalcMessage[] = [];
  const missing: string[] = [];
  const quantity =
    input.quantity == null || input.quantity === undefined
      ? 1
      : input.quantity;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new CalcError("calc.profit.quantityPositive");
  }
  if (input.quantity == null) {
    assumptions.push({ messageKey: "calc.profit.quantityDefault" });
  }

  const materials = optionalComponent(
    "calc.profit.missing.materials",
    input.components.materials,
    assumptions,
  );
  const labor = optionalComponent(
    "calc.profit.missing.labor",
    input.components.labor,
    assumptions,
  );
  const packaging = optionalComponent(
    "calc.profit.missing.packaging",
    input.components.packaging,
    assumptions,
  );
  const shipping = optionalComponent(
    "calc.profit.missing.shipping",
    input.components.shipping,
    assumptions,
  );
  const other = optionalComponent(
    "calc.profit.missing.other",
    input.components.other,
    assumptions,
  );

  const commissionPercentRaw =
    input.commissionPercent === undefined ? null : input.commissionPercent;
  let commissionPercent: number | null = null;
  if (commissionPercentRaw != null) {
    if (
      !Number.isFinite(commissionPercentRaw) ||
      commissionPercentRaw < 0 ||
      commissionPercentRaw >= 100
    ) {
      throw new CalcError("calc.profit.commissionRange");
    }
    commissionPercent = commissionPercentRaw;
  }

  // Ledger / older records: a fixed-amount commission when no percent is set.
  const commissionFixed =
    commissionPercent == null
      ? optionalComponent(
          "calc.profit.missing.commission",
          input.components.commission,
          assumptions,
        )
      : 0;
  if (commissionPercent != null) {
    assumptions.push({
      messageKey: "calc.profit.commissionPercent",
      vars: { percent: commissionPercent },
    });
  }

  const batchCostMinor = addMinor(materials, labor, packaging);
  const unitCostMinor = addMinor(
    roundMinor(batchCostMinor / quantity),
    shipping,
    other,
    commissionFixed,
  );
  if (quantity > 1) {
    assumptions.push({
      messageKey: "calc.profit.batchSplit",
      vars: { batch: formatMinor(batchCostMinor), quantity },
    });
  }

  const commissionFraction = (commissionPercent ?? 0) / 100;
  const breakEvenDenom = 1 - commissionFraction;
  const breakEvenPrice = formatMinor(
    breakEvenDenom <= 0
      ? unitCostMinor
      : roundMinor(unitCostMinor / breakEvenDenom),
  );

  let sellPriceMinor: MoneyMinor | null = null;
  if (input.sellPrice != null && String(input.sellPrice).trim()) {
    sellPriceMinor = requireMoneyToMinor(input.sellPrice);
    if (sellPriceMinor < 0) throw new CalcError("calc.profit.sellNegative");
  } else {
    missing.push("sellPrice");
    assumptions.push({ messageKey: "calc.profit.sellMissing" });
  }

  let grossProfitMinor: MoneyMinor | null = null;
  let marginPercent: number | null = null;
  if (sellPriceMinor != null) {
    const commissionMinor = roundMinor(sellPriceMinor * commissionFraction);
    grossProfitMinor = sellPriceMinor - unitCostMinor - commissionMinor;
    marginPercent =
      sellPriceMinor === 0
        ? null
        : Math.round((grossProfitMinor / sellPriceMinor) * 10000) / 100;
    if (sellPriceMinor === 0) {
      assumptions.push({ messageKey: "calc.profit.sellZero" });
    }
  }

  let targetPrice: string | null = null;
  const targetMarginPercent =
    input.targetMarginPercent == null ? null : input.targetMarginPercent;
  if (targetMarginPercent != null) {
    if (
      !Number.isFinite(targetMarginPercent) ||
      targetMarginPercent < 0 ||
      targetMarginPercent >= 100
    ) {
      throw new CalcError("calc.profit.marginRange");
    }
    const ratio = 1 - targetMarginPercent / 100 - commissionFraction;
    if (ratio <= 0) {
      throw new CalcError("calc.profit.marginPlusCommission");
    }
    targetPrice = formatMinor(roundMinor(unitCostMinor / ratio));
  } else {
    assumptions.push({ messageKey: "calc.profit.targetMissing" });
  }

  return {
    batchCostMinor,
    batchCost: formatMinor(batchCostMinor),
    unitCostMinor,
    unitCost: formatMinor(unitCostMinor),
    commissionPercent,
    sellPriceMinor,
    sellPrice: sellPriceMinor == null ? null : formatMinor(sellPriceMinor),
    grossProfitMinor,
    grossProfit:
      grossProfitMinor == null ? null : formatMinor(grossProfitMinor),
    marginPercent,
    breakEvenPrice,
    targetPrice,
    targetMarginPercent,
    quantity,
    totalCost: formatMinor(
      addMinor(batchCostMinor, (shipping + other + commissionFixed) * quantity),
    ),
    totalRevenue:
      sellPriceMinor == null ? null : formatMinor(sellPriceMinor * quantity),
    totalProfit:
      grossProfitMinor == null
        ? null
        : formatMinor(grossProfitMinor * quantity),
    assumptions,
    missing,
  };
}

export function rolledUpCostPrice(components: ProfitCostComponents): string {
  return calculateProfit({ components }).unitCost;
}

export const EXPENSE_CATEGORIES = [
  { id: "materials" },
  { id: "labor" },
  { id: "packaging" },
  { id: "commission" },
  { id: "shipping" },
  { id: "other" },
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number]["id"];

export function expenseCategoryKey(id: ExpenseCategoryId): MessageKey {
  return `calc.component.${id}`;
}

export type ExpenseLedgerMeta = {
  category: ExpenseCategoryId;
  note?: string | null;
  occurredAt?: string | null;
};

export type ExpenseProfitInput = ProfitInput & {
  ledger: ExpenseLedgerMeta;
};

export function expenseCategoryLabel(
  id: ExpenseCategoryId,
  t: Translator = createTranslator(DEFAULT_LOCALE),
): string {
  return t(expenseCategoryKey(id));
}

export function buildExpenseProfitInput(input: {
  category: ExpenseCategoryId;
  amount: string;
  note?: string | null;
  occurredAt?: string | null;
}): ExpenseProfitInput {
  const amount = String(input.amount).trim();
  if (!amount) throw new CalcError("calc.money.required");
  requireMoneyToMinor(amount);
  const components: ProfitCostComponents = {
    materials: null,
    labor: null,
    packaging: null,
    commission: null,
    shipping: null,
    other: null,
  };
  components[input.category] = amount;
  return {
    components,
    sellPrice: null,
    targetMarginPercent: null,
    quantity: 1,
    ledger: {
      category: input.category,
      note: input.note?.trim() || null,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    },
  };
}

export type ExpenseLedgerEntry = {
  amountMinor: MoneyMinor;
  at: string | Date;
};

export type ExpenseLedgerSummary = {
  allTimeMinor: MoneyMinor;
  monthMinor: MoneyMinor;
  count: number;
  monthCount: number;
};

export function summarizeExpenseLedger(
  entries: ExpenseLedgerEntry[],
  now: Date = new Date(),
): ExpenseLedgerSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let allTimeMinor = 0;
  let monthMinor = 0;
  let monthCount = 0;
  for (const entry of entries) {
    const amount = entry.amountMinor;
    if (!Number.isFinite(amount) || amount < 0) continue;
    allTimeMinor += amount;
    const at = entry.at instanceof Date ? entry.at : new Date(entry.at);
    if (!Number.isNaN(at.getTime()) && at >= monthStart) {
      monthMinor += amount;
      monthCount += 1;
    }
  }
  return {
    allTimeMinor,
    monthMinor,
    count: entries.length,
    monthCount,
  };
}

export function entryAmountMinorFromProfitScenario(scenario: {
  results?: Record<string, unknown> | null;
  inputs?: Record<string, unknown> | null;
}): MoneyMinor {
  const results = scenario.results ?? {};
  if (typeof results.unitCostMinor === "number") {
    return results.unitCostMinor;
  }
  if (typeof results.unitCost === "string") {
    return parseMoneyToMinor(results.unitCost) ?? 0;
  }
  return 0;
}

export function expenseMetaFromProfitInputs(
  inputs: Record<string, unknown> | null | undefined,
): ExpenseLedgerMeta | null {
  const ledger = inputs?.ledger;
  if (!ledger || typeof ledger !== "object") return null;
  const row = ledger as Record<string, unknown>;
  const category = row.category;
  if (
    typeof category !== "string" ||
    !EXPENSE_CATEGORIES.some((item) => item.id === category)
  ) {
    return null;
  }
  return {
    category: category as ExpenseCategoryId,
    note: typeof row.note === "string" ? row.note : null,
    occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : null,
  };
}

export { parseMoneyToMinor };
