import {
  createTranslator,
  DEFAULT_LOCALE,
  type MessageKey,
  type Translator,
} from "@hoflayn/i18n";
import { CREDIT_COSTS, type CreditOperation } from "./costs";

export function creditOperationKey(operation: CreditOperation): MessageKey {
  return `credits.operation.${operation}`;
}

export type UsageBreakdownRow = {
  operation: string;
  creditsUsed: number;
  jobCount: number;
};

export type UsageBreakdownItem = UsageBreakdownRow & {
  label: string;
  unitCost: number | null;
};

/** Unknown operations fall back to the raw key so new ones stay visible. */
export function labelCreditOperation(
  operation: string,
  t: Translator = createTranslator(DEFAULT_LOCALE),
): string {
  if (operation in CREDIT_COSTS) {
    return t(creditOperationKey(operation as CreditOperation));
  }
  return operation;
}

export function unitCostForOperation(operation: string): number | null {
  if (operation in CREDIT_COSTS) {
    return CREDIT_COSTS[operation as CreditOperation];
  }
  return null;
}

export function buildUsageBreakdown(
  rows: UsageBreakdownRow[],
  t?: Translator,
): UsageBreakdownItem[] {
  return [...rows]
    .filter((r) => r.creditsUsed > 0 || r.jobCount > 0)
    .map((r) => ({
      ...r,
      label: labelCreditOperation(r.operation, t),
      unitCost: unitCostForOperation(r.operation),
    }))
    .sort(
      (a, b) =>
        b.creditsUsed - a.creditsUsed ||
        b.jobCount - a.jobCount ||
        a.label.localeCompare(b.label),
    );
}
