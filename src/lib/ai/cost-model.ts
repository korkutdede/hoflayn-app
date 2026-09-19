import { CREDIT_COSTS, type CreditOperation } from "@/lib/credits/costs";

/**
 * Estimated provider USD per operation (P5 planning numbers).
 * Keep in sync with docs/COSTING.md — update both when providers change.
 */
export const ESTIMATED_COST_USD: Record<CreditOperation, number> = {
  remove_bg: 0.0036,
  white_bg: 0.0036,
  analyze_product_image: 0.001,
  generate_description: 0.0025,
  generate_caption: 0.0015,
  analyze_seo: 0.002,
  generate_catalog: 0.001,
  generate_labels: 0.0008,
};

/** Pro blended revenue per credit ($24.99 / 900). */
export const REVENUE_PER_CREDIT_USD = 0.0278;

export function getEstimatedCostUsd(operation: string): number {
  if (operation in ESTIMATED_COST_USD) {
    return ESTIMATED_COST_USD[operation as CreditOperation];
  }
  return 0.01; // conservative unknown-op fallback
}

export function estimateGrossMargin(operation: CreditOperation): number {
  const cost = ESTIMATED_COST_USD[operation];
  const revenue = CREDIT_COSTS[operation] * REVENUE_PER_CREDIT_USD;
  if (revenue <= 0) return 0;
  return (revenue - cost) / revenue;
}

/**
 * Logs when actual provider cost diverges from the planning estimate.
 * Does not fail the job — observability only.
 */
export function logCostVariance(opts: {
  operation: string;
  estimatedUsd: number;
  actualUsd: number;
  tenantId: string;
  jobId: string;
  provider: string;
}): void {
  const { estimatedUsd, actualUsd } = opts;
  if (estimatedUsd <= 0) return;

  const ratio = actualUsd / estimatedUsd;
  if (ratio >= 0.25 && ratio <= 2) return;

  console.warn(
    JSON.stringify({
      type: "ai_cost_variance",
      operation: opts.operation,
      estimatedUsd,
      actualUsd,
      ratio: Number(ratio.toFixed(3)),
      tenantId: opts.tenantId,
      jobId: opts.jobId,
      provider: opts.provider,
    }),
  );
}
