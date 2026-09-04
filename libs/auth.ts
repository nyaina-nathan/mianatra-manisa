import type { NextRequest } from "next/server";
import { ApiError } from "./api-error";
import { verifyToken } from "./jwt";

export async function requireUserId(req: NextRequest): Promise<string> {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    throw ApiError.unauthorized();
  }
  return verifyToken(session);
}
