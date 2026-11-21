import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { RadioCard, RadioCardGroup } from "./radio-card-group";

const meta = {
  title: "Primitives/Radio card group",
  component: RadioCardGroup,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RadioCardGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const cards = (
  <>
    <RadioCard
      value="30"
      title="30 minutes"
      description="A short, focused conversation"
    />
    <RadioCard
      value="60"
      title="60 minutes"
      description="Room to take your time"
    />
    <RadioCard
      value="disabled"
      title="90 minutes"
      description="Not available"
      disabled
    />
  </>
);

export const States: Story = {
  render: () => (
    <RadioCardGroup
      defaultValue="60"
      aria-label="Session length"
      className="max-w-md"
    >
      {cards}
    </RadioCardGroup>
  ),
};

export const Unselected: Story = {
  render: () => (
    <RadioCardGroup aria-label="Session length" className="max-w-md">
      {cards}
    </RadioCardGroup>
  ),
};

export const Invalid: Story = {
  render: () => (
    <RadioCardGroup aria-label="Session length" className="max-w-md">
      <RadioCard value="30" title="30 minutes" aria-invalid />
      <RadioCard value="60" title="60 minutes" aria-invalid />
    </RadioCardGroup>
  ),
};

export const ArrowKeysMoveAndSelect: Story = {
  render: () => (
    <RadioCardGroup aria-label="Session length" className="max-w-md">
      {cards}
    </RadioCardGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(
      canvas.getByRole("radio", { name: /30 minutes/ }),
    ).toHaveFocus();
    // Radix moves focus on the next tick, so hold the key until it has landed
    // (a real key press lasts long enough; a scripted one does not).
    await userEvent.keyboard("{ArrowDown>}");
    const sixty = canvas.getByRole("radio", { name: /60 minutes/ });
    await waitFor(() => expect(sixty).toHaveFocus());
    await waitFor(() => expect(sixty).toBeChecked());
    await userEvent.keyboard("{/ArrowDown}");
  },
};
