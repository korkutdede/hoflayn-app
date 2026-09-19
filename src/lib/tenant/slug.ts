import type { Translator } from "@hoflayn/i18n";

/**
 * Generate a URL-safe tenant slug.
 * Prefers the email local-part; falls back to a random atelier id.
 */
export function slugifyBase(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function buildTenantSlug(email: string): string {
  const local = email.split("@")[0] ?? "atelier";
  const base = slugifyBase(local) || "atelier";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Seeds `tenants.name` at signup. This lands in the database and shows up as
 * the workshop heading, so it has to be written in the language the visitor
 * signed up in — renaming it later is the owner's job, not a migration.
 */
export function defaultTenantName(
  email: string,
  fullName: string | null | undefined,
  t: Translator,
): string {
  const owner = fullName?.trim() || (email.split("@")[0] ?? "");
  if (!owner) return t("tenant.defaultName.fallback");
  return t("tenant.defaultName", { owner });
}
