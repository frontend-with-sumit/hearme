import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { SkipLink } from "./skip-link";

const meta = {
  title: "Primitives/Skip link",
  component: SkipLink,
  // Hidden until focused, so the pointer probe has nothing on screen to test.
  parameters: { skipHitAreaCheck: true },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FocusReveals: Story = {
  render: () => (
    <>
      <SkipLink />
      <button type="button">Something else</button>
      <main id="main-content" tabIndex={-1} className="mt-8 outline-none">
        <h1 className="text-heading-1 font-serif">Main content</h1>
      </main>
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const link = canvas.getByRole("link", { name: "Skip to main content" });
    await expect(link).toHaveFocus();
    await expect(link.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    // Following the link moves focus to #main-content. That needs a real page
    // navigation, so the Playwright check on the built app covers it (AC-15).
    await expect(link).toHaveAttribute("href", "#main-content");
  },
};
