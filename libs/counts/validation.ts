import { assertPlainObject, parseDateField, parsePagination } from "../validation";
import type { CreateCountInput, ListCountsQuery, UpdateCountInput } from "./types";

export function parseCreateCountInput(body: unknown): CreateCountInput {
  const input = assertPlainObject(body);
  if (input.logged_on === undefined) return {};
  return { logged_on: parseDateField(input.logged_on, "logged_on") };
}

export function parseUpdateCountInput(body: unknown): UpdateCountInput {
  const input = assertPlainObject(body);
  if (!("logged_on" in input)) return {};
  if (input.logged_on === null) return { logged_on: null };
  return { logged_on: parseDateField(input.logged_on, "logged_on") };
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
