import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "bg-card text-card-foreground border-border flex flex-col border",
  {
    variants: {
      /** Admin cards use the 18px radius, feature cards the 22px one. */
      radius: { card: "rounded-card", feature: "rounded-feature" },
      padding: { none: "", md: "p-5", lg: "p-6 sm:p-8" },
    },
    defaultVariants: { radius: "card", padding: "md" },
  },
);

type CardProps = ComponentProps<"div"> & VariantProps<typeof cardVariants>;

/** A `--card` surface with a 1px `--border`. Compose with the Card parts below. */
export function Card({ radius, padding, className, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ radius, padding }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

/** Pass `as` to pick the heading level that fits the page outline. */
export function CardTitle({
  as: Heading = "h3",
  className,
  ...props
}: ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Heading
      data-slot="card-title"
      className={cn("text-card-title text-card-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-body-small text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("mt-4 flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}
