import { createHash, timingSafeEqual } from "crypto";

export function verifyBearerSecret(
  authorization: string | null,
  configuredSecret: string | undefined,
): boolean {
  const expected = configuredSecret?.trim();
  const prefix = "Bearer ";
  if (!expected || !authorization?.startsWith(prefix)) return false;
  const provided = authorization.slice(prefix.length);
  const expectedHash = createHash("sha256").update(expected).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}
