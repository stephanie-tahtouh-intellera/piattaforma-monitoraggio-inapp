import { defineConfig } from "@playwright/test";

/** E2E sul build di produzione: demo script sul dataset scenarios (oracle), guida demo sul dataset inapp. */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { locale: "it-IT", viewport: { width: 1366, height: 900 }, trace: "retain-on-failure" },
  projects: [
    { name: "demo-script", testMatch: /demo-script\.spec\.ts/, use: { baseURL: "http://localhost:3100" } },
    { name: "guida", testMatch: /guida\.spec\.ts/, use: { baseURL: "http://localhost:3101" } },
  ],
  webServer: [
    {
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
    {
      // Guida demo (DEC-106): portafoglio reale + casi dimostrativi
      command: "node e2e/clean-db.mjs .data/e2e-guida && pnpm exec next start -p 3101",
      url: "http://localhost:3101/ready",
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        DATABASE_PATH: ".data/e2e-guida/inapp-guida.db",
        STORAGE_PATH: ".data/e2e-guida/storage",
        DEMO_DATASET: "inapp",
        APP_REFERENCE_DATE: "2026-10-01",
        APP_ALLOWED_ORIGINS: "http://localhost:3101",
        DEMO_PASSWORD: "Demo2026!",
      },
    },
  ],
});
