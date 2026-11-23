import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Frontend-owned tests. lib/api.ts (+ api-constants) is the browser fetch client used by the UI,
 * so its test belongs to the frontend project even though it lives in lib/. The Zod schemas it
 * uses (lib/schemas/) are plain functions, so the schemas.*.test.ts files run in the backend project.
 */
const FRONTEND_TESTS = ["app/components/**/*.test.{ts,tsx}", "lib/__tests__/api.test.ts"];

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // List source files explicitly: since Vitest 4, files no test imports are otherwise left out.
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"],
      // Test helpers (fixtures, mocks, test-utils) live in __tests__ and aren't code under test.
      exclude: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/types/**"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "happy-dom",
          setupFiles: ["./test/setup.ts"],
          include: FRONTEND_TESTS,
        },
      },
      {
        extends: true,
        test: {
          name: "backend",
          environment: "node",
          include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
          exclude: [...FRONTEND_TESTS, "node_modules/**"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
});
