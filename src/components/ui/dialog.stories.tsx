import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { findSmallHitAreas } from "../../../.storybook/checks";
import {
  emulateReducedMotion,
  settledAnimationCount,
} from "../../../.storybook/motion";
import { Button } from "./button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Primitives/Dialog and Alert dialog",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const AboutDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">What happens in a session?</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>What happens in a session</DialogTitle>
        <DialogDescription>
          You talk, I listen. There is no advice unless you ask for it.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button>Got it</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const CancelDialog = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Cancel booking</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
        <AlertDialogDescription>
          You will be refunded in full. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep booking</AlertDialogCancel>
        <AlertDialogAction variant="destructive">
          Cancel booking
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const ClosedDialog: Story = { render: () => <AboutDialog /> };

export const OpenDialog: Story = {
  render: () => <AboutDialog />,
  // The scrim covers the page while open, so the probe runs on the dialog.
  parameters: { skipHitAreaCheck: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /what happens/i }),
    );
    const dialog = await screen.findByRole("dialog");
    // Measure only once the open animation has finished (it scales the card).
    await waitFor(() => expect(settledAnimationCount()).resolves.toBe(0));
    await expect(findSmallHitAreas(dialog)).toEqual([]);
  },
};

export const DialogFocusAndEscape: Story = {
  render: () => <AboutDialog />,
  parameters: { skipHitAreaCheck: true },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: /what happens/i,
    });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    // Focus moves inside and stays there when tabbing past the last control.
    await expect(dialog).toContainElement(
      document.activeElement as HTMLElement,
    );
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(dialog).toContainElement(
      document.activeElement as HTMLElement,
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const OpenAlertDialog: Story = {
  render: () => <CancelDialog />,
  parameters: { skipHitAreaCheck: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Cancel booking" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    // Measure only once the open animation has finished (it scales the card).
    await waitFor(() => expect(settledAnimationCount()).resolves.toBe(0));
    await expect(findSmallHitAreas(dialog)).toEqual([]);
    // Focus starts on the safe choice.
    await expect(
      within(dialog).getByRole("button", { name: "Keep booking" }),
    ).toHaveFocus();
  },
};

export const ReducedMotionDialog: Story = {
  parameters: { skipHitAreaCheck: true },
  render: () => (
    <div className="flex gap-3">
      <AboutDialog />
      <CancelDialog />
    </div>
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
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /what happens/i }),
    );
    await screen.findByRole("dialog");
    await expect(await settledAnimationCount()).toBe(0);
  },
};
