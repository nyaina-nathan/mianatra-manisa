import { ApiError } from "../api-error";
import {
  assertPlainObject,
  parseDateField,
  parsePagination,
} from "../validation";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "./types";

const TITLE_MAX = 255;

function parseTitle(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > TITLE_MAX) {
    throw ApiError.badRequest(
      `title must be a string between 1 and ${TITLE_MAX} characters`
    );
  }
  return value;
}

function parseDescription(value: unknown): string {
  if (typeof value !== "string") {
    throw ApiError.badRequest("description must be a string");
  }
  return value;
}

export function parseCreateProjectInput(body: unknown): CreateProjectInput {
  const input = assertPlainObject(body);
  if (input.title === undefined) {
    throw ApiError.badRequest("title is required");
  }

  const parsed: CreateProjectInput = { title: parseTitle(input.title) };

  if (input.description !== undefined) {
    parsed.description = parseDescription(input.description);
  }

  if (input.started_on !== undefined) {
    parsed.started_on = parseDateField(input.started_on, "started_on");
  }

  return parsed;
}

export function parseUpdateProjectInput(body: unknown): UpdateProjectInput {
  const input = assertPlainObject(body);
  const parsed: UpdateProjectInput = {};

  if ("title" in input) {
    if (input.title === undefined) {
      throw ApiError.badRequest("title must not be null");
    }
    parsed.title = parseTitle(input.title);
  }

  if ("description" in input) {
    parsed.description =
      input.description === null
        ? null
        : parseDescription(input.description);
  }

  if ("started_on" in input) {
    parsed.started_on =
      input.started_on === null
        ? null
        : parseDateField(input.started_on, "started_on");
  }

  return parsed;
}

export function parseListProjectsQuery(searchParams: URLSearchParams): ListProjectsQuery {
  const { limit, offset } = parsePagination(searchParams);
  const query: ListProjectsQuery = { limit, offset };

  const search = searchParams.get("search");
  if (search !== null && search.length > 0) {
    query.search = search;
  }

  return query;
}
