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
      commands: {
        // Lets story tests check the reduced motion rules (spec 0003, AC-10).
        emulateReducedMotion: async (ctx: unknown, on: boolean) => {
          const { page } = ctx as {
            page: {
              emulateMedia: (o: { reducedMotion: string }) => Promise<void>;
            };
          };
          await page.emulateMedia({
            reducedMotion: on ? "reduce" : "no-preference",
          });
        },
      },
      instances: [{ browser: "chromium" as const }],
    },
  },
});

/**
 * Storybook's test panel starts Vitest itself (VITEST_STORYBOOK=true) and its
 * plugin renames every Storybook project to the same `storybook:<configDir>`.
 * Vitest then refuses to start ("Project name is not unique"). So the panel
 * gets one project (light; the toolbar switches theme). The command line and CI
 * keep both themes.
 */
export const isStorybookPanelRun = () =>
  process.env.VITEST_STORYBOOK === "true";

export const storyProjects = () =>
  isStorybookPanelRun()
    ? [storyProject("light")]
    : [storyProject("light"), storyProject("dark")];

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
      ...storyProjects(),
    ],
  },
});
