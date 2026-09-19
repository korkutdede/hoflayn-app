"use server";

import type { Translator } from "@hoflayn/i18n";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { provisionNewUser } from "@/lib/auth/provision";
import { checkInviteEmail } from "@/lib/auth/allowlist";
import { inviteErrorMessage } from "@/lib/auth/invite-messages";
import { verifyInviteEmail } from "@/lib/auth/invite";
import { getTranslator } from "@/lib/i18n/server";
import { applyStoredLocale } from "@/lib/i18n/session";
import { logEvent, logFunnel } from "@/lib/observability/log";

const PASSWORD_MIN_LENGTH = 8;

/** Built per request so validation messages land in the caller's language. */
function credentialsSchema(t: Translator) {
  return z.object({
    email: z.string().email(),
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        t("auth.error.passwordMin", { min: PASSWORD_MIN_LENGTH }),
      ),
    fullName: z.string().trim().min(1).max(120).optional(),
  });
}

export type AuthActionState = {
  error?: string;
  success?: string;
};

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslator();
  const parsed = credentialsSchema(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName") || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  if (formData.get("acceptTerms") !== "on") {
    return { error: t("auth.terms.required") };
  }

  const invite = await verifyInviteEmail(parsed.data.email);
  if (!invite.ok) {
    return { error: inviteErrorMessage(invite.code, t) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // If email confirmation is disabled, session exists and we can provision now.
    if (data.session) {
      const result = await provisionNewUser({
        id: data.user.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName ?? null,
      });
      logEvent("auth.signup", {
        userId: data.user.id,
        tenantId: result.tenantId,
        created: result.created,
      });
      if (result.created) {
        logFunnel("funnel.signup", {
          tenantId: result.tenantId,
          userId: data.user.id,
          via: "password",
        });
      }
      redirect("/onboarding");
    }
  }

  return { success: t("auth.signup.success") };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslator();
  const parsed = credentialsSchema(t)
    .pick({ email: true, password: true })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? t("auth.error.invalidForm"),
    };
  }

  const invite = checkInviteEmail(parsed.data.email);
  if (!invite.ok) {
    return { error: inviteErrorMessage(invite.code, t) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user?.email) {
    await provisionNewUser({
      id: data.user.id,
      email: data.user.email,
      fullName:
        (data.user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl:
        (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
    });
    await applyStoredLocale(data.user.id);
  }

  redirect("/onboarding");
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }
  redirect(data.url);
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const t = await getTranslator();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { error: t("auth.error.invalidEmail") };
  }

  const invite = checkInviteEmail(parsed.data);
  if (!invite.ok) {
    return { error: inviteErrorMessage(invite.code, t) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    return { error: error.message };
  }

  // Always succeed with the same message to avoid email enumeration.
  return { success: t("auth.forgot.success") };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslator();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: t("auth.error.passwordMin", { min: PASSWORD_MIN_LENGTH }),
    };
  }
  if (password !== confirm) {
    return { error: t("auth.error.passwordMismatch") };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("auth.error.noSession") };
  }

  if (user.email) {
    const invite = checkInviteEmail(user.email);
    if (!invite.ok) {
      return { error: inviteErrorMessage(invite.code, t) };
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
