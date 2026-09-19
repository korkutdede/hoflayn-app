import { sql } from "drizzle-orm";
import { db } from "@/db";
import { assertStripeModeSafe } from "@/lib/billing/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public liveness / readiness. Detailed environment diagnostics stay in
 * `npm run preflight` and are never exposed over HTTP.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "error" | "unconfigured" = "unconfigured";

  if (!process.env.DATABASE_URL) {
    database = "unconfigured";
  } else {
    try {
      await db.execute(sql`select 1 as ok`);
      database = "ok";
    } catch {
      database = "error";
    }
  }

  const stripeSafety = assertStripeModeSafe();

  const body = {
    ok: database !== "error" && stripeSafety.ok,
    ready: database === "ok" && stripeSafety.ok,
    service: "hoflayn.app",
    time: new Date().toISOString(),
    latencyMs: Date.now() - started,
    checks: {
      database,
    },
  };

  const status = database === "error" || !stripeSafety.ok ? 503 : 200;

  return Response.json(body, { status });
}
