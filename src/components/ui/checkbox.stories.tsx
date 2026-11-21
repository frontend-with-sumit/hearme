import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Checkbox } from "./checkbox";

const meta = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-1">
      <Checkbox label="I am 18 or older" />
      <Checkbox
        label="I understand this is not crisis support"
        defaultChecked
      />
      <Checkbox label="I agree to the service terms" invalid />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled and checked" disabled defaultChecked />
    </div>
  ),
};

export const LabelIsTheTarget: Story = {
  render: () => <Checkbox label="I am 18 or older" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("I am 18 or older"));
    await expect(canvas.getByRole("checkbox")).toBeChecked();
  },
};

export const SpaceToggles: Story = {
  render: () => <Checkbox label="Send me a reminder" />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", {
      name: "Send me a reminder",
    });
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(box).toBeChecked();
  },
};

/** A bare checkbox (no label prop) must still be reachable and named. */
export const BareWithAriaLabel: Story = {
  render: () => <Checkbox aria-label="Select row" />,
};
