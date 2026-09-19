"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  signInAction,
  signInWithGoogleAction,
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

export function LoginForm({
  oauthError,
}: {
  oauthError?: "google" | "auth_callback";
}) {
  const [state, formAction, pending] = useActionState(signInAction, initial);
  const t = useTranslator();
  const oauthMessage =
    oauthError === "google"
      ? t("auth.error.google")
      : oauthError === "auth_callback"
        ? t("auth.error.callback")
        : null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("auth.login.description")}</CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password.label")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          {state.error || oauthMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error ?? oauthMessage}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-500">{t("auth.or")}</span>
          </div>
        </div>

        <form action={signInWithGoogleAction}>
          <Button type="submit" variant="outline" className="w-full">
            {t("auth.google")}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          <Link
            href="/forgot-password"
            className="font-medium text-zinc-900 underline"
          >
            {t("auth.login.forgot")}
          </Link>
        </p>

        <p className="text-center text-sm text-zinc-500">
          {t("auth.login.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline">
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
