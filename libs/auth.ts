import type { NextRequest } from "next/server";
import { ApiError } from "./api-error";
import { verifyToken, SESSION_DURATION_SECONDS } from "./jwt";

const SESSION_COOKIE = "session";

export async function requireUserId(req: NextRequest): Promise<string> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    throw ApiError.unauthorized();
  }
  return verifyToken(session);
}

function buildSessionCookie(value: string, maxAge: number): string {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function createSessionCookie(token: string): string {
  return buildSessionCookie(token, SESSION_DURATION_SECONDS);
}

export function clearSessionCookie(): string {
  return buildSessionCookie("", 0);
}
