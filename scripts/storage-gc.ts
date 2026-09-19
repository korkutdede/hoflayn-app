import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { mediaAssets, products } from "../src/db/schema";
import { MEDIA_BUCKET } from "../src/lib/media/paths";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Garbage-collect orphaned media assets (ttlAt expired + not a product cover).
 *
 * Usage:
 *   npm run storage:gc              # dry-run (default)
 *   npm run storage:gc -- --apply   # delete Storage objects + DB rows
 */

type Candidate = {
  id: string;
  tenantId: string;
  path: string;
  bucket: string;
  ttlAt: Date | null;
  kind: string;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const candidates = (await db
      .select({
        id: mediaAssets.id,
        tenantId: mediaAssets.tenantId,
        path: mediaAssets.path,
        bucket: mediaAssets.bucket,
        ttlAt: mediaAssets.ttlAt,
        kind: mediaAssets.kind,
      })
      .from(mediaAssets)
      .where(
        and(
          isNotNull(mediaAssets.ttlAt),
          sql`${mediaAssets.ttlAt} <= now()`,
          sql`${mediaAssets.id} not in (
            select cover_image_id from products
            where cover_image_id is not null
          )`,
        ),
      )
      .limit(500)) as Candidate[];

    console.log(
      `\n=== Hoflayn storage GC (${apply ? "APPLY" : "dry-run"}) ===\n`,
    );
    console.log(`Candidates: ${candidates.length}`);

    if (candidates.length === 0) {
      console.log("Nothing to clean.\n");
      return;
    }

    for (const row of candidates) {
      console.log(
        `  ${row.id}  tenant=${row.tenantId.slice(0, 8)}…  ${row.kind}  ${row.path}`,
      );
    }

    if (!apply) {
      console.log(
        "\nDry-run only. Re-run with --apply to delete Storage objects + rows.\n",
      );
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --apply",
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let deleted = 0;
    let failed = 0;

    for (const row of candidates) {
      // Final safety: still a cover?
      const [cover] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.coverImageId, row.id))
        .limit(1);
      if (cover) {
        console.log(`  skip (still cover): ${row.id}`);
        continue;
      }

      const { error: storageError } = await admin.storage
        .from(row.bucket || MEDIA_BUCKET)
        .remove([row.path]);

      if (storageError) {
        console.log(`  storage fail ${row.id}: ${storageError.message}`);
        failed += 1;
        continue;
      }

      await db.delete(mediaAssets).where(eq(mediaAssets.id, row.id));
      deleted += 1;
    }

    console.log(`\nDeleted: ${deleted} · failed: ${failed}\n`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("storage-gc failed:", err);
  process.exit(1);
});
