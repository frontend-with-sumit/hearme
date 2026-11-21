import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  emulateReducedMotion,
  settledAnimationCount,
} from "../../../.storybook/motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

const meta = {
  title: "Primitives/Accordion",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const faq = (
  <>
    <AccordionItem value="recorded">
      <AccordionTrigger>Are sessions recorded?</AccordionTrigger>
      <AccordionContent>
        Never. Sessions are live on Google Meet and nothing is saved.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="refund">
      <AccordionTrigger>Can I get a refund?</AccordionTrigger>
      <AccordionContent>
        Yes, if you cancel at least 24 hours before your session.
      </AccordionContent>
    </AccordionItem>
  </>
);

export const Closed: Story = {
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      {faq}
    </Accordion>
  ),
};

export const Open: Story = {
  render: () => (
    <Accordion
      type="single"
      collapsible
      defaultValue="recorded"
      className="max-w-md"
    >
      {faq}
    </Accordion>
  ),
};

export const KeyboardToggle: Story = {
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      {faq}
    </Accordion>
  ),
  play: async ({ canvasElement }) => {
    const first = within(canvasElement).getByRole("button", {
      name: "Are sessions recorded?",
    });
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard(" ");
    await expect(first).toHaveAttribute("aria-expanded", "false");
  },
};

/** With reduced motion on, nothing is left animating after a toggle. */
export const ReducedMotion: Story = {
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      {faq}
    </Accordion>
  ),
  beforeEach: async () => {
    await emulateReducedMotion(true);
    return async () => {
      await emulateReducedMotion(false);
    };
  },
  play: async ({ canvasElement }) => {
    // Prove the setting really is on before relying on the result.
    if (await emulateReducedMotion(true)) {
      await expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(
        true,
      );
    }
    const first = within(canvasElement).getByRole("button", {
      name: "Are sessions recorded?",
    });
    await userEvent.click(first);
    await expect(await settledAnimationCount()).toBe(0);
  },
};
