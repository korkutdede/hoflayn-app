"use client";

import { useActionState } from "react";
import {
  createTestRemoveBgJob,
  type TestJobActionState,
} from "../_actions/test-ai-job";
import { Button } from "@/components/ui/button";
import { useTranslator } from "@/lib/i18n/client";

const initial: TestJobActionState = {};

export function TestAiJobButton() {
  const [state, action, pending] = useActionState(
    createTestRemoveBgJob,
    initial,
  );
  const t = useTranslator();

  return (
    <div className="space-y-3">
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending
            ? t("dashboard.testJob.submitting")
            : t("dashboard.testJob.submit")}
        </Button>
      </form>
      {state.ok ? (
        <p className="text-sm text-emerald-700" role="status">
          {t("dashboard.testJob.result", {
            status: state.status ?? "",
            jobId: state.jobId?.slice(0, 8) ?? "",
            provider: state.provider ?? "",
            credits: state.creditsCharged ?? 0,
          })}
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
