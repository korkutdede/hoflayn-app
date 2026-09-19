/** Credit costs per AI operation (usage right).
 * Margin math: docs/COSTING.md — Stage 8 keeps these values (≥50% on Pro blend).
 */
export const CREDIT_COSTS = {
  remove_bg: 1,
  white_bg: 1,
  analyze_product_image: 1,
  generate_description: 2,
  generate_caption: 2,
  analyze_seo: 2,
  generate_catalog: 1,
  generate_labels: 1,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

export function getCreditCost(operation: string): number {
  if (operation in CREDIT_COSTS) {
    return CREDIT_COSTS[operation as CreditOperation];
  }
  throw new Error(`Unknown credit operation: ${operation}`);
}
