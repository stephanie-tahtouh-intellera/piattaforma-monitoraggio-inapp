import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest non carica .env da solo come fa next dev/build (DEC-115: serve POSTGRES_URL nei test).
try {
  process.loadEnvFile();
} catch {
  // .env assente: si assume che POSTGRES_URL sia già nell'ambiente (CI).
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/helpers/server-only.ts") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    fileParallelism: false, // DEC-115: un solo Postgres condiviso (dev/test/prod), i file di test non possono girare in parallelo
    testTimeout: 30000,
    coverage: { provider: "v8", include: ["src/domain/**"], thresholds: { lines: 70 } },
  },
});
