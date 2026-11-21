import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { readThemeTokens } from "@/lib/css-tokens";

/** Reads the backticked `--name` in the first column of the `## Tokens` tables of design.md. */
function documentedTokens(markdown: string): string[] {
  const section = markdown
    .split(/^## /m)
    .find((part) => part.startsWith("Tokens"));
  if (!section) throw new Error("design.md has no ## Tokens section");
  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|")[1] ?? "")
    .flatMap((cell) =>
      Array.from(cell.matchAll(/`(--[\w-]+)`/g), ([, name]) => name),
    );
}

describe("design.md (spec 0003, AC-12)", () => {
  const markdown = readFileSync(join(process.cwd(), "design.md"), "utf8");
  const documented = documentedTokens(markdown).sort();
  const { light, dark } = readThemeTokens();

  it("lists exactly the custom properties declared in :root and .dark", () => {
    const declared = [...new Set([...light.keys(), ...dark.keys()])].sort();
    expect(documented).toEqual(declared);
  });

  it("lists each token only once", () => {
    expect(new Set(documented).size).toBe(documented.length);
  });

  it("names the Figma file as the source of truth and marks dark as derived", () => {
    expect(markdown).toContain("HpHZNlRSHt2aec0CflECzs");
    expect(markdown).toMatch(/dark mode is derived/i);
  });
});
