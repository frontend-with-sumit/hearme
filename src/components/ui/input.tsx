import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input"> & {
  /** Marks the field as invalid: red border and `aria-invalid`. Pair it with Field's error text. */
  invalid?: boolean;
};

/**
 * Text input, 52px tall with a 1.5px `--input` border on the `--card` fill.
 * Use it inside `Field`, which supplies the label and wires the messages.
 */
export function Input({
  className,
  type = "text",
  invalid,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      type={type}
      data-slot="input"
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(
        "bg-card text-input-text text-card-foreground border-input h-[52px] w-full min-w-0 rounded-control border-[1.5px] px-4",
        "placeholder:text-muted-foreground transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
    />
  );
}
