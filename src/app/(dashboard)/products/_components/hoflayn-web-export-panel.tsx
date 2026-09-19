"use client";

import { formatDate, type MessageKey } from "@hoflayn/i18n";
import { useActionState } from "react";
import {
  exportProductToHoflaynWebAction,
  type ExportActionState,
} from "../_actions/bridge-actions";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslator } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const initial: ExportActionState = {};

/** Bridge statuses come from the PHP side; only their labels are localized. */
const STATUS_KEYS = {
  draft: "bridge.status.draft",
  pending: "bridge.status.pending",
  published: "bridge.status.published",
  rejected: "bridge.status.rejected",
  failed: "bridge.status.failed",
  archived: "bridge.status.archived",
} as const satisfies Record<string, MessageKey>;

function SyncBadge({
  status,
  label,
}: {
  status: string | null | undefined;
  label: string;
}) {
  if (!status) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        status === "published" && "bg-emerald-50 text-emerald-800",
        status === "pending" && "bg-amber-50 text-amber-900",
        status === "rejected" && "bg-red-50 text-red-700",
        status === "failed" && "bg-red-50 text-red-700",
        status === "draft" && "bg-zinc-100 text-zinc-600",
        status === "archived" && "bg-zinc-100 text-zinc-500",
      )}
    >
      {label}
    </span>
  );
}

export function HoflaynWebExportPanel({
  productId,
  syncStatus,
  externalId,
  externalUrl,
  rejectionReason,
  needsUpdate,
  lastError,
  lastAttemptAt,
  lastSyncedAt,
}: {
  productId: string;
  syncStatus: string | null;
  externalId: string | null;
  externalUrl?: string | null;
  rejectionReason?: string | null;
  needsUpdate?: boolean;
  lastError: string | null;
  lastAttemptAt?: string | null;
  lastSyncedAt: string | null;
}) {
  const [state, action, pending] = useActionState(
    exportProductToHoflaynWebAction,
    initial,
  );

  const t = useTranslator();
  const locale = useLocale();

  const displayStatus = state.status ?? syncStatus;
  const displayExternalId =
    state.externalId !== undefined ? state.externalId : externalId;

  const statusKey =
    displayStatus && displayStatus in STATUS_KEYS
      ? STATUS_KEYS[displayStatus as keyof typeof STATUS_KEYS]
      : null;
  const statusLabel = statusKey
    ? t(statusKey)
    : (displayStatus ?? t("bridge.status.notSent"));

  const timestamp = (value: string) =>
    formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SyncBadge status={displayStatus} label={statusLabel} />
        {displayExternalId ? (
          <span className="text-xs text-zinc-500">
            {t("bridge.externalId")}: <code>{displayExternalId}</code>
          </span>
        ) : null}
        {externalUrl ? (
          <a
            className="text-xs font-medium text-zinc-700 underline"
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("bridge.viewOnWeb")}
          </a>
        ) : null}
        {needsUpdate ? (
          <span className="text-xs font-medium text-amber-700">
            {t("bridge.localChanges")}
          </span>
        ) : null}
        {lastAttemptAt ? (
          <span className="text-xs text-zinc-400">
            {t("bridge.lastAttempt", { date: timestamp(lastAttemptAt) })}
          </span>
        ) : null}
        {lastSyncedAt ? (
          <span className="text-xs text-zinc-400">
            {t("bridge.lastSuccess", { date: timestamp(lastSyncedAt) })}
          </span>
        ) : null}
      </div>

      <form action={action}>
        <input type="hidden" name="productId" value={productId} />
        <Button type="submit" disabled={pending}>
          {pending
            ? t("bridge.sending")
            : displayStatus
              ? t("bridge.resend")
              : t("bridge.send")}
        </Button>
      </form>
      {displayStatus === "published" ? (
        <form
          action={action}
          onSubmit={(event) => {
            if (!window.confirm(t("bridge.archiveConfirm"))) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="operation" value="archive" />
          <Button type="submit" variant="outline" disabled={pending}>
            {t("bridge.archive")}
          </Button>
        </form>
      ) : null}

      {state.ok ? (
        <p className="text-sm text-emerald-700" role="status">
          {t("bridge.sent", { status: state.status ?? "" })}
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {!state.error && rejectionReason ? (
        <p className="text-sm text-red-600" role="alert">
          {t("bridge.rejectionReason", { reason: rejectionReason })}
        </p>
      ) : null}
      {!state.error && lastError ? (
        <p className="text-sm text-red-600" role="alert">
          {t("bridge.lastError", { error: lastError })}
        </p>
      ) : null}
    </div>
  );
}
