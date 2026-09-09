import { ApiError } from "../api-error";
import { assertPlainObject, parseDateField, parsePagination } from "../validation";
import type { CreateCountInput, ListCountsQuery, UpdateCountInput } from "./types";

function parseDescription(value: unknown): string {
  if (typeof value !== "string") {
    throw ApiError.badRequest("description must be a string");
  }
  return value;
}

export function parseCreateCountInput(body: unknown): CreateCountInput {
  const input = assertPlainObject(body);
  const parsed: CreateCountInput = {};

  if (input.logged_on !== undefined) {
    parsed.logged_on = parseDateField(input.logged_on, "logged_on");
  }

  if (input.description !== undefined) {
    parsed.description = parseDescription(input.description);
  }

  return parsed;
}

export function parseUpdateCountInput(body: unknown): UpdateCountInput {
  const input = assertPlainObject(body);
  const parsed: UpdateCountInput = {};

  if ("logged_on" in input) {
    parsed.logged_on =
      input.logged_on === null ? null : parseDateField(input.logged_on, "logged_on");
  }

  if ("description" in input) {
    parsed.description =
      input.description === null ? null : parseDescription(input.description);
  }

  return parsed;
}

export function parseListCountsQuery(searchParams: URLSearchParams): ListCountsQuery {
  const { limit, offset } = parsePagination(searchParams);
  const query: ListCountsQuery = { limit, offset };

  const before = searchParams.get("before");
  if (before !== null) query.before = parseDateField(before, "before");

  const after = searchParams.get("after");
  if (after !== null) query.after = parseDateField(after, "after");

  return query;
}
