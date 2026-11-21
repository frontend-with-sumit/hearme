"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & {
  /** Visible label. The whole row is the click target. Without it, pass `aria-label`. */
  label?: ReactNode;
  invalid?: boolean;
};

/**
 * 22px checkbox on Radix, with a 44px pointer area. With a `label` it renders
 * a full row, so the text is part of the target. The visible box stays 22px.
 */
export function Checkbox({
  label,
  invalid,
  className,
  id,
  ...props
}: CheckboxProps) {
  const generated = useId();
  const controlId = id ?? generated;

  const box = (
    <CheckboxPrimitive.Root
      id={controlId}
      data-slot="checkbox"
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(
        "touch-target bg-card border-input flex size-[22px] shrink-0 items-center justify-center rounded-checkbox border-[1.5px]",
        "transition-colors duration-150",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        "aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Icon icon={Check} size={16} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label) return box;

  return (
    <label
      htmlFor={controlId}
      className="text-body-small text-foreground flex min-h-11 cursor-pointer items-center gap-3 has-[:disabled]:cursor-not-allowed"
    >
      {box}
      <span>{label}</span>
    </label>
  );
}
