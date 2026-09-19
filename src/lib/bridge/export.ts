import "server-only";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  mediaAssets,
  memberships,
  products,
  syncLinks,
  tenants,
  users,
} from "@/db/schema";
import { createSignedUrl } from "@/lib/media/storage";
import { assertStorageConfigured } from "@/lib/media/paths";
import {
  assertBridgeConfigured,
  BRIDGE_CONTRACT_VERSION,
  createBridgeSignature,
  type BridgeOperation,
  BridgeExportError,
  hashPayload,
  HOFLAYN_WEB_PROVIDER,
  type BridgeExportPayload,
} from "./types";
import { getTranslator } from "@/lib/i18n/server";
import { logEvent } from "@/lib/observability/log";
import type { MessageKey, Translator } from "@hoflayn/i18n";

export type ExportProductResult = {
  syncLinkId: string;
  status: "pending" | "published" | "rejected" | "failed" | "archived";
  externalId: string | null;
  externalUrl: string | null;
  payloadHash: string;
};

async function buildPayload(opts: {
  tenantId: string;
  productId: string;
  userEmail: string;
  operation?: BridgeOperation;
  requestId?: string;
}): Promise<BridgeExportPayload> {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, opts.productId),
        eq(products.tenantId, opts.tenantId),
      ),
    )
    .limit(1);

  if (!product) {
    throw new BridgeExportError("products.error.notFound", { statusCode: 404 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, opts.tenantId))
    .limit(1);

  if (!tenant) {
    throw new BridgeExportError("workshop.error.notFound", { statusCode: 404 });
  }

  const images: BridgeExportPayload["product"]["images"] = [];
  if (product.coverImageId) {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, product.coverImageId),
          eq(mediaAssets.tenantId, opts.tenantId),
        ),
      )
      .limit(1);

    if (asset) {
      try {
        assertStorageConfigured();
        const url = await createSignedUrl(asset.path, 60 * 60);
        images.push({
          mediaAssetId: asset.id,
          url,
          isCover: true,
        });
      } catch {
        // Export can proceed without images; PHP side may reject.
      }
    }
  }

  const tags = (product.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    contractVersion: BRIDGE_CONTRACT_VERSION,
    source: "hoflayn.app",
    operation: opts.operation ?? "upsert",
    idempotencyKey: `${opts.tenantId}:${opts.productId}`,
    requestId: opts.requestId ?? randomUUID(),
    sentAt: new Date().toISOString(),
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      email: opts.userEmail,
      craftCategory: tenant.craftCategory,
    },
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: product.category,
      tags,
      sku: product.sku,
      barcodeValue: product.barcodeValue,
      barcodeFormat: product.barcodeFormat,
      dimensions: {
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm,
        weightKg: product.weightKg,
      },
      updatedAt: product.updatedAt.toISOString(),
      images,
    },
  };
}

async function upsertSyncLink(opts: {
  tenantId: string;
  productId: string;
  status: "draft" | "pending" | "published" | "rejected" | "failed" | "archived";
  operation?: BridgeOperation;
  externalId?: string | null;
  externalUrl?: string | null;
  rejectionReason?: string | null;
  lastResponseStatus?: number | null;
  payloadHash?: string | null;
  successfulPayloadHash?: string | null;
  lastError?: string | null;
  attemptedAt?: Date;
  succeededAt?: Date | null;
  publishedAt?: Date | null;
}) {
  const [existing] = await db
    .select()
    .from(syncLinks)
    .where(
      and(
        eq(syncLinks.provider, HOFLAYN_WEB_PROVIDER),
        eq(syncLinks.productId, opts.productId),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(syncLinks)
      .set({
        status: opts.status,
        lastOperation:
          opts.operation === undefined
            ? existing.lastOperation
            : opts.operation,
        externalId:
          opts.externalId === undefined
            ? existing.externalId
            : opts.externalId,
        externalUrl:
          opts.externalUrl === undefined
            ? existing.externalUrl
            : opts.externalUrl,
        rejectionReason:
          opts.rejectionReason === undefined
            ? existing.rejectionReason
            : opts.rejectionReason,
        lastResponseStatus:
          opts.lastResponseStatus === undefined
            ? existing.lastResponseStatus
            : opts.lastResponseStatus,
        payloadHash:
          opts.payloadHash === undefined
            ? existing.payloadHash
            : opts.payloadHash,
        successfulPayloadHash:
          opts.successfulPayloadHash === undefined
            ? existing.successfulPayloadHash
            : opts.successfulPayloadHash,
        lastError:
          opts.lastError === undefined ? existing.lastError : opts.lastError,
        lastAttemptAt: opts.attemptedAt ?? new Date(),
        lastSyncedAt:
          opts.succeededAt === undefined
            ? existing.lastSyncedAt
            : opts.succeededAt,
        lastSuccessAt:
          opts.succeededAt === undefined
            ? existing.lastSuccessAt
            : opts.succeededAt,
        publishedAt:
          opts.publishedAt === undefined
            ? existing.publishedAt
            : opts.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(syncLinks.id, existing.id))
      .returning();
    return row!;
  }

  const [row] = await db
    .insert(syncLinks)
    .values({
      tenantId: opts.tenantId,
      productId: opts.productId,
      provider: HOFLAYN_WEB_PROVIDER,
      status: opts.status,
      lastOperation: opts.operation ?? null,
      externalId: opts.externalId ?? null,
      externalUrl: opts.externalUrl ?? null,
      rejectionReason: opts.rejectionReason ?? null,
      lastResponseStatus: opts.lastResponseStatus ?? null,
      payloadHash: opts.payloadHash ?? null,
      successfulPayloadHash: opts.successfulPayloadHash ?? null,
      lastError: opts.lastError ?? null,
      lastAttemptAt: opts.attemptedAt ?? new Date(),
      lastSyncedAt: opts.succeededAt ?? null,
      lastSuccessAt: opts.succeededAt ?? null,
      publishedAt: opts.publishedAt ?? null,
    })
    .returning();

  return row!;
}

type HoflaynWebResponse = {
  ok?: boolean;
  externalId?: string | number;
  externalUrl?: string;
  status?: "pending" | "published" | "rejected" | "failed" | "archived";
  message?: string;
};

const hoflaynWebResponseSchema = z.object({
  ok: z.boolean().optional(),
  externalId: z.union([z.string(), z.number()]).optional(),
  externalUrl: z.string().url().optional(),
  status: z
    .enum(["pending", "published", "rejected", "failed", "archived"])
    .optional(),
  message: z.string().max(2000).optional(),
});

const BRIDGE_TIMEOUT_MS = 15_000;

function stablePayloadHash(payload: BridgeExportPayload): string {
  return hashPayload({
    ...payload,
    sentAt: undefined,
    requestId: undefined,
    product: {
      ...payload.product,
      updatedAt: payload.product.updatedAt,
      images: payload.product.images.map((image) => ({
        mediaAssetId: image.mediaAssetId,
        isCover: image.isCover,
      })),
    },
  });
}

/**
 * Fields Hoflayn Web requires before a product can go on the storefront.
 * The IDs are the wire format; only their labels are localized.
 */
const REQUIRED_FIELD_KEYS = {
  name: "bridge.field.name",
  price: "bridge.field.price",
  description: "bridge.field.description",
  category: "bridge.field.category",
  coverImage: "bridge.field.coverImage",
} as const satisfies Record<string, MessageKey>;

export type BridgeRequiredField = keyof typeof REQUIRED_FIELD_KEYS;

export function bridgeFieldLabel(
  field: BridgeRequiredField,
  t: Translator,
): string {
  return t(REQUIRED_FIELD_KEYS[field]);
}

function assertPublishablePayload(
  payload: BridgeExportPayload,
  t: Translator,
): void {
  if (payload.operation === "archive") return;

  const missing: BridgeRequiredField[] = [];
  if (!payload.product.name.trim()) missing.push("name");
  if (!payload.product.price) missing.push("price");
  if (!payload.product.description?.trim()) missing.push("description");
  if (!payload.product.category) missing.push("category");
  if (!payload.product.images.length) missing.push("coverImage");
  if (missing.length) {
    throw new BridgeExportError("bridge.error.missingFields", {
      statusCode: 422,
      vars: {
        fields: missing.map((field) => bridgeFieldLabel(field, t)).join(", "),
      },
    });
  }
}

async function postToHoflaynWeb(opts: {
  url: string;
  apiKey: string;
  signingSecret: string | null;
  payload: BridgeExportPayload;
}): Promise<{
  responseStatus: number;
  body: HoflaynWebResponse;
}> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify(opts.payload);
  const signature = createBridgeSignature(
    rawBody,
    timestamp,
    opts.signingSecret ?? undefined,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);

  try {
    const response = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": opts.apiKey,
        "X-Idempotency-Key": opts.payload.idempotencyKey,
        "X-Request-Id": opts.payload.requestId,
        "X-Bridge-Payload-Hash": stablePayloadHash(opts.payload),
        ...(signature
          ? {
              "X-Bridge-Timestamp": timestamp,
              "X-Bridge-Signature": signature,
            }
          : {}),
      },
      body: rawBody,
      signal: controller.signal,
    });
    const text = await response.text();
    let body: HoflaynWebResponse = {};
    if (text) {
      try {
        body = hoflaynWebResponseSchema.parse(JSON.parse(text));
      } catch {
        throw new BridgeExportError("bridge.error.badResponse", {
          statusCode: response.status,
        });
      }
    }
    return { responseStatus: response.status, body };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new BridgeExportError("bridge.error.timeout", {
        vars: { seconds: BRIDGE_TIMEOUT_MS / 1000 },
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new BridgeExportError("bridge.error.unreachable", {
      vars: { message },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Maps a SaaS product and POSTs it to the Hoflayn Web Bridge endpoint.
 * Updates sync_links regardless of success/failure.
 */
export async function exportProduct(opts: {
  tenantId: string;
  productId: string;
  userEmail: string;
  operation?: BridgeOperation;
}): Promise<ExportProductResult> {
  const { url, apiKey, signingSecret } = assertBridgeConfigured();
  const operation = opts.operation ?? "upsert";
  const payload = await buildPayload({ ...opts, operation });
  assertPublishablePayload(payload, await getTranslator());
  const payloadHash = stablePayloadHash(payload);

  await upsertSyncLink({
    tenantId: opts.tenantId,
    productId: opts.productId,
    status: "pending",
    operation,
    payloadHash,
    externalId: undefined,
    rejectionReason: null,
    lastError: null,
  });

  let result: { responseStatus: number; body: HoflaynWebResponse };
  try {
    result = await postToHoflaynWeb({
      url,
      apiKey,
      signingSecret,
      payload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await upsertSyncLink({
      tenantId: opts.tenantId,
      productId: opts.productId,
      status: "failed",
      operation,
      lastResponseStatus: err instanceof BridgeExportError ? err.statusCode : null,
      payloadHash,
      lastError: message,
    });
    throw err instanceof BridgeExportError
      ? err
      : new BridgeExportError("bridge.error.unreachable", {
          vars: { message },
        });
  }

  const { responseStatus, body } = result;

  if (responseStatus < 200 || responseStatus >= 300 || body.ok === false) {
    const message =
      body.message ?? `Hoflayn Web Bridge HTTP ${responseStatus}`;
    await upsertSyncLink({
      tenantId: opts.tenantId,
      productId: opts.productId,
      status: "failed",
      operation,
      lastResponseStatus: responseStatus,
      payloadHash,
      lastError: message,
    });
    throw new BridgeExportError("bridge.error.rejectedByWeb", {
      statusCode: responseStatus,
      vars: { message },
    });
  }

  const status =
    body.status === "published"
      ? "published"
      : body.status === "rejected"
        ? "rejected"
        : body.status === "archived"
          ? "archived"
          : operation === "archive"
            ? "archived"
          : "pending";
  const externalId =
    body.externalId !== undefined && body.externalId !== null
      ? String(body.externalId)
      : null;

  const link = await upsertSyncLink({
    tenantId: opts.tenantId,
    productId: opts.productId,
    status,
    operation,
    lastResponseStatus: responseStatus,
    externalId,
    externalUrl: body.externalUrl ?? null,
    rejectionReason: status === "rejected" ? body.message ?? null : null,
    payloadHash,
    successfulPayloadHash: payloadHash,
    lastError: null,
    succeededAt: new Date(),
    publishedAt: status === "published" ? new Date() : null,
  });

  logEvent("bridge.export", {
    tenantId: opts.tenantId,
    productId: opts.productId,
    status,
    externalId,
  });

  return {
    syncLinkId: link.id,
    status,
    externalId: link.externalId,
    externalUrl: link.externalUrl,
    payloadHash,
  };
}

export async function getProductSyncLink(
  tenantId: string,
  productId: string,
) {
  const [row] = await db
    .select()
    .from(syncLinks)
    .where(
      and(
        eq(syncLinks.tenantId, tenantId),
        eq(syncLinks.productId, productId),
        eq(syncLinks.provider, HOFLAYN_WEB_PROVIDER),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getProductBridgeStatus(opts: {
  tenantId: string;
  productId: string;
  userEmail: string;
}) {
  const [product, link] = await Promise.all([
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, opts.productId),
          eq(products.tenantId, opts.tenantId),
        ),
      )
      .limit(1)
      .then(([row]) => row ?? null),
    getProductSyncLink(opts.tenantId, opts.productId),
  ]);

  if (!product) return null;

  const t = await getTranslator();
  const missingFields: string[] = [];
  if (!product.name.trim()) missingFields.push(bridgeFieldLabel("name", t));
  if (!product.price) missingFields.push(bridgeFieldLabel("price", t));
  if (!product.description?.trim()) {
    missingFields.push(bridgeFieldLabel("description", t));
  }
  if (!product.category) missingFields.push(bridgeFieldLabel("category", t));
  if (!product.coverImageId) {
    missingFields.push(bridgeFieldLabel("coverImage", t));
  }

  let currentHash: string | null = null;
  if (process.env.HOFLAYN_WEB_BRIDGE_URL && process.env.HOFLAYN_WEB_BRIDGE_API_KEY) {
    try {
      const payload = await buildPayload({
        tenantId: opts.tenantId,
        productId: opts.productId,
        userEmail: opts.userEmail,
      });
      currentHash = stablePayloadHash(payload);
    } catch {
      // The product details remain useful even if Storage is unavailable.
    }
  }

  return {
    configured: Boolean(
      process.env.HOFLAYN_WEB_BRIDGE_URL && process.env.HOFLAYN_WEB_BRIDGE_API_KEY,
    ),
    connected: Boolean(link),
    status: link?.status ?? "draft",
    externalId: link?.externalId ?? undefined,
    externalUrl: link?.externalUrl ?? undefined,
    lastError: link?.lastError ?? undefined,
    rejectionReason: link?.rejectionReason ?? undefined,
    lastAttemptAt: link?.lastAttemptAt?.toISOString(),
    lastSyncedAt: link?.lastSyncedAt?.toISOString(),
    publishedAt: link?.publishedAt?.toISOString(),
    needsUpdate:
      Boolean(link?.successfulPayloadHash && currentHash) &&
      link?.successfulPayloadHash !== currentHash,
    missingFields,
  };
}

/**
 * Applies inbound Hoflayn Web status updates (admin approved / rejected).
 */
export async function applyHoflaynWebWebhook(opts: {
  productId: string;
  tenantId?: string;
  externalId?: string | null;
  externalUrl?: string | null;
  status: "pending" | "published" | "rejected" | "failed" | "archived";
  message?: string | null;
}) {
  const conditions = [
    eq(syncLinks.provider, HOFLAYN_WEB_PROVIDER),
    eq(syncLinks.productId, opts.productId),
  ];
  if (opts.tenantId) {
    conditions.push(eq(syncLinks.tenantId, opts.tenantId));
  }

  const [existing] = await db
    .select()
    .from(syncLinks)
    .where(and(...conditions))
    .limit(1);

  if (!existing) {
    throw new BridgeExportError("bridge.error.syncLinkMissing");
  }

  const [updated] = await db
    .update(syncLinks)
    .set({
      status: opts.status,
      externalId:
        opts.externalId === undefined
          ? existing.externalId
          : opts.externalId,
      externalUrl:
        opts.externalUrl === undefined
          ? existing.externalUrl
          : opts.externalUrl,
      rejectionReason:
        opts.status === "rejected" ? opts.message ?? null : null,
      lastOperation: "status_webhook",
      lastResponseStatus: null,
      lastAttemptAt: new Date(),
      lastError: opts.message ?? null,
      lastSyncedAt: new Date(),
      lastSuccessAt:
        opts.status === "published" ? new Date() : existing.lastSuccessAt,
      publishedAt:
        opts.status === "published"
          ? new Date()
          : opts.status === "rejected" || opts.status === "archived"
            ? null
            : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(syncLinks.id, existing.id))
    .returning();

  return updated!;
}

export async function resolveTenantOwnerEmail(
  tenantId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.tenantId, tenantId))
    .limit(1);
  return row?.email ?? null;
}
