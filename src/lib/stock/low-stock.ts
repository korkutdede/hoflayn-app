/** Low-stock alert policy (Loop 24). */

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function resolveLowStockThreshold(
  productOverride: number | null | undefined,
  tenantDefault: number,
): number {
  if (
    productOverride === null ||
    productOverride === undefined ||
    !Number.isInteger(productOverride)
  ) {
    return tenantDefault;
  }
  return productOverride;
}

export function isLowStock(
  stockQuantity: number,
  threshold: number,
): boolean {
  return stockQuantity <= threshold;
}

export type LowStockCandidate = {
  productId: string;
  name: string;
  stockQuantity: number;
  threshold: number;
  productOverride: number | null;
};

export function pickLowStockItems(
  items: Array<{
    productId: string;
    name: string;
    stockQuantity: number;
    productOverride: number | null;
  }>,
  tenantDefault: number,
): LowStockCandidate[] {
  const alerts: LowStockCandidate[] = [];
  for (const item of items) {
    const threshold = resolveLowStockThreshold(
      item.productOverride,
      tenantDefault,
    );
    if (isLowStock(item.stockQuantity, threshold)) {
      alerts.push({
        productId: item.productId,
        name: item.name,
        stockQuantity: item.stockQuantity,
        threshold,
        productOverride: item.productOverride,
      });
    }
  }
  return alerts.sort(
    (a, b) =>
      a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, "tr"),
  );
}
