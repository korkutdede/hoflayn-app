"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslator } from "@/lib/i18n/client";

const initial: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initial,
  );
  const t = useTranslator();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.forgot.title")}</CardTitle>
        <CardDescription>{t("auth.forgot.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email.label")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t("auth.email.placeholder")}
            />
          </div>
          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-700" role="status">
              {state.success}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
          </Button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-900 underline">
            {t("auth.forgot.backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
