import { inviteGateMode, isAllowlistEnabled } from "@/lib/auth/allowlist";
import { getTranslator } from "@/lib/i18n/server";
import { getSupportEmail, supportMailto } from "@/lib/support";

export async function BetaAuthBadge({
  inviteError = false,
}: {
  inviteError?: boolean;
}) {
  const t = await getTranslator();
  const supportHref = supportMailto({
    subject: t("beta.mail.subject"),
    body: t("beta.mail.body"),
  });
  const gate = inviteGateMode();
  const allowlistOn = isAllowlistEnabled();
  const email = getSupportEmail();

  if (gate === "open" && !inviteError) {
    return null;
  }

  return (
    <div className="mb-6 w-full max-w-md space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium tracking-wide text-zinc-700">
          {t("beta.badge")}
        </span>
        {allowlistOn ? (
          <span className="text-xs text-zinc-500">
            {t("beta.inviteRequired")}
          </span>
        ) : null}
      </div>

      {inviteError ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {t("beta.notInvited")}{" "}
          <a href={supportHref} className="font-medium underline">
            {email}
          </a>
          .
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          {t("beta.problem")}{" "}
          <a href={supportHref} className="font-medium text-zinc-800 underline">
            {email}
          </a>
        </p>
      )}
    </div>
  );
}
