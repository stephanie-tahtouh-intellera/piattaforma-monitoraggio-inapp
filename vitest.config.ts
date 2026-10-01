import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/helpers/server-only.ts") } },
  test: {
    include: ["tests/**/*.test.ts", "scripts/tmp/*.test.ts"],
    environment: "node",
    pool: "forks",
    testTimeout: 30000,
    coverage: { provider: "v8", include: ["src/domain/**"], thresholds: { lines: 70 } },
  },
});
