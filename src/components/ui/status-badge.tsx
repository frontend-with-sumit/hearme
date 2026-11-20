import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "text-badge inline-flex h-6 items-center rounded-full px-3 whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning text-warning-strong",
        danger: "bg-destructive-soft text-destructive",
        neutral: "bg-neutral-soft text-neutral-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusBadgeProps = ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants>;

/**
 * A 24px status label such as "Paid" or "Hold expired". The words always
 * carry the meaning; the tone colour only supports them.
 */
export function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone ?? "neutral"}
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    />
  );
}
