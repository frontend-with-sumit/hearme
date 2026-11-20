import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "./button";
import { Icon } from "./icon";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Book a session" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

/** Every variant and size side by side, plus the disabled and loading states. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      {(["primary", "outline", "ghost", "link", "destructive"] as const).map(
        (variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-3">
            <Button variant={variant}>{variant}</Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} loading>
              Loading
            </Button>
          </div>
        ),
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg">Large 54</Button>
        <Button size="md">Medium 48</Button>
        <Button size="sm">Small 40</Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Previous month"
          icon={<Icon icon={ChevronLeft} size={20} />}
        />
        <Button
          size="icon"
          aria-label="Next"
          icon={<Icon icon={ArrowRight} size={20} />}
        />
      </div>
    </div>
  ),
};

export const AsLink: Story = {
  render: () => (
    <Button asChild variant="outline">
      <a href="#main-content">Skip ahead</a>
    </Button>
  ),
};

export const KeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const button = canvas.getByRole("button", { name: "Book a session" });
    await expect(button).toHaveFocus();
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(getComputedStyle(button).outlineWidth).toBe("2px");
  },
};

export const LoadingIgnoresClicks: Story = {
  args: {
    loading: true,
    onClick: () => {
      throw new Error("clicked while loading");
    },
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
  },
};
