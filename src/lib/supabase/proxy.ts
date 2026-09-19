import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware): refresh Supabase session cookies and
 * gate the (dashboard) area. Runtime is Node.js (proxy), not Edge.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env (local scaffold before Supabase), skip auth gate so the app
  // still boots; protected pages will fail closed via requireTenant later.
  if (!url || !anon) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth");
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/studio") ||
    path.startsWith("/billing") ||
    path.startsWith("/products") ||
    path.startsWith("/settings");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Recovery sessions from password-reset emails must reach /reset-password.
  if (
    user &&
    (path === "/login" || path === "/signup" || path === "/forgot-password")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/onboarding";
    return NextResponse.redirect(redirectUrl);
  }

  void isAuthPage;

  return supabaseResponse;
}
