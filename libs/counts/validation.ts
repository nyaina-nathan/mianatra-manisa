import { ApiError } from "../api-error";
import type { CreateCountInput, ListCountsQuery, UpdateCountInput } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isDateOnly(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  return toUtcDate(value).toISOString().slice(0, 10) === value;
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw ApiError.notFound(`${label} not found`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDateField(value: unknown, field: string): string {
  if (typeof value !== "string" || !isDateOnly(value)) {
    throw ApiError.badRequest(`${field} must be a date string (YYYY-MM-DD)`);
  }
  return value;
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON");
  }
}

export function parseCreateCountInput(body: unknown): CreateCountInput {
  if (!isPlainObject(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  if (body.logged_on === undefined) return {};
  return { logged_on: parseDateField(body.logged_on, "logged_on") };
}

export function parseUpdateCountInput(body: unknown): UpdateCountInput {
  if (!isPlainObject(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  if (!("logged_on" in body)) return {};
  if (body.logged_on === null) return { logged_on: null };
  return { logged_on: parseDateField(body.logged_on, "logged_on") };
}

export function parseListCountsQuery(searchParams: URLSearchParams): ListCountsQuery {
  const query: ListCountsQuery = { limit: 20, offset: 0 };

  const before = searchParams.get("before");
  if (before !== null) query.before = parseDateField(before, "before");

  const after = searchParams.get("after");
  if (after !== null) query.after = parseDateField(after, "after");

  const limit = searchParams.get("limit");
  if (limit !== null) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw ApiError.badRequest("limit must be an integer between 1 and 100");
    }
    query.limit = parsed;
  }

  const offset = searchParams.get("offset");
  if (offset !== null) {
    const parsed = Number(offset);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw ApiError.badRequest("offset must be an integer greater than or equal to 0");
    }
    query.offset = parsed;
  }

  return query;
}

export { assertUuid };
