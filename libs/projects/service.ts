import { prisma } from "../prisma";
import { ApiError } from "../api-error";
import {
  parseCreateProjectInput,
  parseListProjectsQuery,
  parseUpdateProjectInput,
} from "./validation";
import { assertUuid, toUtcDate } from "../validation";
import type {
  Project,
  ProjectList,
  ProjectRow,
  ProjectRowWithCount,
  ProjectWithCount,
} from "./types";

function serializeProject(row: ProjectRow): Project {
  return {
    id: row.id,
    id_user: row.id_user,
    title: row.title,
    description: row.description,
    started_on: row.started_on ? row.started_on.toISOString().slice(0, 10) : null,
  };
}

function serializeProjectWithCount(row: ProjectRowWithCount): ProjectWithCount {
  return { ...serializeProject(row), total_count: row._count.counts };
}

async function requireOwnedProject(projectId: string, userId: string) {
  const project = await prisma.projects.findFirst({
    where: { id: projectId, id_user: userId },
    include: { _count: { select: { counts: true } } },
  });
  if (!project) {
    throw ApiError.notFound("Project not found");
  }
  return project;
}

export const projectsService = {
  async list(userId: string, searchParams: URLSearchParams): Promise<ProjectList> {
    const query = parseListProjectsQuery(searchParams);

    const where = {
      id_user: userId,
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.projects.findMany({
        where,
        orderBy: { title: "asc" },
        take: query.limit,
        skip: query.offset,
        include: { _count: { select: { counts: true } } },
      }),
      prisma.projects.count({ where }),
    ]);

    return { items: rows.map(serializeProjectWithCount), total };
  },

  async create(userId: string, body: unknown): Promise<Project> {
    const input = parseCreateProjectInput(body);

    const project = await prisma.projects.create({
      data: {
        id_user: userId,
        title: input.title,
        description: input.description ?? null,
        started_on: input.started_on ? toUtcDate(input.started_on) : undefined,
      },
    });

    return serializeProject(project);
  },

  async get(userId: string, projectId: string): Promise<ProjectWithCount> {
    assertUuid(projectId, "Project");
    const project = await requireOwnedProject(projectId, userId);
    return serializeProjectWithCount(project);
  },

  async update(
    userId: string,
    projectId: string,
    body: unknown
  ): Promise<Project> {
    assertUuid(projectId, "Project");
    const input = parseUpdateProjectInput(body);
    const existing = await requireOwnedProject(projectId, userId);

    const hasChanges =
      input.title !== undefined ||
      input.description !== undefined ||
      input.started_on !== undefined;

    if (!hasChanges) {
      return serializeProject(existing);
    }

    const project = await prisma.projects.update({
      where: { id: projectId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.started_on !== undefined && {
          started_on:
            input.started_on === null ? null : toUtcDate(input.started_on),
        }),
      },
    });

    return serializeProject(project);
  },

  async remove(userId: string, projectId: string): Promise<void> {
    assertUuid(projectId, "Project");
    await requireOwnedProject(projectId, userId);
    await prisma.projects.delete({ where: { id: projectId } });
  },
};
