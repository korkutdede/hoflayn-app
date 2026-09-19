import { handleWebhook } from "@/lib/billing";
import { logEvent } from "@/lib/observability/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  try {
    // Signature verification requires the exact raw body; do not call json().
    const payload = await request.text();
    const result = await handleWebhook(payload, signature);
    logEvent("billing.webhook", { ...result });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    logEvent("billing.webhook", { error: message }, "error");
    return Response.json({ error: message }, { status: 400 });
  }
}
