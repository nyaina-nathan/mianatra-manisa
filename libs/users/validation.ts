import { ApiError } from "../api-error";
import { assertPlainObject } from "../validation";
import type { LoginInput, RegisterInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const USERNAME_MAX = 20;

function parseEmail(value: unknown): string {
  if (typeof value !== "string" || !EMAIL_PATTERN.test(value)) {
    throw ApiError.badRequest("email must be a valid email address");
  }
  return value.toLowerCase();
}

export function parseRegisterInput(body: unknown): RegisterInput {
  const input = assertPlainObject(body);
  if (input.email === undefined) {
    throw ApiError.badRequest("email is required");
  }
  if (input.password === undefined) {
    throw ApiError.badRequest("password is required");
  }
  if (input.username === undefined) {
    throw ApiError.badRequest("username is required");
  }

  if (
    typeof input.password !== "string" ||
    input.password.length < PASSWORD_MIN ||
    input.password.length > PASSWORD_MAX
  ) {
    throw ApiError.badRequest(
      `password must be a string between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`
    );
  }

  if (
    typeof input.username !== "string" ||
    input.username.length < 1 ||
    input.username.length > USERNAME_MAX
  ) {
    throw ApiError.badRequest(
      `username must be a string between 1 and ${USERNAME_MAX} characters`
    );
  }

  return {
    email: parseEmail(input.email),
    password: input.password,
    username: input.username,
  };
}

export function parseLoginInput(body: unknown): LoginInput {
  const input = assertPlainObject(body);
  if (input.email === undefined) {
    throw ApiError.badRequest("email is required");
  }
  if (input.password === undefined) {
    throw ApiError.badRequest("password is required");
  }
  if (typeof input.password !== "string") {
    throw ApiError.badRequest("password must be a string");
  }
  return {
    email: parseEmail(input.email),
    password: input.password,
  };
}
