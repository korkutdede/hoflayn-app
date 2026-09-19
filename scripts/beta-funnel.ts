import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Beta learning funnel, read straight from the database (no 3rd-party analytics).
 *
 * Usage:
 *   npm run beta:funnel              # last 14 days, table output
 *   npm run beta:funnel -- 30        # last 30 days
 *   npm run beta:funnel -- 30 --json # machine-readable, for docs/RETRO.md
 *
 * Counts per tenant: signup → onboarding → studio job → product → caption →
 * checkout. Log events (docs/ANALYTICS.md) cover real-time debugging; this
 * script is the aggregate view for the 10-producer cohort.
 */

type FunnelRow = {
  tenant_id: string;
  tenant_name: string;
  craft_category: string | null;
  signed_up_at: Date;
  onboarded: boolean;
  studio_jobs: number;
  products: number;
  captions: number;
  descriptions: number;
  failed_jobs: number;
  credits_spent: number;
  credit_balance: number;
  checkout_events: number;
  paid: boolean;
};

/** Anonymized tenant label for reports that get pasted into shared docs. */
type FunnelReport = {
  generatedAt: string;
  windowDays: number;
  totals: {
    signup: number;
    onboardingDone: number;
    studioJob: number;
    productCreated: number;
    captionGenerated: number;
    checkoutStarted: number;
    paid: number;
  };
  conversion: Record<string, number>;
  usage: {
    studioJobs: number;
    products: number;
    captions: number;
    descriptions: number;
    failedJobs: number;
    creditsSpent: number;
    failureRate: number;
  };
  stuckAfterOnboarding: string[];
  tenants: Array<{
    tenantId: string;
    name: string;
    craftCategory: string | null;
    signedUpAt: string;
    onboarded: boolean;
    studioJobs: number;
    products: number;
    captions: number;
    descriptions: number;
    failedJobs: number;
    creditsSpent: number;
    creditBalance: number;
    checkoutStarted: boolean;
    paid: boolean;
  }>;
};

function ratio(part: number, total: number): number {
  if (total === 0) return 0;
  return Number((part / total).toFixed(3));
}

function pct(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function pad(value: string, width: number): string {
  return value.length >= width
    ? value.slice(0, width)
    : value + " ".repeat(width - value.length);
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : " ".repeat(width - value.length) + value;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const dayArg = args.find((a) => !a.startsWith("--"));

  const days = Number(dayArg ?? 14);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(`Invalid day window: ${dayArg}`);
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const result = await db.execute<FunnelRow>(sql`
      with window_start as (
        select now() - (${days}::text || ' days')::interval as ts
      )
      select
        t.id            as tenant_id,
        t.name          as tenant_name,
        t.craft_category,
        t.created_at    as signed_up_at,
        (t.craft_category is not null)                as onboarded,
        coalesce(j.studio_jobs, 0)::int               as studio_jobs,
        coalesce(p.products, 0)::int                  as products,
        coalesce(j.captions, 0)::int                  as captions,
        coalesce(j.descriptions, 0)::int              as descriptions,
        coalesce(j.failed_jobs, 0)::int               as failed_jobs,
        coalesce(j.credits_spent, 0)::int             as credits_spent,
        t.credit_balance                              as credit_balance,
        coalesce(b.checkout_events, 0)::int           as checkout_events,
        (s.tenant_id is not null)                     as paid
      from tenants t
      cross join window_start w
      left join (
        select
          tenant_id,
          count(*) filter (
            where status = 'succeeded' and operation in ('remove_bg', 'white_bg')
          ) as studio_jobs,
          count(*) filter (
            where status = 'succeeded' and operation = 'generate_caption'
          ) as captions,
          count(*) filter (
            where status = 'succeeded' and operation = 'generate_description'
          ) as descriptions,
          count(*) filter (where status = 'failed') as failed_jobs,
          sum(credits_charged) as credits_spent
        from ai_jobs, window_start
        where created_at >= window_start.ts
        group by tenant_id
      ) j on j.tenant_id = t.id
      left join (
        select tenant_id, count(*) as products
        from products, window_start
        where created_at >= window_start.ts
        group by tenant_id
      ) p on p.tenant_id = t.id
      -- billing_events has no tenant column (provider inbox), so checkout intent
      -- is measured by the Stripe customer row, which is only created when a
      -- checkout session is opened.
      left join (
        select tenant_id, count(*) as checkout_events
        from billing_customers
        group by tenant_id
      ) b on b.tenant_id = t.id
      left join (
        select distinct tenant_id
        from subscriptions
        where status in ('active', 'trialing')
      ) s on s.tenant_id = t.id
      where t.created_at >= w.ts
      order by t.created_at asc
    `);

    const rows = result as unknown as FunnelRow[];

    const total = rows.length;
    const onboarded = rows.filter((r) => r.onboarded).length;
    const activated = rows.filter((r) => r.studio_jobs > 0).length;
    const withProduct = rows.filter((r) => r.products > 0).length;
    const withCaption = rows.filter((r) => r.captions > 0).length;
    const startedCheckout = rows.filter((r) => r.checkout_events > 0).length;
    const paid = rows.filter((r) => r.paid).length;
    const stuck = rows.filter((r) => r.onboarded && r.studio_jobs === 0);

    const sum = (pick: (r: FunnelRow) => number) =>
      rows.reduce((acc, r) => acc + pick(r), 0);
    const totalStudioJobs = sum((r) => r.studio_jobs);
    const totalCaptions = sum((r) => r.captions);
    const totalDescriptions = sum((r) => r.descriptions);
    const totalFailed = sum((r) => r.failed_jobs);
    const totalSucceeded = totalStudioJobs + totalCaptions + totalDescriptions;

    if (asJson) {
      const report: FunnelReport = {
        generatedAt: new Date().toISOString(),
        windowDays: days,
        totals: {
          signup: total,
          onboardingDone: onboarded,
          studioJob: activated,
          productCreated: withProduct,
          captionGenerated: withCaption,
          checkoutStarted: startedCheckout,
          paid,
        },
        conversion: {
          signupToOnboarding: ratio(onboarded, total),
          onboardingToStudio: ratio(activated, onboarded),
          studioToProduct: ratio(withProduct, activated),
          productToCaption: ratio(withCaption, withProduct),
          signupToActivation: ratio(activated, total),
          signupToPaid: ratio(paid, total),
        },
        usage: {
          studioJobs: totalStudioJobs,
          products: sum((r) => r.products),
          captions: totalCaptions,
          descriptions: totalDescriptions,
          failedJobs: totalFailed,
          creditsSpent: sum((r) => r.credits_spent),
          failureRate: ratio(totalFailed, totalSucceeded + totalFailed),
        },
        stuckAfterOnboarding: stuck.map((r) => r.tenant_name),
        tenants: rows.map((r) => ({
          tenantId: r.tenant_id,
          name: r.tenant_name,
          craftCategory: r.craft_category,
          signedUpAt: new Date(r.signed_up_at).toISOString(),
          onboarded: r.onboarded,
          studioJobs: r.studio_jobs,
          products: r.products,
          captions: r.captions,
          descriptions: r.descriptions,
          failedJobs: r.failed_jobs,
          creditsSpent: r.credits_spent,
          creditBalance: r.credit_balance,
          checkoutStarted: r.checkout_events > 0,
          paid: r.paid,
        })),
      };
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`\n=== Hoflayn beta funnel — last ${days} days ===\n`);

    if (rows.length === 0) {
      console.log("No tenants created in this window.\n");
      return;
    }

    console.log("Funnel (tenants):");
    const steps: Array<[string, number]> = [
      ["signup", total],
      ["onboarding_done", onboarded],
      ["studio_job", activated],
      ["product_created", withProduct],
      ["caption_generated", withCaption],
      ["checkout_started", startedCheckout],
      ["paid (active sub)", paid],
    ];
    for (const [label, count] of steps) {
      console.log(
        `  ${pad(label, 20)} ${padLeft(String(count), 4)}  ${padLeft(pct(count, total), 5)}`,
      );
    }

    console.log("\nPer tenant:");
    console.log(
      `  ${pad("atölye", 22)} ${pad("kategori", 10)} ${pad("onb", 4)} ${pad("foto", 5)} ${pad("ürün", 5)} ${pad("cap", 4)} ${pad("açık", 5)} ${pad("hata", 5)} ${pad("kredi", 6)} ${pad("bakiye", 7)} ödeme`,
    );
    for (const r of rows) {
      console.log(
        `  ${pad(r.tenant_name, 22)} ${pad(r.craft_category ?? "—", 10)} ${pad(
          r.onboarded ? "✓" : "—",
          4,
        )} ${padLeft(String(r.studio_jobs), 4)}  ${padLeft(String(r.products), 4)}  ${padLeft(
          String(r.captions),
          3,
        )}  ${padLeft(String(r.descriptions), 4)}  ${padLeft(String(r.failed_jobs), 4)}  ${padLeft(
          String(r.credits_spent),
          5,
        )}  ${padLeft(String(r.credit_balance), 6)}  ${r.paid ? "pro" : r.checkout_events > 0 ? "başladı" : "—"}`,
      );
    }

    if (stuck.length > 0) {
      console.log(
        `\nDikkat: ${stuck.length} atölye onboarding'i bitirdi ama hiç foto işlemedi.`,
      );
      for (const r of stuck) {
        console.log(`  - ${r.tenant_name}`);
      }
    }

    console.log(
      `\nToplam: ${totalStudioJobs} foto · ${totalCaptions} caption · ${totalDescriptions} açıklama · ${totalFailed} hata`,
    );
    console.log("");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("beta-funnel failed:", err);
  process.exit(1);
});
