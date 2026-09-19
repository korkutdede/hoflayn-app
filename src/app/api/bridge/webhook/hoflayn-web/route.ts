import { NextResponse } from "next/server";
import { z } from "zod";
import { applyHoflaynWebWebhook } from "@/lib/bridge";
import {
  getBridgeWebhookSecret,
  verifyBridgeSignature,
  verifyBridgeWebhookSecret,
} from "@/lib/bridge/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  externalId: z.union([z.string(), z.number()]).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  status: z.enum(["pending", "published", "rejected", "failed", "archived"]),
  message: z.string().max(1000).optional().nullable(),
});

/**
 * Inbound webhook from Hoflayn Web PHP after admin approve/reject.
 * Auth: required shared secret header X-Bridge-Secret.
 */
export async function POST(request: Request) {
  const legacySecret = getBridgeWebhookSecret();
  const signingSecret =
    process.env.HOFLAYN_WEB_BRIDGE_SIGNING_SECRET?.trim() || null;
  if (!legacySecret && !signingSecret) {
    return NextResponse.json(
      { error: "Bridge webhook is not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signedRequest =
    signingSecret &&
    verifyBridgeSignature({
      rawBody,
      timestamp: request.headers.get("x-bridge-timestamp"),
      signature: request.headers.get("x-bridge-signature"),
      secret: signingSecret,
    });
  const legacyRequest =
    legacySecret &&
    verifyBridgeWebhookSecret(request.headers.get("x-bridge-secret"));
  if (!signedRequest && !legacyRequest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  try {
    const updated = await applyHoflaynWebWebhook({
      productId: parsed.data.productId,
      tenantId: parsed.data.tenantId,
      externalId:
        parsed.data.externalId === undefined || parsed.data.externalId === null
          ? parsed.data.externalId
          : String(parsed.data.externalId),
      externalUrl: parsed.data.externalUrl ?? null,
      status: parsed.data.status,
      message: parsed.data.message ?? null,
    });

    return NextResponse.json({
      ok: true,
      syncLinkId: updated.id,
      status: updated.status,
      externalId: updated.externalId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
