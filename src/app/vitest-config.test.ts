import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Storybook's test panel renames every Storybook project to the same name, and
 * Vitest then refuses to start. It must only ever be given one project.
 */
describe("vitest config for the Storybook panel", () => {
  afterEach(() => vi.unstubAllEnvs());

  const names = async () => {
    vi.resetModules();
    const { storyProjects } = await import("../../vitest.config");
    return storyProjects().map((p) => p.test.name);
  };

  it("runs light and dark from the command line and CI", async () => {
    vi.stubEnv("VITEST_STORYBOOK", "");
    expect(await names()).toEqual(["storybook-light", "storybook-dark"]);
  });

  it("gives the Storybook panel a single project", async () => {
    vi.stubEnv("VITEST_STORYBOOK", "true");
    expect(await names()).toEqual(["storybook-light"]);
  });
});
