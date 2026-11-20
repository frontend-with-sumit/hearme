"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A group of selectable cards on Radix's radio group: arrow keys move and select. */
export function RadioCardGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-card-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  );
}

type RadioCardProps = ComponentProps<typeof RadioGroupPrimitive.Item> & {
  title: ReactNode;
  description?: ReactNode;
};

/**
 * One card in a RadioCardGroup, 88px tall. The whole card is the target.
 * Selected is shown by a thicker `--primary` border and a filled radio, never
 * colour alone.
 */
export function RadioCard({
  title,
  description,
  className,
  ...props
}: RadioCardProps) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        "bg-card text-card-foreground border-input flex min-h-[88px] w-full items-center gap-4 rounded-control border-[1.5px] p-4 text-left",
        "transition-colors duration-150",
        "data-[state=checked]:border-primary data-[state=checked]:p-[calc(1rem-0.5px)] data-[state=checked]:border-2",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="border-input group-data-[state=checked]:border-primary flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] [[data-state=checked]_&]:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="bg-primary block size-3 rounded-full" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label">{title}</span>
        {description ? (
          <span className="text-helper text-muted-foreground">
            {description}
          </span>
        ) : undefined}
      </span>
    </RadioGroupPrimitive.Item>
  );
}
