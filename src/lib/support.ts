import { APP_NAME } from "@/lib/constants";

export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || "destek@hoflayn.app";
}

export function supportMailto(opts?: {
  subject?: string;
  body?: string;
}): string {
  const email = getSupportEmail();
  const subject = encodeURIComponent(
    opts?.subject ?? `[${APP_NAME} Beta] Destek`,
  );
  const body = opts?.body ? encodeURIComponent(opts.body) : "";
  return `mailto:${email}?subject=${subject}${body ? `&body=${body}` : ""}`;
}
