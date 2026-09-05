import { NextRequest } from "next/server";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { prisma } from "@/libs/prisma";

type RouteContext<P> = { params: Promise<P> };

export type RouteResult = {
  status: number;
  body: unknown;
  headers: Headers;
  setCookie: string | null;
};

type CallRouteOptions<P> = {
  method?: string;
  path?: string;
  body?: unknown;
  raw?: string;
  cookie?: string;
  params?: P;
};

export async function callRoute<P extends Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
  options: CallRouteOptions<P> = {}
): Promise<RouteResult> {
  const { method = "GET", path = "/", body, raw, cookie, params } = options;

  const headers: Record<string, string> = {};
  if (cookie !== undefined) {
    headers.cookie = cookie;
  }
  if (body !== undefined || raw !== undefined) {
    headers["content-type"] = "application/json";
  }

  const request = new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : raw !== undefined
        ? { body: raw }
        : {}),
  });

  const response = await handler(request, {
    params: Promise.resolve(params ?? ({} as P)),
  });

  const text = await response.text();

  return {
    status: response.status,
    body: text.length > 0 ? JSON.parse(text) : null,
    headers: response.headers,
    setCookie: response.headers.get("set-cookie"),
  };
}

export function sessionTokenOf(res: RouteResult): string {
  const setCookie = res.setCookie ?? "";
  return setCookie.slice("session=".length, setCookie.indexOf(";"));
}

export function cookieOf(token: string): string {
  return `session=${token}`;
}

export const badRequest = (message: string) => ({
  title: "Bad Request",
  status: 400,
  message,
  origin: "validation",
});

export const unauthorized = (message: string) => ({
  title: "Unauthorized",
  status: 401,
  message,
  origin: "auth",
});

export const notFound = (message: string) => ({
  title: "Not Found",
  status: 404,
  message,
  origin: "database",
});

export const conflict = (message: string) => ({
  title: "Conflict",
  status: 409,
  message,
  origin: "database",
});

export const REGISTER_BODY = {
  email: "user@example.com",
  password: "password123",
  username: "user",
};

export type SeededUser = {
  user: unknown;
  cookie: string;
};

export async function registerUser(
  body: Partial<typeof REGISTER_BODY> = {}
): Promise<SeededUser> {
  const res = await callRoute(registerRoute, {
    method: "POST",
    path: "/api/auth/register",
    body: { ...REGISTER_BODY, ...body },
  });
  return { user: res.body, cookie: cookieOf(sessionTokenOf(res)) };
}

export async function resetDatabase(): Promise<void> {
  await prisma.users.deleteMany();
}
