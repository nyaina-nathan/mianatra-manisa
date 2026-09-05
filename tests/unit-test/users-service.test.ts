import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../../libs/prisma";
import { usersService } from "../../libs/users/service";

vi.mock("../../libs/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

type PrismaMock = {
  users: {
    findUnique: Mock;
    create: Mock;
  };
};

const db = prisma as unknown as PrismaMock;
const hash = bcrypt.hash as unknown as Mock;
const compare = bcrypt.compare as unknown as Mock;

const USER_ID = "33333333-3333-4333-8333-333333333333";

const userRow = {
  id: USER_ID,
  email: "user@example.com",
  password_hash: "hashed-password",
  username: "user",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

const serializedUser = {
  id: USER_ID,
  email: "user@example.com",
  username: "user",
  created_at: "2026-01-01T00:00:00.000Z",
};

const errorWith = (status: number, message: string) => ({
  name: "ApiError",
  status,
  message,
});

const registerBody = {
  email: "user@example.com",
  password: "password123",
  username: "user",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("usersService.register", () => {
  it("hashes the password, creates the user and returns a serialized user", async () => {
    db.users.findUnique.mockResolvedValue(null);
    hash.mockResolvedValue("$2a$10$hashed");
    db.users.create.mockResolvedValue(userRow);

    const result = await usersService.register({
      email: "User@Example.com",
      password: "password123",
      username: "user",
    });

    expect(hash).toHaveBeenCalledWith("password123", 10);
    expect(db.users.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(db.users.create).toHaveBeenCalledWith({
      data: {
        email: "user@example.com",
        password_hash: "$2a$10$hashed",
        username: "user",
      },
    });
    expect(result).toEqual(serializedUser);
  });

  it("throws 409 with conflict metadata when the email is taken", async () => {
    db.users.findUnique.mockResolvedValue(userRow);

    await expect(usersService.register(registerBody)).rejects.toMatchObject({
      ...errorWith(409, "Email already in use"),
      title: "Conflict",
      origin: "database",
    });
    expect(hash).not.toHaveBeenCalled();
    expect(db.users.create).not.toHaveBeenCalled();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["an array body", [], "Request body must be a JSON object"],
    ["a missing email", { ...registerBody, email: undefined }, "email is required"],
    ["a missing password", { ...registerBody, password: undefined }, "password is required"],
    ["a missing username", { ...registerBody, username: undefined }, "username is required"],
    ["an invalid email", { ...registerBody, email: "not-an-email" }, "email must be a valid email address"],
    ["a too short password", { ...registerBody, password: "short" }, "password must be a string between 8 and 72 characters"],
    ["a too long password", { ...registerBody, password: "p".repeat(73) }, "password must be a string between 8 and 72 characters"],
    ["an empty username", { ...registerBody, username: "" }, "username must be a string between 1 and 20 characters"],
    ["a too long username", { ...registerBody, username: "u".repeat(21) }, "username must be a string between 1 and 20 characters"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(usersService.register(body)).rejects.toMatchObject(
      errorWith(400, message)
    );
    expect(db.users.findUnique).not.toHaveBeenCalled();
    expect(db.users.create).not.toHaveBeenCalled();
  });
});

describe("usersService.login", () => {
  it("returns a serialized user when the credentials match", async () => {
    db.users.findUnique.mockResolvedValue(userRow);
    compare.mockResolvedValue(true);

    const result = await usersService.login({
      email: "User@Example.com",
      password: "password123",
    });

    expect(db.users.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(compare).toHaveBeenCalledWith("password123", "hashed-password");
    expect(result).toEqual(serializedUser);
  });

  it("throws 401 when the email is not found", async () => {
    db.users.findUnique.mockResolvedValue(null);

    await expect(
      usersService.login({ email: "user@example.com", password: "password123" })
    ).rejects.toMatchObject(errorWith(401, "Email not found"));
    expect(compare).not.toHaveBeenCalled();
  });

  it("throws 401 when the password does not match", async () => {
    db.users.findUnique.mockResolvedValue(userRow);
    compare.mockResolvedValue(false);

    await expect(
      usersService.login({ email: "user@example.com", password: "wrong-password" })
    ).rejects.toMatchObject(errorWith(401, "Incorrect password"));
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a missing email", { password: "password123" }, "email is required"],
    ["a missing password", { email: "user@example.com" }, "password is required"],
    ["an invalid email", { email: "nope", password: "password123" }, "email must be a valid email address"],
    ["a non string password", { email: "user@example.com", password: 12345678 }, "password must be a string"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(usersService.login(body)).rejects.toMatchObject(
      errorWith(400, message)
    );
    expect(db.users.findUnique).not.toHaveBeenCalled();
  });
});

describe("usersService.getCurrent", () => {
  it("returns a serialized user", async () => {
    db.users.findUnique.mockResolvedValue(userRow);

    const result = await usersService.getCurrent(USER_ID);

    expect(db.users.findUnique).toHaveBeenCalledWith({ where: { id: USER_ID } });
    expect(result).toEqual(serializedUser);
  });

  it("throws the default 401 when the user does not exist", async () => {
    db.users.findUnique.mockResolvedValue(null);

    await expect(usersService.getCurrent(USER_ID)).rejects.toMatchObject({
      ...errorWith(401, "Missing, invalid, or expired session"),
      title: "Unauthorized",
      origin: "auth",
    });
  });
});
