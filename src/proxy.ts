import { type NextRequest } from "next/server";
import { attachLocale, localeOverrideRedirect } from "@/lib/i18n/proxy";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const localeRedirect = localeOverrideRedirect(request);
  if (localeRedirect) return localeRedirect;

  const response = await updateSession(request);
  return attachLocale(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimizer.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
