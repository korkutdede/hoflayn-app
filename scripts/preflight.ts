import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { assertStripeModeSafe, detectStripeMode } from "../src/lib/billing/mode";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Beta go/no-go preflight. Verifies required env flags + DB + Stripe mode safety.
 * Usage: npm run preflight
 * Exit code 1 if any REQUIRED check fails (CI-friendly).
 */

type Check = { name: string; ok: boolean; detail?: string };

function has(name: string): boolean {
  const v = process.env[name];
  return Boolean(v && v.trim().length > 0);
}

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

/** Core billing — half-configured is a footgun. */
const BILLING_CORE = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
] as const;

/** Credit packs — required when any billing is enabled (cutover completeness). */
const BILLING_PACKS = [
  "STRIPE_CREDITS_50_PRICE_ID",
  "STRIPE_CREDITS_200_PRICE_ID",
] as const;

const OPTIONAL = [
  "REPLICATE_API_TOKEN",
  "OPENAI_API_KEY",
  "HOFLAYN_WEB_BRIDGE_URL",
  "HOFLAYN_WEB_BRIDGE_API_KEY",
  "SUPPORT_EMAIL",
  "STUDIO_JOBS_PER_MINUTE",
  "HOURLY_TENANT_USD_CAP",
  "DAILY_TENANT_USD_CAP",
  "STRIPE_MODE",
  "ALLOW_STRIPE_LIVE",
  "ALLOWLIST_EMAILS",
] as const;

async function checkDatabase(): Promise<Check> {
  if (!has("DATABASE_URL")) {
    return { name: "database", ok: false, detail: "DATABASE_URL missing" };
  }
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    await db.execute(sql`select 1 as ok`);
    return { name: "database", ok: true };
  } catch (err) {
    return {
      name: "database",
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    };
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  const required: Check[] = REQUIRED.map((name) => ({ name, ok: has(name) }));

  const billingCoreSet = BILLING_CORE.filter(has);
  const billingEnabled = billingCoreSet.length > 0;
  const billingCoreComplete =
    !billingEnabled || billingCoreSet.length === BILLING_CORE.length;
  const packsComplete =
    !billingEnabled || BILLING_PACKS.every((name) => has(name));

  const stripeMode = detectStripeMode();
  const stripeSafety = assertStripeModeSafe();

  const db = await checkDatabase();
  const production =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  const providersReady =
    !production ||
    (has("REPLICATE_API_TOKEN") && has("OPENAI_API_KEY")) ||
    process.env.ALLOW_MOCK_AI === "true";
  const deferredJobs = process.env.AI_JOBS_INLINE !== "true";
  const workerReady =
    !production ||
    !deferredJobs ||
    has("AI_WORKER_SECRET") ||
    has("CRON_SECRET");

  const hardFail =
    required.some((c) => !c.ok) ||
    !db.ok ||
    !billingCoreComplete ||
    !packsComplete ||
    !stripeSafety.ok ||
    !providersReady ||
    !workerReady;

  console.log("\n=== Hoflayn preflight ===\n");

  console.log("Required:");
  for (const c of required) {
    console.log(`  ${c.ok ? "OK " : "MISSING"}  ${c.name}`);
  }

  console.log("\nDatabase:");
  console.log(
    `  ${db.ok ? "OK " : "FAIL"}  connectivity${db.detail ? ` — ${db.detail}` : ""}`,
  );

  console.log("\nBilling:");
  if (!billingEnabled) {
    console.log("  SKIP  Stripe not configured (billing disabled)");
  } else {
    console.log(
      `  ${billingCoreComplete ? "OK " : "FAIL"}  core env (${BILLING_CORE.join(", ")})`,
    );
    console.log(
      `  ${packsComplete ? "OK " : "FAIL"}  credit pack prices (${BILLING_PACKS.join(", ")})`,
    );
    console.log(
      `  ${stripeSafety.ok ? "OK " : "FAIL"}  mode=${stripeMode}${
        stripeSafety.error ? ` — ${stripeSafety.error}` : ""
      }`,
    );
    if (stripeMode === "live") {
      console.log("  NOTE  LIVE mode — real charges. See docs/STRIPE_CUTOVER.md");
    }
  }

  console.log("\nAI runtime:");
  if (!production) {
    console.log("  SKIP  production provider and worker requirements");
  } else {
    console.log(
      `  ${providersReady ? "OK " : "FAIL"}  production providers (OpenAI + Replicate)`,
    );
    console.log(
      `  ${workerReady ? "OK " : "FAIL"}  deferred worker secret`,
    );
  }

  console.log("\nOptional:");
  for (const name of OPTIONAL) {
    console.log(`  ${has(name) ? "on " : "off"}  ${name}`);
  }

  console.log(
    `\nResult: ${hardFail ? "NO-GO — fix the items above" : "GO — required checks passed"}\n`,
  );

  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error("preflight crashed:", err);
  process.exit(1);
});
