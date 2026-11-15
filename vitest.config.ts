import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "coverage/",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
});
