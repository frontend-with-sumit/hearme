import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ThemeProvider } from "../theme-provider";
import { ThemeControl } from "./theme-control";

const meta = {
  title: "Primitives/Theme control",
  component: ThemeControl,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChoosingStoresInLocalStorageOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dark = await canvas.findByRole("radio", { name: "Dark" });
    await userEvent.click(dark);
    await waitFor(() => expect(localStorage.getItem("theme")).toBe("dark"));
    await expect(document.cookie).toBe("");
    await userEvent.click(canvas.getByRole("radio", { name: "System" }));
    await waitFor(() => expect(localStorage.getItem("theme")).toBe("system"));
  },
};
