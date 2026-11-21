import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/contrast";
import { readThemeTokens } from "@/lib/css-tokens";

type Theme = "light" | "dark";

type Pair = {
  foreground: string[];
  background: string[];
  minimum: number;
  /** What the pair covers. Limits the check to one theme only if named. */
  covers: string;
  themes?: Theme[];
};

/** A copy of the "Contrast pairs" table in spec 0003. Change both together. */
const PAIRS: Pair[] = [
  {
    foreground: ["--foreground"],
    background: ["--background", "--card"],
    minimum: 4.5,
    covers: "Body text",
  },
  {
    foreground: ["--muted-foreground"],
    background: ["--background", "--card", "--secondary"],
    minimum: 4.5,
    covers: "Helper and secondary text",
  },
  {
    foreground: ["--text-inactive"],
    background: ["--background", "--card"],
    minimum: 4.5,
    covers: "Unavailable days",
  },
  {
    foreground: ["--primary-foreground"],
    background: ["--primary", "--primary-hover", "--primary-active"],
    minimum: 4.5,
    covers: "Filled button text",
  },
  {
    foreground: ["--primary"],
    background: ["--background", "--card", "--secondary"],
    minimum: 4.5,
    covers: "Links and accent text",
  },
  {
    foreground: ["--secondary-foreground"],
    background: ["--secondary"],
    minimum: 4.5,
    covers: "Pill text",
  },
  {
    foreground: ["--accent-foreground"],
    background: ["--accent"],
    minimum: 4.5,
    covers: "Text on the hero arch",
  },
  {
    foreground: ["--destructive"],
    background: ["--background", "--card", "--destructive-soft"],
    minimum: 4.5,
    covers: "Error text, danger badge",
  },
  {
    foreground: ["--destructive-foreground"],
    background: ["--destructive"],
    minimum: 4.5,
    covers: "Destructive button",
  },
  {
    foreground: ["--warning-foreground", "--warning-strong"],
    background: ["--warning"],
    minimum: 4.5,
    covers: "Note alert, warning badge",
  },
  {
    foreground: ["--success-foreground"],
    background: ["--success-soft"],
    minimum: 4.5,
    covers: "Success badge",
  },
  {
    foreground: ["--neutral-foreground"],
    background: ["--neutral-soft"],
    minimum: 4.5,
    covers: "Neutral badge",
  },
  {
    foreground: ["--sidebar-foreground", "--sidebar-label"],
    background: ["--sidebar"],
    minimum: 4.5,
    covers: "Sidebar text",
  },
  {
    foreground: ["--sidebar-accent-foreground"],
    background: ["--sidebar-accent"],
    minimum: 4.5,
    covers: "Active row",
  },
  {
    foreground: ["--sidebar-muted"],
    background: ["--sidebar-card"],
    minimum: 4.5,
    covers: "Status text",
  },
  {
    foreground: ["--input"],
    background: ["--background", "--card"],
    minimum: 3,
    covers: "Input, slot, checkbox, switch boundary",
  },
  {
    foreground: ["--ring"],
    background: ["--background", "--card"],
    minimum: 3,
    covers: "Focus outline",
  },
  {
    foreground: ["--sidebar-ring", "--sidebar-brand"],
    background: ["--sidebar"],
    minimum: 3,
    covers: "Sidebar focus and wordmark",
  },
  {
    foreground: ["--primary"],
    background: ["--secondary"],
    minimum: 3,
    covers: "Selected slot border on its fill",
  },
  {
    foreground: ["--success-dot"],
    background: ["--sidebar-card"],
    minimum: 3,
    covers: "Connected dot",
  },
];

const tokens = readThemeTokens();
const THEMES: Theme[] = ["light", "dark"];

describe("colour contrast (spec 0003, AC-4)", () => {
  for (const theme of THEMES) {
    const values = tokens[theme];
    const pairs = PAIRS.filter(
      (pair) => pair.themes === undefined || pair.themes.includes(theme),
    );

    describe(`${theme} theme`, () => {
      for (const { foreground, background, minimum, covers } of pairs) {
        for (const fg of foreground) {
          for (const bg of background) {
            it(`${fg} on ${bg} is at least ${minimum}:1 (${covers})`, () => {
              const fgValue = values.get(fg);
              const bgValue = values.get(bg);
              expect(
                fgValue,
                `${fg} is missing from the ${theme} tokens`,
              ).toMatch(/^#[0-9a-f]{6}$/i);
              expect(
                bgValue,
                `${bg} is missing from the ${theme} tokens`,
              ).toMatch(/^#[0-9a-f]{6}$/i);
              const ratio = contrastRatio(fgValue as string, bgValue as string);
              expect(
                ratio,
                `${fg} ${fgValue} on ${bg} ${bgValue} is ${ratio.toFixed(2)}`,
              ).toBeGreaterThanOrEqual(minimum);
            });
          }
        }
      }
    });
  }

  it("defines the same tokens in light and dark", () => {
    expect([...tokens.dark.keys()].sort()).toEqual(
      [...tokens.light.keys()].sort(),
    );
  });
});

describe("one stylesheet (spec 0003, AC-1)", () => {
  const cssFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return cssFiles(path);
      return path.endsWith(".css") ? [path] : [];
    });

  it("has globals.css as the only .css file under src/", () => {
    const found = cssFiles(join(process.cwd(), "src")).map((path) =>
      path.replace(`${process.cwd()}/`, ""),
    );
    expect(found).toEqual(["src/app/globals.css"]);
  });
});
