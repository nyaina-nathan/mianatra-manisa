import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./libs/jwt";
import { SESSION_COOKIE } from "./libs/auth";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let isAuthed = false;
  if (token) {
    try {
      await verifyToken(token);
      isAuthed = true;
    } catch {
      // invalid or expired token: treat the user as unauthenticated
    }
  }

  if (isAuthed && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAuthed && !isAuthRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets, so pages (including /login)
    // can still load their CSS/JS and images when unauthenticated.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|xml)$).*)",
  ],
};
