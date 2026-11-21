/// <reference types="@vitest/browser-playwright" />

declare module "vitest/browser" {
  interface BrowserCommands {
    /** Switches `prefers-reduced-motion` on or off (see vitest.config.ts). */
    emulateReducedMotion: (on: boolean) => Promise<void>;
  }
}
