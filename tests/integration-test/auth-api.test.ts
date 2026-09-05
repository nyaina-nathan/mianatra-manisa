import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { POST as registerPost } from "../../app/api/auth/register/route";
import { POST as loginPost } from "../../app/api/auth/login/route";
import { POST as logoutPost } from "../../app/api/auth/logout/route";
import { GET as meGet } from "../../app/api/auth/me/route";
import { createToken } from "../../libs/jwt";
import { prisma } from "../../libs/prisma";
import {
  REGISTER_BODY,
  badRequest,
  callRoute,
  conflict,
  cookieOf,
  registerUser,
  resetDatabase,
  sessionTokenOf,
  unauthorized,
} from "./setup/api";

beforeEach(async () => {
  await resetDatabase();
});

describe("POST /api/auth/register", () => {
  it("creates the user and returns 201 with the serialized user and a session cookie", async () => {
    const res = await callRoute(registerPost, {
      method: "POST",
      path: "/api/auth/register",
      body: { email: "User@Example.com", password: "password123", username: "user" },
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: "user@example.com",
      username: "user",
      created_at: expect.any(String),
    });
    expect(res.setCookie).toContain("session=");
  });

  it("persists the user with a hashed password", async () => {
    await registerUser({ email: "User@Example.com" });

    const row = await prisma.users.findUnique({
      where: { email: "user@example.com" },
    });
    expect(row?.username).toBe("user");
    expect(await bcrypt.compare("password123", row?.password_hash ?? "")).toBe(true);
  });

  it("returns 409 when the email is already taken", async () => {
    await registerUser();

    const res = await callRoute(registerPost, {
      method: "POST",
      path: "/api/auth/register",
      body: REGISTER_BODY,
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual(conflict("Email already in use"));
  });

  it("does not create a second user when the email is taken", async () => {
    await registerUser();

    await callRoute(registerPost, {
      method: "POST",
      path: "/api/auth/register",
      body: { ...REGISTER_BODY, username: "other" },
    });

    await expect(prisma.users.count()).resolves.toBe(1);
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["an array body", [], "Request body must be a JSON object"],
    ["a missing email", { ...REGISTER_BODY, email: undefined }, "email is required"],
    ["a missing password", { ...REGISTER_BODY, password: undefined }, "password is required"],
    ["a missing username", { ...REGISTER_BODY, username: undefined }, "username is required"],
    ["an invalid email", { ...REGISTER_BODY, email: "not-an-email" }, "email must be a valid email address"],
    ["a too short password", { ...REGISTER_BODY, password: "short" }, "password must be a string between 8 and 72 characters"],
    ["a too long password", { ...REGISTER_BODY, password: "p".repeat(73) }, "password must be a string between 8 and 72 characters"],
    ["an empty username", { ...REGISTER_BODY, username: "" }, "username must be a string between 1 and 20 characters"],
    ["a too long username", { ...REGISTER_BODY, username: "u".repeat(21) }, "username must be a string between 1 and 20 characters"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const res = await callRoute(registerPost, {
      method: "POST",
      path: "/api/auth/register",
      body,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
    await expect(prisma.users.count()).resolves.toBe(0);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const res = await callRoute(registerPost, {
      method: "POST",
      path: "/api/auth/register",
      raw: "not-json",
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest("Request body must be valid JSON"));
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with the serialized user and a session cookie", async () => {
    const { user } = await registerUser();

    const res = await callRoute(loginPost, {
      method: "POST",
      path: "/api/auth/login",
      body: { email: "User@Example.com", password: "password123" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
    expect(res.setCookie).toContain("session=");
  });

  it("sets a session cookie that authenticates GET /api/auth/me", async () => {
    await registerUser();

    const res = await callRoute(loginPost, {
      method: "POST",
      path: "/api/auth/login",
      body: REGISTER_BODY,
    });

    const me = await callRoute(meGet, {
      path: "/api/auth/me",
      cookie: cookieOf(sessionTokenOf(res)),
    });
    expect(me.status).toBe(200);
  });

  it("returns 401 when the email is not found", async () => {
    const res = await callRoute(loginPost, {
      method: "POST",
      path: "/api/auth/login",
      body: REGISTER_BODY,
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Email not found"));
  });

  it("returns 401 when the password does not match", async () => {
    await registerUser();

    const res = await callRoute(loginPost, {
      method: "POST",
      path: "/api/auth/login",
      body: { ...REGISTER_BODY, password: "wrong-password" },
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Incorrect password"));
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a missing email", { password: "password123" }, "email is required"],
    ["a missing password", { email: "user@example.com" }, "password is required"],
    ["an invalid email", { email: "nope", password: "password123" }, "email must be a valid email address"],
    ["a non string password", { email: "user@example.com", password: 12345678 }, "password must be a string"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const res = await callRoute(loginPost, {
      method: "POST",
      path: "/api/auth/login",
      body,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 204 and clears the session cookie", async () => {
    const res = await callRoute(logoutPost, {
      method: "POST",
      path: "/api/auth/logout",
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(res.setCookie).toBe("session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });

  it("returns 204 without a session cookie", async () => {
    const res = await callRoute(logoutPost, {
      method: "POST",
      path: "/api/auth/logout",
    });

    expect(res.status).toBe(204);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 200 with the serialized user for a valid session", async () => {
    const { user, cookie } = await registerUser();

    const res = await callRoute(meGet, { path: "/api/auth/me", cookie });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("returns the default 401 without a session cookie", async () => {
    const res = await callRoute(meGet, { path: "/api/auth/me" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });

  it("returns the default 401 for a garbage session token", async () => {
    const res = await callRoute(meGet, {
      path: "/api/auth/me",
      cookie: cookieOf("not-a-token"),
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });

  it("returns the default 401 when the session user does not exist", async () => {
    const token = await createToken("33333333-3333-4333-8333-333333333333");

    const res = await callRoute(meGet, {
      path: "/api/auth/me",
      cookie: cookieOf(token),
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });

  it("returns the default 401 for the cleared cookie after logout", async () => {
    const res = await callRoute(meGet, {
      path: "/api/auth/me",
      cookie: cookieOf(""),
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });
});
