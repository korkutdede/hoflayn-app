import "server-only";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertStorageConfigured,
  MEDIA_BUCKET,
  tenantExportPath,
  tenantProcessedPath,
  tenantRawPath,
} from "./paths";

export type UploadedMedia = {
  assetId: string;
  bucket: string;
  path: string;
  publicUrl: string | null;
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
};

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

/**
 * Upload bytes to tenant-prefixed Storage path and insert media_assets row.
 */
export async function uploadTenantImage(opts: {
  tenantId: string;
  bytes: Buffer;
  mimeType: string;
  kind: "upload" | "processed";
  metadata?: Record<string, unknown>;
}): Promise<UploadedMedia> {
  assertStorageConfigured();

  const ext = extensionFor(opts.mimeType);
  const filename = `${randomUUID()}.${ext}`;
  const path =
    opts.kind === "upload"
      ? tenantRawPath(opts.tenantId, filename)
      : tenantProcessedPath(opts.tenantId, filename);

  return uploadBytes({
    tenantId: opts.tenantId,
    path,
    bytes: opts.bytes,
    mimeType: opts.mimeType,
    kind: opts.kind,
    metadata: opts.metadata,
  });
}

/** PDF / file exports under `{tenantId}/exports/` with optional TTL. */
export async function uploadTenantExport(opts: {
  tenantId: string;
  bytes: Buffer;
  mimeType: string;
  ttlAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<UploadedMedia> {
  assertStorageConfigured();
  const ext = extensionFor(opts.mimeType);
  const filename = `${randomUUID()}.${ext}`;
  const path = tenantExportPath(opts.tenantId, filename);
  return uploadBytes({
    tenantId: opts.tenantId,
    path,
    bytes: opts.bytes,
    mimeType: opts.mimeType,
    kind: "export",
    ttlAt: opts.ttlAt,
    metadata: opts.metadata,
  });
}

async function uploadBytes(opts: {
  tenantId: string;
  path: string;
  bytes: Buffer;
  mimeType: string;
  kind: "upload" | "processed" | "export";
  ttlAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<UploadedMedia> {
  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(opts.path, opts.bytes, {
      contentType: opts.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: signed, error: signError } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(opts.path, 60 * 60);

  if (signError || !signed?.signedUrl) {
    throw new Error(
      `Signed URL failed: ${signError?.message ?? "unknown error"}`,
    );
  }

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      tenantId: opts.tenantId,
      kind: opts.kind,
      bucket: MEDIA_BUCKET,
      path: opts.path,
      mimeType: opts.mimeType,
      sizeBytes: opts.bytes.byteLength,
      ttlAt: opts.ttlAt ?? null,
      metadata: opts.metadata ?? {},
    })
    .returning();

  if (!asset) {
    throw new Error("media_assets insert failed");
  }

  return {
    assetId: asset.id,
    bucket: MEDIA_BUCKET,
    path: opts.path,
    publicUrl: null,
    signedUrl: signed.signedUrl,
    mimeType: opts.mimeType,
    sizeBytes: opts.bytes.byteLength,
  };
}

export async function createSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string> {
  assertStorageConfigured();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}
