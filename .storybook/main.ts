import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Storybook shows every primitive in every state (spec 0003, AC-13). It is a
 * separate build: nothing here is part of `pnpm build` or the Vercel deploy.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: "@storybook/nextjs-vite",
  viteFinal: async (viteConfig) => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
