import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { assertStripeModeSafe, detectStripeMode } from "../src/lib/billing/mode";
import {
  inviteGateMode,
  isAllowlistEnabled,
  parseBetaMaxTenants,
} from "../src/lib/auth/allowlist";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Closed-beta smoke: env GO/NO-GO + checklist print + optional quality gates.
 *
 *   npm run beta:smoke
 *   npm run beta:smoke -- --gates
 *   npm run beta:smoke -- --dry-run
 */

type Check = { name: string; ok: boolean; detail?: string; soft?: boolean };

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const runGates = args.has("--gates");

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

const BILLING_CORE = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
] as const;

const BILLING_PACKS = [
  "STRIPE_CREDITS_50_PRICE_ID",
  "STRIPE_CREDITS_200_PRICE_ID",
] as const;

const MANUAL_CHECKLIST = [
  ["A1", "Auth", "Demo keşif (invite gerekmez)"],
  ["A2", "Invite", "Listede olmayan e-posta → invite_required"],
  ["A3", "Invite", "Daveti kontrol et → allowlisted OK"],
  ["A4", "Auth", "Login + onboarding"],
  ["S1", "Studio", "remove_bg / white_bg + kredi"],
  ["P1", "Products", "Yeni ürün"],
  ["P2", "Stock", "Stok hareketi ledger"],
  ["P3", "Stock", "Düşük stok bandı"],
  ["V1", "Sales", "Manuel satış + stok out"],
  ["V2", "Sales", "Void + stok in"],
  ["V3", "Sales", "Summary completed only"],
  ["B1", "Billing", "Kredi paketi Checkout (test)"],
  ["B2", "Billing", "Return deep link + bakiye"],
  ["B3", "Billing", "Member satın alma engeli"],
  ["B4", "Usage", "Nereye harcandı? byOperation"],
  ["H1", "Home", "Pulse kartları"],
  ["H2", "Home", "Deep link Satışlar/Ürünler/Hesap"],
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

async function checkHealth(): Promise<Check> {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    ""
  ).replace(/\/$/, "");
  if (!base) {
    return {
      name: "health",
      ok: false,
      detail: "NEXT_PUBLIC_APP_URL / EXPO_PUBLIC_API_URL missing",
    };
  }
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json()) as { ready?: boolean; ok?: boolean };
    const ready = Boolean(body.ready ?? body.ok);
    return {
      name: "health",
      ok: res.ok && ready,
      detail: `${base}/api/health → HTTP ${res.status} ready=${ready}`,
    };
  } catch (err) {
    return {
      name: "health",
      ok: false,
      soft: true,
      detail:
        err instanceof Error
          ? `unreachable (${err.message.slice(0, 120)}) — start next or skip if offline`
          : "unreachable",
    };
  }
}

function runNpm(script: string): Check {
  const result = spawnSync("npm", ["run", script], {
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
  });
  const ok = result.status === 0;
  const tail = (result.stderr || result.stdout || "")
    .trim()
    .split(/\r?\n/)
    .slice(-3)
    .join(" | ")
    .slice(0, 200);
  return {
    name: script,
    ok,
    detail: ok ? undefined : tail || `exit ${result.status}`,
  };
}

function runExpoExport(): Check {
  const result = spawnSync(
    "npm",
    ["exec", "--workspace", "mobile", "--", "expo", "export", "--platform", "web"],
    { encoding: "utf8", shell: true, stdio: "pipe" },
  );
  const ok = result.status === 0;
  const tail = (result.stderr || result.stdout || "")
    .trim()
    .split(/\r?\n/)
    .slice(-3)
    .join(" | ")
    .slice(0, 200);
  return {
    name: "expo export --platform web",
    ok,
    detail: ok ? undefined : tail || `exit ${result.status}`,
  };
}

function printManualChecklist() {
  console.log("\nManual smoke checklist (see docs/BETA_SMOKE.md):\n");
  for (const [id, area, title] of MANUAL_CHECKLIST) {
    console.log(`  [ ] ${id}  ${area.padEnd(8)} ${title}`);
  }
  console.log("");
}

async function main() {
  console.log("\n=== Hoflayn beta smoke ===\n");

  if (dryRun) {
    console.log("Mode: dry-run (no env/DB/gates)\n");
    printManualChecklist();
    console.log("Result: DRY-RUN — fill checklist manually; run without --dry-run for GO/NO-GO\n");
    process.exit(0);
  }

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
  const health = await checkHealth();

  const gate = inviteGateMode();
  const allowlistOn = isAllowlistEnabled();
  const maxTenants = parseBetaMaxTenants();
  const betaInvite: Check = {
    name: "beta_invite_gate",
    ok: true,
    soft: true,
    detail: allowlistOn
      ? `gate=${gate} allowlist=on${maxTenants != null ? ` maxTenants=${maxTenants}` : ""}`
      : `gate=${gate} allowlist=OFF (public signup) — set ALLOWLIST_EMAILS for closed beta`,
  };

  const mobileApi: Check = {
    name: "EXPO_PUBLIC_API_URL",
    ok: has("EXPO_PUBLIC_API_URL") || has("NEXT_PUBLIC_APP_URL"),
    soft: !has("EXPO_PUBLIC_API_URL"),
    detail: has("EXPO_PUBLIC_API_URL")
      ? "set"
      : "missing — mobile should point at API (LAN)",
  };

  console.log("Required env:");
  for (const c of required) {
    console.log(`  ${c.ok ? "OK " : "MISSING"}  ${c.name}`);
  }

  console.log("\nConnectivity:");
  console.log(
    `  ${db.ok ? "OK " : "FAIL"}  database${db.detail ? ` — ${db.detail}` : ""}`,
  );
  console.log(
    `  ${health.ok ? "OK " : health.soft ? "WARN" : "FAIL"}  health${
      health.detail ? ` — ${health.detail}` : ""
    }`,
  );

  console.log("\nBilling:");
  if (!billingEnabled) {
    console.log("  SKIP  Stripe not configured");
  } else {
    console.log(
      `  ${billingCoreComplete ? "OK " : "FAIL"}  core (${BILLING_CORE.join(", ")})`,
    );
    console.log(
      `  ${packsComplete ? "OK " : "FAIL"}  packs (${BILLING_PACKS.join(", ")})`,
    );
    console.log(
      `  ${stripeSafety.ok ? "OK " : "FAIL"}  mode=${stripeMode}${
        stripeSafety.error ? ` — ${stripeSafety.error}` : ""
      }`,
    );
  }

  console.log("\nBeta:");
  console.log(
    `  ${allowlistOn ? "OK " : "WARN"}  ${betaInvite.detail}`,
  );
  console.log(
    `  ${mobileApi.ok && !mobileApi.soft ? "OK " : "WARN"}  ${mobileApi.name}${
      mobileApi.detail ? ` — ${mobileApi.detail}` : ""
    }`,
  );

  const gateChecks: Check[] = [];
  if (runGates) {
    console.log("\nQuality gates:");
    for (const script of [
      "typecheck",
      "lint",
      "build",
      "mobile:typecheck",
      "mobile:lint",
    ] as const) {
      process.stdout.write(`  … ${script}\n`);
      const check = runNpm(script);
      gateChecks.push(check);
      console.log(
        `  ${check.ok ? "OK " : "FAIL"}  ${check.name}${
          check.detail ? ` — ${check.detail}` : ""
        }`,
      );
    }
    process.stdout.write("  … expo export\n");
    const expo = runExpoExport();
    gateChecks.push(expo);
    console.log(
      `  ${expo.ok ? "OK " : "FAIL"}  ${expo.name}${
        expo.detail ? ` — ${expo.detail}` : ""
      }`,
    );
  } else {
    console.log("\nQuality gates: SKIP (pass --gates to run)");
  }

  printManualChecklist();

  const hardFail =
    required.some((c) => !c.ok) ||
    !db.ok ||
    (!health.ok && !health.soft) ||
    !billingCoreComplete ||
    !packsComplete ||
    !stripeSafety.ok ||
    gateChecks.some((c) => !c.ok);

  console.log(
    `Result: ${
      hardFail
        ? "NO-GO — fix failing checks above"
        : "GO — automated smoke passed; complete manual checklist"
    }\n`,
  );
  console.log("Docs: docs/BETA_SMOKE.md\n");

  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error("beta-smoke crashed:", err);
  process.exit(1);
});
