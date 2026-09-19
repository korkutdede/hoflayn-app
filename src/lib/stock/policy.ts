import { LocalizedError } from "@/lib/i18n/error";

export type StockMovementType = "in" | "out" | "adjust" | "reserve";

export class InsufficientStockError extends LocalizedError {
  readonly code = "INSUFFICIENT_STOCK" as const;
  constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super("stock.error.insufficient", { requested, available });
    this.name = "InsufficientStockError";
  }
}

/**
 * Pure balance math for stock movements.
 * - in/out/reserve: `quantity` is positive units
 * - adjust: `quantity` is the absolute target on-hand level
 */
export function computeStockDelta(opts: {
  type: StockMovementType;
  quantity: number;
  current: number;
}): { delta: number; balanceAfter: number } {
  if (!Number.isInteger(opts.quantity)) {
    throw new LocalizedError("stock.error.notInteger");
  }
  if (opts.quantity < 0) {
    throw new LocalizedError("stock.error.negative");
  }

  if (opts.type === "adjust") {
    const balanceAfter = opts.quantity;
    return { delta: balanceAfter - opts.current, balanceAfter };
  }

  if (opts.quantity === 0) {
    throw new LocalizedError("stock.error.zero");
  }

  if (opts.type === "in") {
    return {
      delta: opts.quantity,
      balanceAfter: opts.current + opts.quantity,
    };
  }

  // out | reserve
  return {
    delta: -opts.quantity,
    balanceAfter: opts.current - opts.quantity,
  };
}

export function assertStockAllowed(opts: {
  balanceAfter: number;
  allowNegative: boolean;
  productId: string;
  requested: number;
  available: number;
}): void {
  if (opts.balanceAfter < 0 && !opts.allowNegative) {
    throw new InsufficientStockError(
      opts.productId,
      opts.requested,
      opts.available,
    );
  }
}
