export const MEDIA_BUCKET = "media-assets";

export function tenantRawPath(tenantId: string, filename: string): string {
  return `${tenantId}/raw/${filename}`;
}

export function tenantProcessedPath(tenantId: string, filename: string): string {
  return `${tenantId}/processed/${filename}`;
}

export function tenantExportPath(tenantId: string, filename: string): string {
  return `${tenantId}/exports/${filename}`;
}

/**
 * Thrown when the storage env vars are missing. Callers that can degrade
 * gracefully match on the class, never on the message — the wording is a
 * developer-facing detail and may be localized or reworded.
 */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase Storage is not configured. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

export function assertStorageConfigured(): void {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new StorageNotConfiguredError();
  }
}
