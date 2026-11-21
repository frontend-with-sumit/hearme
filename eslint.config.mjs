// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
    // Vendored Agent Skills content, not ours to lint/format:
    ".agents/skills/**",
    ".claude/skills/**",
  ]),
  ...storybook.configs["flat/recommended"],
  {
    // Colours live once, as tokens in src/app/globals.css (spec 0003, AC-1).
    // A raw hex colour in a string or template literal is almost always a
    // token that should be used instead.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/generated/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "No raw hex colours. Use a token from src/app/globals.css (for example bg-primary).",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "No raw hex colours. Use a token from src/app/globals.css (for example bg-primary).",
        },
      ],
    },
  },
]);

export default eslintConfig;
