import { beforeEach, describe, expect, it } from "vitest";
import { GET as listProjects } from "../../app/api/projects/route";
import { POST as createProjectRoute } from "../../app/api/projects/route";
import { GET as getProject } from "../../app/api/projects/[projectId]/route";
import { PATCH as updateProject } from "../../app/api/projects/[projectId]/route";
import { DELETE as deleteProject } from "../../app/api/projects/[projectId]/route";
import { POST as createCountRoute } from "../../app/api/projects/[projectId]/counts/route";
import type { Project, ProjectWithCount } from "../../libs/projects/types";
import type { Count } from "../../libs/counts/types";
import { prisma } from "../../libs/prisma";
import {
  badRequest,
  callRoute,
  notFound,
  registerUser,
  resetDatabase,
  unauthorized,
} from "./setup/api";

const UNKNOWN_PROJECT_ID = "11111111-1111-4111-8111-111111111111";

async function createProject(
  cookie: string,
  body: Record<string, unknown> = {}
): Promise<Project> {
  const res = await callRoute(createProjectRoute, {
    method: "POST",
    path: "/api/projects",
    body: { title: "Project", ...body },
    cookie,
  });
  return res.body as Project;
}

async function createCount(
  projectId: string,
  cookie: string
): Promise<Count> {
  const res = await callRoute(createCountRoute, {
    method: "POST",
    path: `/api/projects/${projectId}/counts`,
    body: {},
    cookie,
    params: { projectId },
  });
  return res.body as Count;
}

beforeEach(async () => {
  await resetDatabase();
});

describe("GET /api/projects", () => {
  it("returns only the user's projects ordered by title with their count totals and the total", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });

    const groceries = await createProject(user.cookie, { title: "Groceries" });
    const bills = await createProject(user.cookie, { title: "Bills" });
    await createCount(bills.id, user.cookie);
    await createProject(other.cookie, { title: "Other project" });

    const res = await callRoute(listProjects, {
      path: "/api/projects",
      cookie: user.cookie,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        { ...bills, total_count: 1 },
        { ...groceries, total_count: 0 },
      ],
      total: 2,
    });
  });

  it("filters by search, case-insensitively", async () => {
    const user = await registerUser();
    await createProject(user.cookie, { title: "Groceries" });
    await createProject(user.cookie, { title: "Bills" });

    const res = await callRoute(listProjects, {
      path: "/api/projects?search=Gro",
      cookie: user.cookie,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1 });
    const list = res.body as { items: ProjectWithCount[] };
    expect(list.items.map((item) => item.title)).toEqual(["Groceries"]);
  });

  it("applies pagination with limit and offset", async () => {
    const user = await registerUser();
    for (const title of ["C", "A", "B"]) {
      await createProject(user.cookie, { title });
    }

    const res = await callRoute(listProjects, {
      path: "/api/projects?limit=1&offset=1",
      cookie: user.cookie,
    });

    expect(res.status).toBe(200);
    const list = res.body as { items: ProjectWithCount[]; total: number };
    expect(list.items.map((item) => item.title)).toEqual(["B"]);
    expect(list.total).toBe(3);
  });

  it.each<[string, string]>([
    ["limit=0", "limit must be an integer between 1 and 100"],
    ["limit=101", "limit must be an integer between 1 and 100"],
    ["limit=abc", "limit must be an integer between 1 and 100"],
    ["limit=1.5", "limit must be an integer between 1 and 100"],
    ["offset=-1", "offset must be an integer greater than or equal to 0"],
    ["offset=abc", "offset must be an integer greater than or equal to 0"],
  ])("returns 400 for %s", async (query, message) => {
    const user = await registerUser();

    const res = await callRoute(listProjects, {
      path: `/api/projects?${query}`,
      cookie: user.cookie,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns the default 401 without a session cookie", async () => {
    const res = await callRoute(listProjects, { path: "/api/projects" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });

  it("returns the default 401 for an invalid session token", async () => {
    const res = await callRoute(listProjects, {
      path: "/api/projects",
      cookie: "session=not-a-token",
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });
});

describe("POST /api/projects", () => {
  it("creates a project with all provided fields and persists it", async () => {
    const user = await registerUser();

    const res = await callRoute(createProjectRoute, {
      method: "POST",
      path: "/api/projects",
      body: { title: "Groceries", description: "weekly shopping", started_on: "2026-01-01" },
      cookie: user.cookie,
    });

    expect(res.status).toBe(201);
    const project = res.body as Project;
    expect(project.title).toBe("Groceries");
    expect(project.description).toBe("weekly shopping");
    expect(project.started_on).toBe("2026-01-01");
    expect(project.id_user).toEqual(expect.any(String));

    const row = await prisma.projects.findFirst({
      where: { id: project.id },
    });
    expect(row?.id_user).toBe(project.id_user);
    expect(row?.title).toBe("Groceries");
    expect(row?.started_on?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("defaults description to null and started_on to today", async () => {
    const user = await registerUser();

    const res = await callRoute(createProjectRoute, {
      method: "POST",
      path: "/api/projects",
      body: { title: "Groceries" },
      cookie: user.cookie,
    });

    expect(res.status).toBe(201);
    const project = res.body as Project;
    expect(project.description).toBeNull();
    expect(project.started_on).toBe(new Date().toISOString().slice(0, 10));
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a missing title", {}, "title is required"],
    ["an empty title", { title: "" }, "title must be a string between 1 and 255 characters"],
    ["a too long title", { title: "t".repeat(256) }, "title must be a string between 1 and 255 characters"],
    ["a non string description", { title: "Groceries", description: 42 }, "description must be a string"],
    ["a wrongly formatted started_on", { title: "Groceries", started_on: "01/02/2026" }, "started_on must be a date string (YYYY-MM-DD)"],
    ["an impossible started_on date", { title: "Groceries", started_on: "2026-02-30" }, "started_on must be a date string (YYYY-MM-DD)"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const user = await registerUser();

    const res = await callRoute(createProjectRoute, {
      method: "POST",
      path: "/api/projects",
      body,
      cookie: user.cookie,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns the default 401 without a session cookie", async () => {
    const res = await callRoute(createProjectRoute, {
      method: "POST",
      path: "/api/projects",
      body: { title: "Groceries" },
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });
});

describe("GET /api/projects/:projectId", () => {
  it("returns the project with its count total", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });
    await createCount(project.id, user.cookie);
    await createCount(project.id, user.cookie);

    const res = await callRoute(getProject, {
      path: `/api/projects/${project.id}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...project, total_count: 2 });
  });

  it("returns 404 for an unknown project", async () => {
    const user = await registerUser();

    const res = await callRoute(getProject, {
      path: `/api/projects/${UNKNOWN_PROJECT_ID}`,
      cookie: user.cookie,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for another user's project", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie, { title: "Bills" });

    const res = await callRoute(getProject, {
      path: `/api/projects/${project.id}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for a malformed project id", async () => {
    const user = await registerUser();

    const res = await callRoute(getProject, {
      path: "/api/projects/not-a-uuid",
      cookie: user.cookie,
      params: { projectId: "not-a-uuid" },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });
});

describe("PATCH /api/projects/:projectId", () => {
  it("updates only the provided fields and persists them", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, {
      title: "Groceries",
      description: "weekly shopping",
      started_on: "2026-01-01",
    });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      body: { title: "Renamed", started_on: "2026-02-01" },
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...project, title: "Renamed", started_on: "2026-02-01" });

    const row = await prisma.projects.findFirst({ where: { id: project.id } });
    expect(row?.title).toBe("Renamed");
    expect(row?.description).toBe("weekly shopping");
    expect(row?.started_on?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("returns the existing project unchanged for an empty body", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      body: {},
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(project);
    await expect(prisma.projects.count()).resolves.toBe(1);
  });

  it("clears description and started_on when nulled", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, {
      title: "Groceries",
      description: "weekly shopping",
      started_on: "2026-01-01",
    });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      body: { description: null, started_on: null },
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...project, description: null, started_on: null });

    const row = await prisma.projects.findFirst({ where: { id: project.id } });
    expect(row?.description).toBeNull();
    expect(row?.started_on).toBeNull();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a null title", { title: null }, "title must be a string between 1 and 255 characters"],
    ["an empty title", { title: "" }, "title must be a string between 1 and 255 characters"],
    ["a non string description", { description: 42 }, "description must be a string"],
    ["a wrongly formatted started_on", { started_on: "01/02/2026" }, "started_on must be a date string (YYYY-MM-DD)"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      body,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns 400 for an invalid JSON body", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      raw: "not-json",
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest("Request body must be valid JSON"));
  });

  it("returns 404 for an unknown project", async () => {
    const user = await registerUser();

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${UNKNOWN_PROJECT_ID}`,
      body: { title: "Renamed" },
      cookie: user.cookie,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for another user's project and does not update it", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie, { title: "Bills" });

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: `/api/projects/${project.id}`,
      body: { title: "Renamed" },
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));

    const row = await prisma.projects.findFirst({ where: { id: project.id } });
    expect(row?.title).toBe("Bills");
  });

  it("returns 404 for a malformed project id", async () => {
    const user = await registerUser();

    const res = await callRoute(updateProject, {
      method: "PATCH",
      path: "/api/projects/not-a-uuid",
      body: { title: "Renamed" },
      cookie: user.cookie,
      params: { projectId: "not-a-uuid" },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });
});

describe("DELETE /api/projects/:projectId", () => {
  it("deletes the project and its counts cascade", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });
    await createCount(project.id, user.cookie);
    await createCount(project.id, user.cookie);

    const res = await callRoute(deleteProject, {
      method: "DELETE",
      path: `/api/projects/${project.id}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    await expect(prisma.projects.findFirst({ where: { id: project.id } })).resolves.toBeNull();
    await expect(
      prisma.counts.count({ where: { id_project: project.id } })
    ).resolves.toBe(0);
  });

  it("deletes only the targeted project", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie, { title: "Groceries" });
    const otherProject = await createProject(user.cookie, { title: "Bills" });

    const res = await callRoute(deleteProject, {
      method: "DELETE",
      path: `/api/projects/${project.id}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(204);

    const kept = await callRoute(getProject, {
      path: `/api/projects/${otherProject.id}`,
      cookie: user.cookie,
      params: { projectId: otherProject.id },
    });
    expect(kept.status).toBe(200);
  });

  it("returns 404 for an unknown project", async () => {
    const user = await registerUser();

    const res = await callRoute(deleteProject, {
      method: "DELETE",
      path: `/api/projects/${UNKNOWN_PROJECT_ID}`,
      cookie: user.cookie,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for another user's project and does not delete it", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie, { title: "Bills" });

    const res = await callRoute(deleteProject, {
      method: "DELETE",
      path: `/api/projects/${project.id}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
    await expect(prisma.projects.count()).resolves.toBe(1);
  });

  it("returns 404 for a malformed project id", async () => {
    const user = await registerUser();

    const res = await callRoute(deleteProject, {
      method: "DELETE",
      path: "/api/projects/not-a-uuid",
      cookie: user.cookie,
      params: { projectId: "not-a-uuid" },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });
});
