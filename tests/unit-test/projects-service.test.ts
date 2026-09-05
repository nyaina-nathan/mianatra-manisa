import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { prisma } from "../../libs/prisma";
import { projectsService } from "../../libs/projects/service";

vi.mock("../../libs/prisma", () => ({
  prisma: {
    projects: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

type PrismaMock = {
  projects: {
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  $transaction: Mock;
};

const db = prisma as unknown as PrismaMock;

const USER_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";

const projectRow = {
  id: PROJECT_ID,
  id_user: USER_ID,
  title: "Groceries",
  description: null,
  started_on: new Date("2026-01-01T00:00:00.000Z"),
};

const otherProjectRow = {
  id: OTHER_ID,
  id_user: USER_ID,
  title: "Bills",
  description: "monthly bills",
  started_on: null,
};

const projectRowWithCount = { ...projectRow, _count: { counts: 3 } };
const otherProjectRowWithCount = { ...otherProjectRow, _count: { counts: 1 } };

const serializedProject = {
  id: PROJECT_ID,
  id_user: USER_ID,
  title: "Groceries",
  description: null,
  started_on: "2026-01-01",
};

const errorWith = (status: number, message: string) => ({
  name: "ApiError",
  status,
  message,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("projectsService.list", () => {
  it("returns projects with their count totals", async () => {
    db.$transaction.mockResolvedValue([
      [projectRowWithCount, otherProjectRowWithCount],
      2,
    ]);

    const result = await projectsService.list(USER_ID, new URLSearchParams());

    expect(db.projects.findMany).toHaveBeenCalledWith({
      where: { id_user: USER_ID },
      orderBy: { title: "asc" },
      take: 20,
      skip: 0,
      include: { _count: { select: { counts: true } } },
    });
    expect(db.projects.count).toHaveBeenCalledWith({ where: { id_user: USER_ID } });
    expect(result).toEqual({
      items: [
        { ...serializedProject, total_count: 3 },
        {
          id: OTHER_ID,
          id_user: USER_ID,
          title: "Bills",
          description: "monthly bills",
          started_on: null,
          total_count: 1,
        },
      ],
      total: 2,
    });
  });

  it("passes the search filter to the query", async () => {
    db.$transaction.mockResolvedValue([[], 0]);

    await projectsService.list(USER_ID, new URLSearchParams("search=Gro"));

    expect(db.projects.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_user: USER_ID, title: { contains: "Gro", mode: "insensitive" } },
      })
    );
    expect(db.projects.count).toHaveBeenCalledWith({
      where: { id_user: USER_ID, title: { contains: "Gro", mode: "insensitive" } },
    });
  });

  it("ignores an empty search parameter", async () => {
    db.$transaction.mockResolvedValue([[], 0]);

    await projectsService.list(USER_ID, new URLSearchParams("search="));

    expect(db.projects.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_user: USER_ID } })
    );
  });

  it("applies custom pagination", async () => {
    db.$transaction.mockResolvedValue([[], 0]);

    await projectsService.list(USER_ID, new URLSearchParams("limit=5&offset=10"));

    expect(db.projects.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 })
    );
  });

  it.each<[string, string]>([
    ["limit=0", "limit must be an integer between 1 and 100"],
    ["limit=101", "limit must be an integer between 1 and 100"],
    ["limit=abc", "limit must be an integer between 1 and 100"],
    ["limit=1.5", "limit must be an integer between 1 and 100"],
    ["offset=-1", "offset must be an integer greater than or equal to 0"],
    ["offset=abc", "offset must be an integer greater than or equal to 0"],
  ])("throws 400 for %s", async (query, message) => {
    await expect(
      projectsService.list(USER_ID, new URLSearchParams(query))
    ).rejects.toMatchObject(errorWith(400, message));
    expect(db.projects.findMany).not.toHaveBeenCalled();
    expect(db.projects.count).not.toHaveBeenCalled();
  });
});

describe("projectsService.create", () => {
  it("creates a project with all provided fields", async () => {
    db.projects.create.mockResolvedValue(projectRow);

    const result = await projectsService.create(USER_ID, {
      title: "Groceries",
      description: "weekly shopping",
      started_on: "2026-01-01",
    });

    expect(db.projects.create).toHaveBeenCalledWith({
      data: {
        id_user: USER_ID,
        title: "Groceries",
        description: "weekly shopping",
        started_on: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    expect(result).toEqual(serializedProject);
  });

  it("defaults description to null and omits started_on", async () => {
    db.projects.create.mockResolvedValue({
      ...projectRow,
      description: null,
      started_on: null,
    });

    const result = await projectsService.create(USER_ID, { title: "Groceries" });

    expect(db.projects.create).toHaveBeenCalledWith({
      data: {
        id_user: USER_ID,
        title: "Groceries",
        description: null,
        started_on: undefined,
      },
    });
    expect(result).toEqual({ ...serializedProject, started_on: null });
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a missing title", {}, "title is required"],
    ["an empty title", { title: "" }, "title must be a string between 1 and 255 characters"],
    ["a too long title", { title: "t".repeat(256) }, "title must be a string between 1 and 255 characters"],
    ["a non string description", { title: "Groceries", description: 42 }, "description must be a string"],
    ["a wrongly formatted started_on", { title: "Groceries", started_on: "01/02/2026" }, "started_on must be a date string (YYYY-MM-DD)"],
    ["an impossible started_on date", { title: "Groceries", started_on: "2026-02-30" }, "started_on must be a date string (YYYY-MM-DD)"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(projectsService.create(USER_ID, body)).rejects.toMatchObject(
      errorWith(400, message)
    );
    expect(db.projects.create).not.toHaveBeenCalled();
  });
});

describe("projectsService.get", () => {
  it("returns the project with its count total", async () => {
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);

    const result = await projectsService.get(USER_ID, PROJECT_ID);

    expect(db.projects.findFirst).toHaveBeenCalledWith({
      where: { id: PROJECT_ID, id_user: USER_ID },
      include: { _count: { select: { counts: true } } },
    });
    expect(result).toEqual({ ...serializedProject, total_count: 3 });
  });

  it("throws 404 when the project does not exist or is not owned", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(projectsService.get(USER_ID, PROJECT_ID)).rejects.toMatchObject(
      errorWith(404, "Project not found")
    );
  });

  it("throws 404 for a malformed project id without querying", async () => {
    await expect(projectsService.get(USER_ID, "not-a-uuid")).rejects.toMatchObject(
      errorWith(404, "Project not found")
    );
    expect(db.projects.findFirst).not.toHaveBeenCalled();
  });
});

describe("projectsService.update", () => {
  it("updates only the provided fields", async () => {
    const updatedRow = {
      ...projectRow,
      title: "Renamed",
      started_on: new Date("2026-02-01T00:00:00.000Z"),
    };
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);
    db.projects.update.mockResolvedValue(updatedRow);

    const result = await projectsService.update(USER_ID, PROJECT_ID, {
      title: "Renamed",
      started_on: "2026-02-01",
    });

    expect(db.projects.update).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: {
        title: "Renamed",
        started_on: new Date("2026-02-01T00:00:00.000Z"),
      },
    });
    expect(result).toEqual({
      ...serializedProject,
      title: "Renamed",
      started_on: "2026-02-01",
    });
  });

  it("returns the existing project without updating when no fields are given", async () => {
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);

    const result = await projectsService.update(USER_ID, PROJECT_ID, {});

    expect(db.projects.update).not.toHaveBeenCalled();
    expect(result).toEqual(serializedProject);
  });

  it("allows nulling started_on and description", async () => {
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);
    db.projects.update.mockResolvedValue({
      ...projectRow,
      started_on: null,
      description: null,
    });

    await projectsService.update(USER_ID, PROJECT_ID, {
      started_on: null,
      description: null,
    });

    expect(db.projects.update).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { started_on: null, description: null },
    });
  });

  it("throws 400 when title is explicitly undefined", async () => {
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);

    await expect(
      projectsService.update(USER_ID, PROJECT_ID, { title: undefined })
    ).rejects.toMatchObject(errorWith(400, "title must not be null"));
    expect(db.projects.update).not.toHaveBeenCalled();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a null title", { title: null }, "title must be a string between 1 and 255 characters"],
    ["an empty title", { title: "" }, "title must be a string between 1 and 255 characters"],
    ["a non string description", { description: 42 }, "description must be a string"],
    ["a wrongly formatted started_on", { started_on: "01/02/2026" }, "started_on must be a date string (YYYY-MM-DD)"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(
      projectsService.update(USER_ID, PROJECT_ID, body)
    ).rejects.toMatchObject(errorWith(400, message));
    expect(db.projects.update).not.toHaveBeenCalled();
  });

  it("throws 404 for a malformed project id without querying", async () => {
    await expect(
      projectsService.update(USER_ID, "not-a-uuid", { title: "Renamed" })
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
  });

  it("throws 404 when the project is missing and does not update", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      projectsService.update(USER_ID, PROJECT_ID, { title: "Renamed" })
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.projects.update).not.toHaveBeenCalled();
  });
});

describe("projectsService.remove", () => {
  it("deletes the project", async () => {
    db.projects.findFirst.mockResolvedValue(projectRowWithCount);

    await expect(projectsService.remove(USER_ID, PROJECT_ID)).resolves.toBeUndefined();

    expect(db.projects.delete).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
  });

  it("throws 404 when the project is missing and does not delete", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(projectsService.remove(USER_ID, PROJECT_ID)).rejects.toMatchObject(
      errorWith(404, "Project not found")
    );
    expect(db.projects.delete).not.toHaveBeenCalled();
  });

  it("throws 404 for a malformed project id without querying", async () => {
    await expect(projectsService.remove(USER_ID, "not-a-uuid")).rejects.toMatchObject(
      errorWith(404, "Project not found")
    );
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.projects.delete).not.toHaveBeenCalled();
  });
});
