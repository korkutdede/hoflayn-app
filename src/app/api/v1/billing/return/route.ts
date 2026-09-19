import { NextResponse } from "next/server";

export function GET(request: Request) {
  const result = new URL(request.url).searchParams.get("result") ?? "portal";
  const allowed =
    result === "success" || result === "canceled" ? result : "portal";
  return NextResponse.redirect(`hoflayn://account?billing=${allowed}`);
}
