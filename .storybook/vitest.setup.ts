import { beforeEach } from "vitest";
import { page } from "vitest/browser";

// Every story runs at a 320px wide viewport, so the reflow rule (spec 0003,
// AC-3) is checked for all of them, not just a few.
beforeEach(async () => {
  await page.viewport(320, 800);
});
