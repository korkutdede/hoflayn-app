import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  FREE_MONTHLY_CREDITS,
  FREE_PLAN_DEFAULTS,
  FREE_PLAN_ID,
} from "../src/lib/constants";
import { PRO_PLAN } from "../src/lib/billing/config";
import { plans } from "../src/db/schema";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Idempotent plan catalog seed (free + pro).
 * Usage: npm run db:seed
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed plans");
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  await db
    .insert(plans)
    .values({
      id: FREE_PLAN_ID,
      // Internal label; the UI renders the "billing.plan.free" key instead.
      name: "Free",
      monthlyCredits: FREE_MONTHLY_CREDITS,
      priceCents: 0,
      currency: "USD",
      defaults: { ...FREE_PLAN_DEFAULTS },
    })
    .onConflictDoUpdate({
      target: plans.id,
      set: {
        name: "Free",
        monthlyCredits: FREE_MONTHLY_CREDITS,
        priceCents: 0,
        currency: "USD",
        defaults: { ...FREE_PLAN_DEFAULTS },
      },
    });

  await db
    .insert(plans)
    .values({
      id: PRO_PLAN.id,
      name: PRO_PLAN.name,
      monthlyCredits: PRO_PLAN.monthlyCredits,
      priceCents: PRO_PLAN.priceCents,
      currency: PRO_PLAN.currency,
      defaults: { ...PRO_PLAN.defaults },
    })
    .onConflictDoUpdate({
      target: plans.id,
      set: {
        name: PRO_PLAN.name,
        monthlyCredits: PRO_PLAN.monthlyCredits,
        priceCents: PRO_PLAN.priceCents,
        currency: PRO_PLAN.currency,
        defaults: { ...PRO_PLAN.defaults },
      },
    });

  const free = await db.select().from(plans).where(eq(plans.id, FREE_PLAN_ID));
  const pro = await db.select().from(plans).where(eq(plans.id, PRO_PLAN.id));

  console.log("Seeded plans:");
  console.log(
    " -",
    free[0]?.id,
    free[0]?.name,
    `credits=${free[0]?.monthlyCredits}`,
  );
  console.log(
    " -",
    pro[0]?.id,
    pro[0]?.name,
    `credits=${pro[0]?.monthlyCredits}`,
  );

  await client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
