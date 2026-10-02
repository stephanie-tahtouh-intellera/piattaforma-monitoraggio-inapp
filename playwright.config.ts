import { defineConfig } from "@playwright/test";

/** E2E sul build di produzione con DB dedicato e dataset scenarios (oracle). */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", locale: "it-IT", viewport: { width: 1366, height: 900 }, trace: "retain-on-failure" },
  webServer: {
    command: "node e2e/clean-db.mjs && pnpm exec next start -p 3100",
    url: "http://localhost:3100/ready",
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: ".data/e2e/inapp-e2e.db",
      STORAGE_PATH: ".data/e2e/storage",
      DEMO_DATASET: "scenarios",
      APP_REFERENCE_DATE: "2026-10-01",
      APP_ALLOWED_ORIGINS: "http://localhost:3100",
      DEMO_PASSWORD: "Demo2026!",
    },
  },
});
