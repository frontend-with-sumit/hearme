import { defineConfig } from "@playwright/test";

/**
 * App level checks (spec 0003, AC-15). They run against the real production
 * build (`pnpm build` then `pnpm start`), not the dev server, so they see what
 * visitors see. Vitest does not pick these files up: it only reads
 * src/**\/*.test.ts and the stories.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
