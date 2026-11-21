import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Path to the one stylesheet that holds every token (spec 0003, AC-1). */
export const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css");

export type TokenMap = ReadonlyMap<string, string>;

/** Returns the text between the braces of the first top level rule with this selector. */
function blockFor(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`globals.css has no "${selector}" block`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** Reads every `--name: value;` declaration from one block of globals.css. */
export function readTokens(css: string, selector: ":root" | ".dark"): TokenMap {
  const declarations = blockFor(css, selector).matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  );
  return new Map(
    Array.from(
      declarations,
      ([, name, value]) => [name, value.trim()] as const,
    ),
  );
}

/** Reads the light and dark token maps from the real globals.css. */
export function readThemeTokens(path: string = GLOBALS_CSS_PATH) {
  const css = readFileSync(path, "utf8");
  return { light: readTokens(css, ":root"), dark: readTokens(css, ".dark") };
}
