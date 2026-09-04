import { SignJWT, jwtVerify } from "jose";
import { ApiError } from "./api-error";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}
const secret = new TextEncoder().encode(jwtSecret);

const SESSION_DURATION = "7d";

export async function createToken(userId: string): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) {
      throw new Error("missing sub");
    }
    return payload.sub;
  } catch {
    throw ApiError.unauthorized();
  }
}
