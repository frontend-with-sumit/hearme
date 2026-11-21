"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  /** A visible label is required. The whole row is the click target. */
  label: ReactNode;
};

/**
 * On and off switch on Radix. The off track uses `--input` (3:1 against the
 * page) and the on track `--primary`. The track is 44 by 24px, which was not
 * measured in Figma (see design.md), with a 44px pointer area.
 */
export function Switch({ label, className, id, ...props }: SwitchProps) {
  const generated = useId();
  const controlId = id ?? generated;

  return (
    <label
      htmlFor={controlId}
      className="text-body-small text-foreground flex min-h-11 cursor-pointer items-center gap-3 has-[:disabled]:cursor-not-allowed"
    >
      <SwitchPrimitive.Root
        id={controlId}
        data-slot="switch"
        className={cn(
          "touch-target bg-input data-[state=checked]:bg-primary inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5",
          "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="bg-card block size-5 rounded-full transition-transform duration-150 data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
