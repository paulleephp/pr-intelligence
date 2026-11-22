import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Frontend-owned tests. lib/api.ts (+ api-guards / api-constants) is the browser fetch
 * client used by the UI, so its test belongs to the frontend project even though it lives in lib/.
 */
const FRONTEND_TESTS = ["app/components/**/*.test.{ts,tsx}", "lib/__tests__/api.test.ts"];

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "coverage/", "**/*.test.ts", "**/*.test.tsx", "**/types/**"],
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
