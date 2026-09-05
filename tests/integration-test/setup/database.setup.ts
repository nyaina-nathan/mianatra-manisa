import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container;

export async function setupDatabase() {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  return container;
}