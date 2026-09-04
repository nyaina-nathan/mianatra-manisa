import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { ApiError } from "../api-error";
import { parseLoginInput, parseRegisterInput } from "./validation";
import type { User, UserRow } from "./types";

const BCRYPT_COST = 10;

function serializeUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    created_at: (row.created_at ?? new Date()).toISOString(),
  };
}

async function requireEmailAvailable(email: string): Promise<void> {
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("Email already in use");
  }
}

export const usersService = {
  async register(body: unknown): Promise<User> {
    const input = parseRegisterInput(body);
    await requireEmailAvailable(input.email);

    const user = await prisma.users.create({
      data: {
        email: input.email,
        password_hash: await bcrypt.hash(input.password, BCRYPT_COST),
        username: input.username,
      },
    });

    return serializeUser(user);
  },

  async login(body: unknown): Promise<User> {
    const input = parseLoginInput(body);

    const user = await prisma.users.findUnique({ where: { email: input.email } });
    if (!user) {
      throw ApiError.unauthorized("Email not found");
    }
    if (!(await bcrypt.compare(input.password, user.password_hash))) {
      throw ApiError.unauthorized("Incorrect password");
    }

    return serializeUser(user);
  },

  async getCurrent(userId: string): Promise<User> {
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.unauthorized();
    }
    return serializeUser(user);
  },
};
