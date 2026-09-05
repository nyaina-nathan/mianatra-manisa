import { beforeEach, describe, expect, it } from "vitest";
import { POST as createProjectRoute } from "../../app/api/projects/route";
import { GET as listCounts } from "../../app/api/projects/[projectId]/counts/route";
import { POST as createCountRoute } from "../../app/api/projects/[projectId]/counts/route";
import { GET as getCount } from "../../app/api/projects/[projectId]/counts/[countId]/route";
import { PATCH as updateCount } from "../../app/api/projects/[projectId]/counts/[countId]/route";
import { DELETE as deleteCount } from "../../app/api/projects/[projectId]/counts/[countId]/route";
import type { Count } from "../../libs/counts/types";
import type { Project } from "../../libs/projects/types";
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
const UNKNOWN_COUNT_ID = "22222222-2222-4222-8222-222222222222";

async function createProject(cookie: string): Promise<Project> {
  const res = await callRoute(createProjectRoute, {
    method: "POST",
    path: "/api/projects",
    body: { title: "Project" },
    cookie,
  });
  return res.body as Project;
}

async function createCount(
  projectId: string,
  cookie: string,
  body: Record<string, unknown> = {}
): Promise<Count> {
  const res = await callRoute(createCountRoute, {
    method: "POST",
    path: `/api/projects/${projectId}/counts`,
    body,
    cookie,
    params: { projectId },
  });
  return res.body as Count;
}

beforeEach(async () => {
  await resetDatabase();
});

describe("GET /api/projects/:projectId/counts", () => {
  it("returns the project's counts ordered by logged_on descending with the total", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    await createCount(project.id, user.cookie, { logged_on: "2026-01-01" });
    await createCount(project.id, user.cookie, { logged_on: "2026-01-03" });

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    const list = res.body as { items: Count[]; total: number };
    expect(list.items.map((item) => item.logged_on)).toEqual([
      "2026-01-03",
      "2026-01-01",
    ]);
    expect(list.total).toBe(2);
  });

  it("serializes a null logged_on as null", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie, {
      logged_on: "2026-01-02",
    });
    await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body: { logged_on: null },
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    const list = res.body as { items: Count[] };
    expect(list.items.map((item) => item.logged_on)).toEqual([null]);
  });

  it("applies before/after filters as exclusive UTC date boundaries", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    for (const logged_on of ["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-10"]) {
      await createCount(project.id, user.cookie, { logged_on });
    }

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts?before=2026-01-05&after=2026-01-01`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    const list = res.body as { items: Count[]; total: number };
    expect(list.items.map((item) => item.logged_on)).toEqual(["2026-01-02"]);
    expect(list.total).toBe(1);
  });

  it("applies pagination with limit and offset", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    for (const logged_on of ["2026-01-01", "2026-01-02", "2026-01-03"]) {
      await createCount(project.id, user.cookie, { logged_on });
    }

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts?limit=1&offset=1`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(200);
    const list = res.body as { items: Count[]; total: number };
    expect(list.items.map((item) => item.logged_on)).toEqual(["2026-01-02"]);
    expect(list.total).toBe(3);
  });

  it("returns 404 for an unknown project", async () => {
    const user = await registerUser();

    const res = await callRoute(listCounts, {
      path: `/api/projects/${UNKNOWN_PROJECT_ID}/counts`,
      cookie: user.cookie,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for another user's project", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie);

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for a malformed project id", async () => {
    const user = await registerUser();

    const res = await callRoute(listCounts, {
      path: "/api/projects/not-a-uuid/counts",
      cookie: user.cookie,
      params: { projectId: "not-a-uuid" },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it.each<[string, string]>([
    ["limit=0", "limit must be an integer between 1 and 100"],
    ["limit=101", "limit must be an integer between 1 and 100"],
    ["limit=abc", "limit must be an integer between 1 and 100"],
    ["offset=-1", "offset must be an integer greater than or equal to 0"],
    ["offset=abc", "offset must be an integer greater than or equal to 0"],
    ["before=bad", "before must be a date string (YYYY-MM-DD)"],
    ["after=bad", "after must be a date string (YYYY-MM-DD)"],
  ])("returns 400 for %s", async (query, message) => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(listCounts, {
      path: `/api/projects/${project.id}/counts?${query}`,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns the default 401 without a session cookie", async () => {
    const res = await callRoute(listCounts, {
      path: `/api/projects/${UNKNOWN_PROJECT_ID}/counts`,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(unauthorized("Missing, invalid, or expired session"));
  });
});

describe("POST /api/projects/:projectId/counts", () => {
  it("creates a count with logged_on persisted at midnight UTC", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: `/api/projects/${project.id}/counts`,
      body: { logged_on: "2026-01-02" },
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      id_project: project.id,
      logged_on: "2026-01-02",
    });

    const row = await prisma.counts.findFirst({
      where: { id: (res.body as Count).id },
    });
    expect(row?.logged_on?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("defaults logged_on to today when omitted", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: `/api/projects/${project.id}/counts`,
      body: {},
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      id_project: project.id,
      logged_on: new Date().toISOString().slice(0, 10),
    });
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a non date logged_on", { logged_on: 42 }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["a wrongly formatted logged_on", { logged_on: "01/02/2026" }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["an impossible logged_on date", { logged_on: "2026-02-30" }, "logged_on must be a date string (YYYY-MM-DD)"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: `/api/projects/${project.id}/counts`,
      body,
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns 404 for an unknown project", async () => {
    const user = await registerUser();

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: `/api/projects/${UNKNOWN_PROJECT_ID}/counts`,
      body: {},
      cookie: user.cookie,
      params: { projectId: UNKNOWN_PROJECT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for another user's project and does not create", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie);

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: `/api/projects/${project.id}/counts`,
      body: {},
      cookie: user.cookie,
      params: { projectId: project.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
    await expect(prisma.counts.count()).resolves.toBe(0);
  });

  it("returns 404 for a malformed project id", async () => {
    const user = await registerUser();

    const res = await callRoute(createCountRoute, {
      method: "POST",
      path: "/api/projects/not-a-uuid/counts",
      body: {},
      cookie: user.cookie,
      params: { projectId: "not-a-uuid" },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });
});

describe("GET /api/projects/:projectId/counts/:countId", () => {
  it("returns the count", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie, {
      logged_on: "2026-01-02",
    });

    const res = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(count);
  });

  it("returns 404 Count not found for an unknown count", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/${UNKNOWN_COUNT_ID}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: UNKNOWN_COUNT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Count not found"));
  });

  it("returns 404 Count not found for a count of another project", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const otherProject = await createProject(user.cookie);
    const count = await createCount(otherProject.id, user.cookie);

    const res = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Count not found"));
  });

  it("returns 404 Project not found for another user's project", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie);
    const count = await createCount(project.id, other.cookie);

    const res = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for malformed ids", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const projectRes = await callRoute(getCount, {
      path: "/api/projects/not-a-uuid/counts/x",
      cookie: user.cookie,
      params: { projectId: "not-a-uuid", countId: "x" },
    });

    expect(projectRes.status).toBe(404);
    expect(projectRes.body).toEqual(notFound("Project not found"));

    const countRes = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/not-a-uuid`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: "not-a-uuid" },
    });

    expect(countRes.status).toBe(404);
    expect(countRes.body).toEqual(notFound("Count not found"));
  });
});

describe("PATCH /api/projects/:projectId/counts/:countId", () => {
  it("updates logged_on and persists it", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie, {
      logged_on: "2026-01-02",
    });

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body: { logged_on: "2026-03-01" },
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...count, logged_on: "2026-03-01" });

    const row = await prisma.counts.findFirst({ where: { id: count.id } });
    expect(row?.logged_on?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns the existing count unchanged when logged_on is omitted", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie, {
      logged_on: "2026-01-02",
    });

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body: {},
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(count);
  });

  it("clears logged_on when nulled", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie, {
      logged_on: "2026-01-02",
    });

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body: { logged_on: null },
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...count, logged_on: null });

    const row = await prisma.counts.findFirst({ where: { id: count.id } });
    expect(row?.logged_on).toBeNull();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a non date logged_on", { logged_on: 42 }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["a wrongly formatted logged_on", { logged_on: "01/02/2026" }, "logged_on must be a date string (YYYY-MM-DD)"],
  ])("returns 400 for %s", async (_name, body, message) => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie);

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(badRequest(message));
  });

  it("returns 404 Count not found for an unknown count", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${UNKNOWN_COUNT_ID}`,
      body: { logged_on: "2026-03-01" },
      cookie: user.cookie,
      params: { projectId: project.id, countId: UNKNOWN_COUNT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Count not found"));
  });

  it("returns 404 Project not found for another user's project", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie);
    const count = await createCount(project.id, other.cookie);

    const res = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      body: { logged_on: "2026-03-01" },
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
  });

  it("returns 404 for malformed ids", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const projectRes = await callRoute(updateCount, {
      method: "PATCH",
      path: "/api/projects/not-a-uuid/counts/x",
      body: {},
      cookie: user.cookie,
      params: { projectId: "not-a-uuid", countId: "x" },
    });

    expect(projectRes.status).toBe(404);
    expect(projectRes.body).toEqual(notFound("Project not found"));

    const countRes = await callRoute(updateCount, {
      method: "PATCH",
      path: `/api/projects/${project.id}/counts/not-a-uuid`,
      body: {},
      cookie: user.cookie,
      params: { projectId: project.id, countId: "not-a-uuid" },
    });

    expect(countRes.status).toBe(404);
    expect(countRes.body).toEqual(notFound("Count not found"));
  });
});

describe("DELETE /api/projects/:projectId/counts/:countId", () => {
  it("deletes the count", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);
    const count = await createCount(project.id, user.cookie);

    const res = await callRoute(deleteCount, {
      method: "DELETE",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    await expect(prisma.counts.count()).resolves.toBe(0);

    const get = await callRoute(getCount, {
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });
    expect(get.status).toBe(404);
  });

  it("returns 404 Count not found for an unknown count", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const res = await callRoute(deleteCount, {
      method: "DELETE",
      path: `/api/projects/${project.id}/counts/${UNKNOWN_COUNT_ID}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: UNKNOWN_COUNT_ID },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Count not found"));
  });

  it("returns 404 Project not found for another user's project", async () => {
    const user = await registerUser();
    const other = await registerUser({ email: "other@example.com", username: "other" });
    const project = await createProject(other.cookie);
    const count = await createCount(project.id, other.cookie);

    const res = await callRoute(deleteCount, {
      method: "DELETE",
      path: `/api/projects/${project.id}/counts/${count.id}`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: count.id },
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(notFound("Project not found"));
    await expect(prisma.counts.count()).resolves.toBe(1);
  });

  it("returns 404 for malformed ids", async () => {
    const user = await registerUser();
    const project = await createProject(user.cookie);

    const projectRes = await callRoute(deleteCount, {
      method: "DELETE",
      path: "/api/projects/not-a-uuid/counts/x",
      cookie: user.cookie,
      params: { projectId: "not-a-uuid", countId: "x" },
    });

    expect(projectRes.status).toBe(404);
    expect(projectRes.body).toEqual(notFound("Project not found"));

    const countRes = await callRoute(deleteCount, {
      method: "DELETE",
      path: `/api/projects/${project.id}/counts/not-a-uuid`,
      cookie: user.cookie,
      params: { projectId: project.id, countId: "not-a-uuid" },
    });

    expect(countRes.status).toBe(404);
    expect(countRes.body).toEqual(notFound("Count not found"));
  });
});
