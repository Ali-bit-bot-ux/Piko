import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/server/**", "src/lib/**"],
      // Thin glue to Auth.js and Next.js request APIs; it needs a running
      // server and is checked in the browser (see PROGRESS.md, T-006).
      exclude: ["src/server/auth/auth.ts", "src/server/auth/session.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
