import type { MessageKey, MessageVars } from "@hoflayn/i18n";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { LocalizedError } from "@/lib/i18n/error";

export const HOFLAYN_WEB_PROVIDER = "hoflayn_web" as const;
export const BRIDGE_CONTRACT_VERSION = "1";
export const BRIDGE_SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

export type BridgeOperation = "upsert" | "archive";

export type BridgeExportPayload = {
  contractVersion: typeof BRIDGE_CONTRACT_VERSION;
  source: "hoflayn.app";
  operation: BridgeOperation;
  idempotencyKey: string;
  requestId: string;
  sentAt: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    email: string;
    craftCategory: string | null;
  };
  product: {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    stockQuantity: number;
    category: string | null;
    tags: string[];
    sku: string | null;
    barcodeValue: string | null;
    barcodeFormat: string | null;
    dimensions: {
      lengthCm: string | null;
      widthCm: string | null;
      heightCm: string | null;
      weightKg: string | null;
    };
    updatedAt: string;
    images: Array<{
      mediaAssetId: string;
      url: string;
      isCover: boolean;
    }>;
  };
};

export class BridgeConfigurationError extends LocalizedError {
  readonly code = "BRIDGE_NOT_CONFIGURED" as const;
  constructor() {
    super("bridge.error.notConfigured");
    this.name = "BridgeConfigurationError";
  }
}

export class BridgeExportError extends LocalizedError {
  readonly code = "BRIDGE_EXPORT_FAILED" as const;
  readonly statusCode?: number;

  constructor(
    messageKey: MessageKey,
    opts: { statusCode?: number; vars?: MessageVars } = {},
  ) {
    super(messageKey, opts.vars);
    this.name = "BridgeExportError";
    this.statusCode = opts.statusCode;
  }
}

export function assertBridgeConfigured(): {
  url: string;
  apiKey: string;
  signingSecret: string | null;
} {
  const url = process.env.HOFLAYN_WEB_BRIDGE_URL?.trim();
  const apiKey = process.env.HOFLAYN_WEB_BRIDGE_API_KEY?.trim();
  if (!url || !apiKey) {
    throw new BridgeConfigurationError();
  }
  return {
    url,
    apiKey,
    signingSecret: process.env.HOFLAYN_WEB_BRIDGE_SIGNING_SECRET?.trim() || null,
  };
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function getBridgeWebhookSecret(): string | null {
  return process.env.HOFLAYN_WEB_BRIDGE_WEBHOOK_SECRET?.trim() || null;
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyBridgeWebhookSecret(provided: string | null): boolean {
  const configured = getBridgeWebhookSecret();
  if (!configured || !provided) return false;
  const expectedHash = createHash("sha256").update(configured).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return safeEqual(expectedHash, providedHash);
}

export function createBridgeSignature(
  rawBody: string,
  timestamp: string,
  secret = process.env.HOFLAYN_WEB_BRIDGE_SIGNING_SECRET?.trim(),
): string | null {
  if (!secret) return null;
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

export function verifyBridgeSignature(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  nowSeconds?: number;
  secret?: string | null;
}): boolean {
  const secret =
    opts.secret ?? process.env.HOFLAYN_WEB_BRIDGE_SIGNING_SECRET?.trim() ?? null;
  if (!secret || !opts.timestamp || !opts.signature) return false;

  const timestampSeconds = Number(opts.timestamp);
  const nowSeconds = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > BRIDGE_SIGNATURE_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expected = createBridgeSignature(
    opts.rawBody,
    opts.timestamp,
    secret,
  );
  if (!expected) return false;
  return safeEqual(
    createHash("sha256").update(expected).digest(),
    createHash("sha256").update(opts.signature).digest(),
  );
}
