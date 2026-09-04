import { prisma } from "../prisma";
import { ApiError } from "../api-error";
import {
  assertUuid,
  parseCreateCountInput,
  parseListCountsQuery,
  parseUpdateCountInput,
  toUtcDate,
} from "./validation";
import type { Count, CountList, CountRow } from "./types";

function serializeCount(row: CountRow): Count {
  return {
    id: row.id,
    id_project: row.id_project,
    logged_on: row.logged_on ? row.logged_on.toISOString().slice(0, 10) : null,
  };
}

async function requireOwnedProject(projectId: string, userId: string) {
  const project = await prisma.projects.findFirst({
    where: { id: projectId, id_user: userId },
    select: { id: true },
  });
  if (!project) {
    throw ApiError.notFound("Project not found");
  }
}

async function requireProjectCount(projectId: string, countId: string) {
  const count = await prisma.counts.findFirst({
    where: { id: countId, id_project: projectId },
  });
  if (!count) {
    throw ApiError.notFound("Count not found");
  }
  return count;
}

export const countsService = {
  async list(
    projectId: string,
    userId: string,
    searchParams: URLSearchParams
  ): Promise<CountList> {
    assertUuid(projectId, "Project");
    const query = parseListCountsQuery(searchParams);
    await requireOwnedProject(projectId, userId);

    const where = {
      id_project: projectId,
      logged_on: {
        lt: query.before ? toUtcDate(query.before) : undefined,
        gt: query.after ? toUtcDate(query.after) : undefined,
      },
    };

    const [rows, total] = await prisma.$transaction([
      prisma.counts.findMany({
        where,
        orderBy: { logged_on: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.counts.count({ where }),
    ]);

    return { items: rows.map(serializeCount), total };
  },

  async create(projectId: string, userId: string, body: unknown): Promise<Count> {
    assertUuid(projectId, "Project");
    const input = parseCreateCountInput(body);
    await requireOwnedProject(projectId, userId);

    const count = await prisma.counts.create({
      data: {
        id_project: projectId,
        logged_on: input.logged_on ? toUtcDate(input.logged_on) : undefined,
      },
    });

    return serializeCount(count);
  },

  async get(projectId: string, userId: string, countId: string): Promise<Count> {
    assertUuid(projectId, "Project");
    assertUuid(countId, "Count");
    await requireOwnedProject(projectId, userId);
    const count = await requireProjectCount(projectId, countId);
    return serializeCount(count);
  },

  async update(
    projectId: string,
    userId: string,
    countId: string,
    body: unknown
  ): Promise<Count> {
    assertUuid(projectId, "Project");
    assertUuid(countId, "Count");
    const input = parseUpdateCountInput(body);
    await requireOwnedProject(projectId, userId);
    const existing = await requireProjectCount(projectId, countId);

    if (input.logged_on === undefined) {
      return serializeCount(existing);
    }

    const count = await prisma.counts.update({
      where: { id: countId },
      data: {
        logged_on: input.logged_on === null ? null : toUtcDate(input.logged_on),
      },
    });

    return serializeCount(count);
  },

  async remove(projectId: string, userId: string, countId: string): Promise<void> {
    assertUuid(projectId, "Project");
    assertUuid(countId, "Count");
    await requireOwnedProject(projectId, userId);
    await requireProjectCount(projectId, countId);
    await prisma.counts.delete({ where: { id: countId } });
  },
};
