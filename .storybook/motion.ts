/**
 * Turns the browser's "reduce motion" setting on or off during a Vitest story
 * run (spec 0003, AC-10). It needs a Playwright command defined in
 * vitest.config.ts, so in the Storybook UI it quietly does nothing.
 * Returns whether the setting could be changed.
 */
export async function emulateReducedMotion(on: boolean): Promise<boolean> {
  try {
    // The module's types come from optional packages, so type it by hand.
    const { commands } = (await import("vitest/browser")) as unknown as {
      commands: { emulateReducedMotion: (on: boolean) => Promise<void> };
    };
    await commands.emulateReducedMotion(on);
    return true;
  } catch {
    return false;
  }
}

/** Waits two frames, then returns how many animations are still running. */
export async function settledAnimationCount(): Promise<number> {
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  return document.getAnimations().length;
}
