import "server-only";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { creditTransactions, tenants } from "@/db/schema";
import { CreditError, InsufficientCreditsError } from "./errors";

type DbOrTx = PostgresJsDatabase<typeof schema>;

export type CreditRelated = {
  relatedType: string;
  relatedId: string;
  description?: string;
  idempotencyKey?: string;
};

export type ReserveResult = {
  transactionId: string;
  balanceAfter: number;
  amount: number;
};

export type CreditGrantType =
  | "free_grant"
  | "purchase"
  | "subscription_grant"
  | "refund"
  | "bonus"
  | "adjustment";

async function existingMutation(
  client: DbOrTx,
  tenantId: string,
  idempotencyKey: string | undefined,
): Promise<ReserveResult | null> {
  if (!idempotencyKey) return null;
  const [row] = await client
    .select({
      id: creditTransactions.id,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.tenantId, tenantId),
        eq(creditTransactions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return row
    ? {
        transactionId: row.id,
        balanceAfter: row.balanceAfter,
        amount: Math.abs(row.amount),
      }
    : null;
}

/**
 * Atomically grants credits and appends the corresponding ledger row.
 * Used by verified billing webhooks; never call directly from client input.
 */
export async function grantCredits(
  tenantId: string,
  amount: number,
  type: CreditGrantType,
  related: CreditRelated,
  client: DbOrTx = db,
): Promise<ReserveResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new CreditError(
      `grantCredits: amount must be a positive integer, got ${amount}`,
    );
  }

  return client.transaction(async (tx) => {
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .for("update")
      .limit(1);

    if (!tenant) {
      throw new CreditError(`grantCredits: tenant not found: ${tenantId}`);
    }
    const existing = await existingMutation(
      tx,
      tenantId,
      related.idempotencyKey,
    );
    if (existing) return existing;

    const balanceAfter = tenant.creditBalance + amount;

    await tx
      .update(tenants)
      .set({ creditBalance: balanceAfter, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    const [txn] = await tx
      .insert(creditTransactions)
      .values({
        tenantId,
        amount,
        type,
        balanceAfter,
        description: related.description,
        relatedType: related.relatedType,
        relatedId: related.relatedId,
        idempotencyKey: related.idempotencyKey,
      })
      .returning({ id: creditTransactions.id });

    if (!txn) {
      throw new CreditError("grantCredits: failed to insert ledger row");
    }

    return { transactionId: txn.id, balanceAfter, amount };
  });
}

/**
 * Atomically reserves credits: lock tenant row → check balance → deduct →
 * append ledger row (type=usage, negative amount). Call settleCredits on
 * success (no further balance change) or releaseCredits on failure (refund).
 */
export async function reserveCredits(
  tenantId: string,
  amount: number,
  related: CreditRelated,
  client: DbOrTx = db,
): Promise<ReserveResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new CreditError(`reserveCredits: amount must be a positive integer, got ${amount}`);
  }

  return client.transaction(async (tx) => {
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .for("update")
      .limit(1);

    if (!tenant) {
      throw new CreditError(`reserveCredits: tenant not found: ${tenantId}`);
    }
    const existing = await existingMutation(
      tx,
      tenantId,
      related.idempotencyKey,
    );
    if (existing) return existing;

    if (tenant.creditBalance < amount) {
      throw new InsufficientCreditsError(
        tenantId,
        amount,
        tenant.creditBalance,
      );
    }

    const balanceAfter = tenant.creditBalance - amount;

    await tx
      .update(tenants)
      .set({ creditBalance: balanceAfter, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    const [txn] = await tx
      .insert(creditTransactions)
      .values({
        tenantId,
        amount: -amount,
        type: "usage",
        balanceAfter,
        description: related.description ?? `Reserved ${amount} credit(s)`,
        relatedType: related.relatedType,
        relatedId: related.relatedId,
        idempotencyKey: related.idempotencyKey,
      })
      .returning({ id: creditTransactions.id });

    if (!txn) {
      throw new CreditError("reserveCredits: failed to insert ledger row");
    }

    return { transactionId: txn.id, balanceAfter, amount };
  });
}

/**
 * Confirms a prior reservation. Balance was already deducted in reserveCredits;
 * this is a no-op ledger-wise and exists so callers have an explicit settle step
 * (and so a future queue worker can mark settlement idempotently).
 */
export async function settleCredits(
  tenantId: string,
  amount: number,
  related: CreditRelated,
  _client: DbOrTx = db,
): Promise<void> {
  // Reserved amount already posted as usage. Explicit settle step kept for
  // queue workers / idempotency hooks. Parameters reserved for future use.
  void tenantId;
  void amount;
  void related;
  void _client;
}

/**
 * Refunds a prior reservation (job failed / canceled). Credits the tenant and
 * appends a refund ledger row linked to the same related entity.
 */
export async function releaseCredits(
  tenantId: string,
  amount: number,
  related: CreditRelated,
  client: DbOrTx = db,
): Promise<ReserveResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new CreditError(`releaseCredits: amount must be a positive integer, got ${amount}`);
  }

  return client.transaction(async (tx) => {
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .for("update")
      .limit(1);

    if (!tenant) {
      throw new CreditError(`releaseCredits: tenant not found: ${tenantId}`);
    }
    const existing = await existingMutation(
      tx,
      tenantId,
      related.idempotencyKey,
    );
    if (existing) return existing;

    const balanceAfter = tenant.creditBalance + amount;

    await tx
      .update(tenants)
      .set({ creditBalance: balanceAfter, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    const [txn] = await tx
      .insert(creditTransactions)
      .values({
        tenantId,
        amount,
        type: "refund",
        balanceAfter,
        description: related.description ?? `Released ${amount} credit(s)`,
        relatedType: related.relatedType,
        relatedId: related.relatedId,
        idempotencyKey: related.idempotencyKey,
      })
      .returning({ id: creditTransactions.id });

    if (!txn) {
      throw new CreditError("releaseCredits: failed to insert ledger row");
    }

    return { transactionId: txn.id, balanceAfter, amount };
  });
}
