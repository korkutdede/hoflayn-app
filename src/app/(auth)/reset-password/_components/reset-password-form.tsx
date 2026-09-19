"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updatePasswordAction,
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

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initial,
  );
  const t = useTranslator();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.reset.title")}</CardTitle>
        <CardDescription>{t("auth.reset.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.reset.password.label")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("auth.reset.confirm.label")}</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.reset.submitting") : t("auth.reset.submit")}
          </Button>
        </form>
        <p className="text-center text-sm text-zinc-500">
          {t("auth.reset.expiredPrefix")}{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-zinc-900 underline"
          >
            {t("auth.reset.expiredLink")}
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
