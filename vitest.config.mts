import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit-test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration-test/**/*.test.ts"],
          globalSetup: ["tests/integration-test/setup/global-setup.ts"],
          testTimeout: 120_000,
          hookTimeout: 120_000,
          maxWorkers: 1,
          isolate: false,
          sequence: {
            groupOrder: 1,
          },
        },
      },
    ],
  },
});
