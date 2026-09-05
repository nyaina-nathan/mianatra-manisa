import { execFileSync } from "node:child_process";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import "dotenv/config";
import { setupDatabase } from "./database.setup";

let container: StartedPostgreSqlContainer | undefined;

process.env.JWT_SECRET ??= "test-jwt-secret";

export async function setup() {
  container = await setupDatabase();

  execFileSync("npx", ["prisma", "db", "push"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

export async function teardown() {
  await container?.stop();
}
