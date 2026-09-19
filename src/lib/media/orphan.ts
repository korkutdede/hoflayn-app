import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, products } from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertStorageConfigured, MEDIA_BUCKET } from "./paths";

/**
 * Marks a media asset for GC when no product still uses it as cover.
 * Safe no-op if another product still references it or the asset is missing.
 */
export async function markMediaOrphanIfUnused(
  tenantId: string,
  mediaAssetId: string | null | undefined,
): Promise<boolean> {
  if (!mediaAssetId) return false;

  const [stillUsed] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.coverImageId, mediaAssetId),
      ),
    )
    .limit(1);

  if (stillUsed) return false;

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, mediaAssetId),
        eq(mediaAssets.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!asset) return false;

  await db
    .update(mediaAssets)
    .set({
      ttlAt: new Date(),
      metadata: {
        ...(asset.metadata ?? {}),
        orphaned: true,
        orphanedAt: new Date().toISOString(),
      },
    })
    .where(eq(mediaAssets.id, asset.id));

  return true;
}

export async function deleteMediaAsset(
  tenantId: string,
  mediaAssetId: string,
): Promise<{ deleted: boolean; path?: string }> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.tenantId, tenantId)),
    )
    .limit(1);

  if (!asset) return { deleted: false };

  const [cover] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.coverImageId, mediaAssetId))
    .limit(1);
  if (cover) return { deleted: false };

  try {
    assertStorageConfigured();
    const admin = createSupabaseAdminClient();
    await admin.storage.from(asset.bucket || MEDIA_BUCKET).remove([asset.path]);
  } catch {
    // DB row still removed so GC can retry storage separately if needed.
  }

  await db
    .delete(mediaAssets)
    .where(
      and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.tenantId, tenantId)),
    );

  return { deleted: true, path: asset.path };
}

/** Candidates: ttl expired and not used as any product cover. */
export async function listExpiredOrphanMedia(limit = 200) {
  return db
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
    .limit(limit);
}

/** Helper for cover swaps: mark previous cover orphan after update. */
export async function markPreviousCoverOrphan(opts: {
  tenantId: string;
  previousCoverId: string | null;
  nextCoverId: string | null;
}) {
  if (!opts.previousCoverId) return;
  if (opts.previousCoverId === opts.nextCoverId) return;
  await markMediaOrphanIfUnused(opts.tenantId, opts.previousCoverId);
}
