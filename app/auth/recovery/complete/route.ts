import { PASSWORD_RESET_ROUTE, RECOVERY_COOKIE_NAME } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: RECOVERY_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    path: PASSWORD_RESET_ROUTE,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
  });
  return response;
}
