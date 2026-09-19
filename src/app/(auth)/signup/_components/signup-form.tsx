"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  signUpAction,
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
import { FREE_INITIAL_CREDITS } from "@/lib/constants";
import { useTranslator } from "@/lib/i18n/client";

const initial: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initial);
  const t = useTranslator();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.signup.title")}</CardTitle>
        <CardDescription>
          {t("auth.signup.description", { credits: FREE_INITIAL_CREDITS })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("auth.signup.name.label")}</Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder={t("auth.signup.name.placeholder")}
            />
          </div>
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
          {state.success ? (
            <p className="text-sm text-emerald-700" role="status">
              {state.success}
            </p>
          ) : null}
          <label className="flex items-start gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-1 accent-zinc-900"
            />
            <span>
              {t("auth.terms.label")}{" "}
              <Link href="/privacy" className="underline">
                {t("landing.legal.privacy")}
              </Link>
              {" · "}
              <Link href="/terms" className="underline">
                {t("landing.legal.terms")}
              </Link>
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.signup.submitting") : t("auth.signup.submit")}
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
        <p className="text-center text-xs text-zinc-500">{t("auth.terms.google")}</p>

        <p className="text-center text-sm text-zinc-500">
          {t("auth.signup.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            {t("auth.signup.loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
