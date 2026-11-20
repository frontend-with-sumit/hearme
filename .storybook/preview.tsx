import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { figtree, newsreader } from "../src/app/fonts";
import "../src/app/globals.css";
import { findSmallHitAreas, fitsViewport } from "./checks";

/**
 * Set only by the Vitest story projects (see vitest.config.ts): which theme
 * the automatic run uses. Undefined in the Storybook UI, where the toolbar
 * picks the theme and the shared checks stay quiet.
 */
declare const __STORY_THEME__: "light" | "dark" | undefined;
const testTheme =
  typeof __STORY_THEME__ === "undefined" ? undefined : __STORY_THEME__;

// The same fonts as the app, on <html> so portalled overlays get them too.
document.documentElement.classList.add(figtree.variable, newsreader.variable);

const preview: Preview = {
  initialGlobals: { theme: testTheme ?? "light" },
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    (Story) => (
      <div className="bg-background text-foreground font-sans min-h-screen p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: {
      // Any serious or critical axe violation fails the story (spec 0003, AC-14).
      test: "error",
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    },
  },
  afterEach: async ({ canvasElement, parameters }) => {
    if (!testTheme) return;
    if (parameters.skipHitAreaCheck !== true) {
      const small = findSmallHitAreas(canvasElement);
      expect(small, `controls under 44 x 44px: ${small.join(", ")}`).toEqual(
        [],
      );
    }
    expect(fitsViewport(), "page scrolls sideways at 320px").toBe(true);
  },
};

export default preview;
