import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { provisionNewUser } from "@/lib/auth/provision";
import { checkInviteEmail } from "@/lib/auth/allowlist";
import { applyStoredLocale } from "@/lib/i18n/session";
import { logEvent, logFunnel } from "@/lib/observability/log";

/**
 * OAuth / magic-link callback. Exchanges the auth code for a session, then
 * idempotently provisions the app user + tenant.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      const invite = checkInviteEmail(data.user.email);
      if (!invite.ok) {
        await supabase.auth.signOut();
        logEvent(
          "auth.signup",
          { blocked: true, reason: "allowlist", email: data.user.email },
          "warn",
        );
        return NextResponse.redirect(`${origin}/login?error=invite`);
      }

      const result = await provisionNewUser({
        id: data.user.id,
        email: data.user.email,
        fullName:
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          null,
        avatarUrl:
          (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
      });
      if (result.created) {
        logEvent("auth.signup", {
          userId: data.user.id,
          tenantId: result.tenantId,
          created: true,
          via: "oauth",
        });
        logFunnel("funnel.signup", {
          tenantId: result.tenantId,
          userId: data.user.id,
          via: "oauth",
        });
      }
      await applyStoredLocale(data.user.id);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
