import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Field } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";

const meta = {
  title: "Primitives/Field, Input and Textarea",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default, with helper text, optional marker, invalid, and disabled. */
export const InputStates: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Field label="Your name">
        <Input placeholder="First name is enough" />
      </Field>
      <Field label="Email" helper="We only use this to send your confirmation.">
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field label="Phone" optional>
        <Input type="tel" />
      </Field>
      <Field label="Email" error="Enter an email like name@example.com">
        <Input type="email" defaultValue="not an email" />
      </Field>
      <Field label="Name" helper="Locked while we confirm your slot.">
        <Input defaultValue="Asha" disabled />
      </Field>
    </div>
  ),
};

export const InvalidIsDescribed: Story = {
  render: () => (
    <Field
      label="Email"
      helper="Used for your confirmation."
      error="Enter a valid email"
    >
      <Input type="email" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText(/email/i);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ");
    await expect(described).toHaveLength(2);
    await expect(
      canvasElement.querySelector(`#${CSS.escape(described[1])}`),
    ).toHaveTextContent("Enter a valid email");
  },
};

export const LabelFocusesInput: Story = {
  render: () => (
    <Field label="Your name">
      <Input />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Your name"));
    await expect(
      canvas.getByRole("textbox", { name: "Your name" }),
    ).toHaveFocus();
  },
};

export const TextareaWithCounter: Story = {
  render: () => (
    <Field
      label="What would you like to talk about?"
      helper="Optional. Share only what you want to."
      optional
    >
      <Textarea
        maxLength={280}
        showCount
        defaultValue="I have been feeling overwhelmed lately."
      />
    </Field>
  ),
};

/** The visible counter is hidden from screen readers; a live region speaks at 20 left and at 0. */
export const TextareaAnnounces: Story = {
  render: () => (
    <Field label="Note">
      <Textarea maxLength={30} showCount />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole("textbox", { name: "Note" });
    const live = canvasElement.querySelector("[role=status]") as HTMLElement;
    await userEvent.type(box, "a".repeat(9));
    await expect(live).toHaveTextContent("");
    await userEvent.type(box, "a");
    await expect(live).toHaveTextContent("20 characters remaining");
    await userEvent.type(box, "a".repeat(20));
    await expect(live).toHaveTextContent("Character limit reached");
    await expect(
      canvasElement.querySelector("[data-slot=textarea-count]"),
    ).toHaveAttribute("aria-hidden", "true");
  },
};

export const TextareaInvalid: Story = {
  render: () => (
    <Field label="Note" error="Tell us a little more, or leave this blank">
      <Textarea />
    </Field>
  ),
};
