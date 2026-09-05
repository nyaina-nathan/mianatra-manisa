import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { prisma } from "../../libs/prisma";
import { countsService } from "../../libs/counts/service";

vi.mock("../../libs/prisma", () => ({
  prisma: {
    projects: {
      findFirst: vi.fn(),
    },
    counts: {
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
  };
  counts: {
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
const COUNT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_COUNT_ID = "55555555-5555-4555-8555-555555555555";

const ownedProject = { id: PROJECT_ID };

const countRow = {
  id: COUNT_ID,
  id_project: PROJECT_ID,
  logged_on: new Date("2026-01-02T00:00:00.000Z"),
};

const nullLoggedCountRow = {
  id: OTHER_COUNT_ID,
  id_project: PROJECT_ID,
  logged_on: null,
};

const serializedCount = {
  id: COUNT_ID,
  id_project: PROJECT_ID,
  logged_on: "2026-01-02",
};

const errorWith = (status: number, message: string) => ({
  name: "ApiError",
  status,
  message,
});

const whereWithoutDates = {
  id_project: PROJECT_ID,
  logged_on: { lt: undefined, gt: undefined },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("countsService.list", () => {
  it("returns counts with their total", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.$transaction.mockResolvedValue([[countRow], 1]);

    const result = await countsService.list(
      PROJECT_ID,
      USER_ID,
      new URLSearchParams()
    );

    expect(db.projects.findFirst).toHaveBeenCalledWith({
      where: { id: PROJECT_ID, id_user: USER_ID },
      select: { id: true },
    });
    expect(db.counts.findMany).toHaveBeenCalledWith({
      where: whereWithoutDates,
      orderBy: { logged_on: "desc" },
      take: 20,
      skip: 0,
    });
    expect(db.counts.count).toHaveBeenCalledWith({ where: whereWithoutDates });
    expect(result).toEqual({ items: [serializedCount], total: 1 });
  });

  it("serializes a null logged_on as null", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.$transaction.mockResolvedValue([[nullLoggedCountRow], 1]);

    const result = await countsService.list(
      PROJECT_ID,
      USER_ID,
      new URLSearchParams()
    );

    expect(result).toEqual({
      items: [
        { id: OTHER_COUNT_ID, id_project: PROJECT_ID, logged_on: null },
      ],
      total: 1,
    });
  });

  it("applies before/after filters as UTC date boundaries", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.$transaction.mockResolvedValue([[], 0]);

    await countsService.list(
      PROJECT_ID,
      USER_ID,
      new URLSearchParams("before=2026-01-05&after=2026-01-01")
    );

    expect(db.counts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_project: PROJECT_ID,
          logged_on: {
            lt: new Date("2026-01-05T00:00:00.000Z"),
            gt: new Date("2026-01-01T00:00:00.000Z"),
          },
        },
      })
    );
  });

  it("applies custom pagination", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.$transaction.mockResolvedValue([[], 0]);

    await countsService.list(
      PROJECT_ID,
      USER_ID,
      new URLSearchParams("limit=5&offset=10")
    );

    expect(db.counts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 })
    );
  });

  it("throws 404 for a malformed project id without querying", async () => {
    await expect(
      countsService.list("not-a-uuid", USER_ID, new URLSearchParams())
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("throws 404 when the project is not owned and never lists counts", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      countsService.list(PROJECT_ID, USER_ID, new URLSearchParams())
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each<[string, string]>([
    ["limit=0", "limit must be an integer between 1 and 100"],
    ["limit=101", "limit must be an integer between 1 and 100"],
    ["limit=abc", "limit must be an integer between 1 and 100"],
    ["offset=-1", "offset must be an integer greater than or equal to 0"],
    ["offset=abc", "offset must be an integer greater than or equal to 0"],
    ["before=bad", "before must be a date string (YYYY-MM-DD)"],
    ["after=bad", "after must be a date string (YYYY-MM-DD)"],
  ])("throws 400 for %s", async (query, message) => {
    await expect(
      countsService.list(PROJECT_ID, USER_ID, new URLSearchParams(query))
    ).rejects.toMatchObject(errorWith(400, message));
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("countsService.create", () => {
  it("creates a count with logged_on converted to a UTC date", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.create.mockResolvedValue(countRow);

    const result = await countsService.create(PROJECT_ID, USER_ID, {
      logged_on: "2026-01-02",
    });

    expect(db.projects.findFirst).toHaveBeenCalledWith({
      where: { id: PROJECT_ID, id_user: USER_ID },
      select: { id: true },
    });
    expect(db.counts.create).toHaveBeenCalledWith({
      data: {
        id_project: PROJECT_ID,
        logged_on: new Date("2026-01-02T00:00:00.000Z"),
      },
    });
    expect(result).toEqual(serializedCount);
  });

  it("creates a count without a date when logged_on is omitted", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.create.mockResolvedValue(nullLoggedCountRow);

    const result = await countsService.create(PROJECT_ID, USER_ID, {});

    expect(db.counts.create).toHaveBeenCalledWith({
      data: { id_project: PROJECT_ID, logged_on: undefined },
    });
    expect(result).toEqual({
      id: OTHER_COUNT_ID,
      id_project: PROJECT_ID,
      logged_on: null,
    });
  });

  it("throws 404 when the project is not owned and never creates", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      countsService.create(PROJECT_ID, USER_ID, {})
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.counts.create).not.toHaveBeenCalled();
  });

  it("throws 404 for a malformed project id without querying", async () => {
    await expect(
      countsService.create("not-a-uuid", USER_ID, {})
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.create).not.toHaveBeenCalled();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a non date logged_on", { logged_on: 42 }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["a wrongly formatted logged_on", { logged_on: "01/02/2026" }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["an impossible logged_on date", { logged_on: "2026-02-30" }, "logged_on must be a date string (YYYY-MM-DD)"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(
      countsService.create(PROJECT_ID, USER_ID, body)
    ).rejects.toMatchObject(errorWith(400, message));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.create).not.toHaveBeenCalled();
  });
});

describe("countsService.get", () => {
  it("returns a serialized count", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(countRow);

    const result = await countsService.get(PROJECT_ID, USER_ID, COUNT_ID);

    expect(db.projects.findFirst).toHaveBeenCalledWith({
      where: { id: PROJECT_ID, id_user: USER_ID },
      select: { id: true },
    });
    expect(db.counts.findFirst).toHaveBeenCalledWith({
      where: { id: COUNT_ID, id_project: PROJECT_ID },
    });
    expect(result).toEqual(serializedCount);
  });

  it("throws 404 when the count does not belong to the project", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(null);

    await expect(
      countsService.get(PROJECT_ID, USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
  });

  it("throws 404 when the project is not owned and never looks up the count", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      countsService.get(PROJECT_ID, USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.counts.findFirst).not.toHaveBeenCalled();
  });

  it("throws 404 for malformed ids without querying", async () => {
    await expect(
      countsService.get("not-a-uuid", USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    await expect(
      countsService.get(PROJECT_ID, USER_ID, "not-a-uuid")
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.findFirst).not.toHaveBeenCalled();
  });
});

describe("countsService.update", () => {
  it("updates logged_on when a date is provided", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(countRow);
    db.counts.update.mockResolvedValue({
      ...countRow,
      logged_on: new Date("2026-03-01T00:00:00.000Z"),
    });

    const result = await countsService.update(
      PROJECT_ID,
      USER_ID,
      COUNT_ID,
      { logged_on: "2026-03-01" }
    );

    expect(db.counts.update).toHaveBeenCalledWith({
      where: { id: COUNT_ID },
      data: { logged_on: new Date("2026-03-01T00:00:00.000Z") },
    });
    expect(result).toEqual({
      id: COUNT_ID,
      id_project: PROJECT_ID,
      logged_on: "2026-03-01",
    });
  });

  it("returns the existing count without updating when logged_on is omitted", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(countRow);

    const result = await countsService.update(
      PROJECT_ID,
      USER_ID,
      COUNT_ID,
      {}
    );

    expect(db.counts.update).not.toHaveBeenCalled();
    expect(result).toEqual(serializedCount);
  });

  it("clears logged_on when null is provided", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(countRow);
    db.counts.update.mockResolvedValue(nullLoggedCountRow);

    const result = await countsService.update(
      PROJECT_ID,
      USER_ID,
      COUNT_ID,
      { logged_on: null }
    );

    expect(db.counts.update).toHaveBeenCalledWith({
      where: { id: COUNT_ID },
      data: { logged_on: null },
    });
    expect(result).toEqual({
      id: OTHER_COUNT_ID,
      id_project: PROJECT_ID,
      logged_on: null,
    });
  });

  it("throws 404 when the count is missing and does not update", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(null);

    await expect(
      countsService.update(PROJECT_ID, USER_ID, COUNT_ID, {
        logged_on: "2026-03-01",
      })
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
    expect(db.counts.update).not.toHaveBeenCalled();
  });

  it("throws 404 when the project is not owned and never updates", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      countsService.update(PROJECT_ID, USER_ID, COUNT_ID, {})
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.counts.findFirst).not.toHaveBeenCalled();
    expect(db.counts.update).not.toHaveBeenCalled();
  });

  it("throws 404 for malformed ids without querying", async () => {
    await expect(
      countsService.update("not-a-uuid", USER_ID, COUNT_ID, {})
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    await expect(
      countsService.update(PROJECT_ID, USER_ID, "not-a-uuid", {})
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.findFirst).not.toHaveBeenCalled();
  });

  it.each<[string, unknown, string]>([
    ["a null body", null, "Request body must be a JSON object"],
    ["a non date logged_on", { logged_on: 42 }, "logged_on must be a date string (YYYY-MM-DD)"],
    ["a wrongly formatted logged_on", { logged_on: "01/02/2026" }, "logged_on must be a date string (YYYY-MM-DD)"],
  ])("throws 400 for %s", async (_name, body, message) => {
    await expect(
      countsService.update(PROJECT_ID, USER_ID, COUNT_ID, body)
    ).rejects.toMatchObject(errorWith(400, message));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.update).not.toHaveBeenCalled();
  });
});

describe("countsService.remove", () => {
  it("deletes the count", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(countRow);

    await expect(
      countsService.remove(PROJECT_ID, USER_ID, COUNT_ID)
    ).resolves.toBeUndefined();

    expect(db.counts.delete).toHaveBeenCalledWith({ where: { id: COUNT_ID } });
  });

  it("throws 404 when the count is missing and does not delete", async () => {
    db.projects.findFirst.mockResolvedValue(ownedProject);
    db.counts.findFirst.mockResolvedValue(null);

    await expect(
      countsService.remove(PROJECT_ID, USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
    expect(db.counts.delete).not.toHaveBeenCalled();
  });

  it("throws 404 when the project is not owned", async () => {
    db.projects.findFirst.mockResolvedValue(null);

    await expect(
      countsService.remove(PROJECT_ID, USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    expect(db.counts.delete).not.toHaveBeenCalled();
  });

  it("throws 404 for malformed ids without querying", async () => {
    await expect(
      countsService.remove("not-a-uuid", USER_ID, COUNT_ID)
    ).rejects.toMatchObject(errorWith(404, "Project not found"));
    await expect(
      countsService.remove(PROJECT_ID, USER_ID, "not-a-uuid")
    ).rejects.toMatchObject(errorWith(404, "Count not found"));
    expect(db.projects.findFirst).not.toHaveBeenCalled();
    expect(db.counts.delete).not.toHaveBeenCalled();
  });
});
