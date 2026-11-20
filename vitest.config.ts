import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/**
 * Two kinds of test run here:
 *  - `unit`: plain Node tests in src/**\/*.test.ts (encryption, contrast, ...)
 *  - `storybook-light` and `storybook-dark`: every story in a real Chromium,
 *    once per theme, with the axe check and the shared story checks (spec 0003).
 * Playwright's e2e specs live in e2e/ and are not picked up here.
 */
const storyProject = (theme: "light" | "dark") => ({
  extends: true as const,
  define: { __STORY_THEME__: JSON.stringify(theme) },
  plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
  test: {
    name: `storybook-${theme}`,
    setupFiles: [path.join(dirname, ".storybook/vitest.setup.ts")],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" as const }],
    },
  },
});

export default defineConfig({
  resolve: { alias: { "@": path.join(dirname, "src") } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      storyProject("light"),
      storyProject("dark"),
    ],
  },
});
