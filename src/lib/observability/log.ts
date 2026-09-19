/**
 * Structured, single-line JSON logging for beta observability.
 * Safe on server and edge; never logs secrets. Prefer this over ad-hoc
 * console.log so logs are greppable/parseable in Vercel.
 */

export type LogLevel = "info" | "warn" | "error";

/** Operational events (health, failures, integrations). */
export type OpsEventName =
  | "auth.signup"
  | "auth.login"
  | "ai_job.succeeded"
  | "ai_job.failed"
  | "ai_worker.job_error"
  | "billing.webhook"
  | "billing.checkout"
  | "bridge.export"
  | "ratelimit.blocked";

/**
 * Beta learning funnel (docs/ANALYTICS.md). Kept in its own `funnel.` namespace
 * so activation analysis can grep one prefix without ops noise.
 */
export type FunnelEventName =
  | "funnel.signup"
  | "funnel.onboarding_done"
  | "funnel.studio_job"
  | "funnel.product_created"
  | "funnel.caption_generated"
  | "funnel.seo_analyzed"
  | "funnel.seo_applied"
  | "funnel.catalog_created"
  | "funnel.catalog_export_started"
  | "funnel.labels_export_started"
  | "funnel.stock_movement"
  | "funnel.sale_created"
  | "funnel.sale_voided"
  | "funnel.low_stock_detected"
  | "funnel.checkout_started";

export type EventName = OpsEventName | FunnelEventName;

export function logEvent(
  event: EventName,
  data: Record<string, unknown> = {},
  level: LogLevel = "info",
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Funnel step. Always tenant-scoped so per-producer activation can be counted.
 */
export function logFunnel(
  event: FunnelEventName,
  data: { tenantId: string } & Record<string, unknown>,
): void {
  logEvent(event, data);
}
