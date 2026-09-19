export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS" as const;
  constructor(
    public readonly tenantId: string,
    public readonly required: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient credits: need ${required}, have ${available} (tenant ${tenantId})`,
    );
    this.name = "InsufficientCreditsError";
  }
}

export class CreditError extends Error {
  readonly code = "CREDIT_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "CreditError";
  }
}
