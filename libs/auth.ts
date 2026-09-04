import type { NextRequest } from "next/server";
import { ApiError } from "./api-error";

export function requireUserId(req: NextRequest): string {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    throw ApiError.unauthorized();
  }
  return session;
}
