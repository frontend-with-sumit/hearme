import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "text-helper flex w-full items-start gap-3 rounded-alert p-3.5",
  {
    variants: {
      tone: {
        info: "bg-secondary text-secondary-foreground",
        warning: "bg-warning text-warning-foreground",
        danger: "bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const ICONS: Record<"info" | "warning" | "danger", LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
};

type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/**
 * A short notice with an 18px icon and 13px text. Every tone has an icon, so
 * colour is never the only signal. Danger uses `role="alert"`, the others
 * `role="status"`.
 */
export function Alert({
  tone = "info",
  className,
  children,
  ...props
}: AlertProps) {
  const resolved = tone ?? "info";
  return (
    <div
      data-slot="alert"
      data-tone={resolved}
      role={resolved === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone: resolved }), className)}
      {...props}
    >
      <Icon icon={ICONS[resolved]} size={18} className="mt-px" />
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-semibold", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p data-slot="alert-description" className={cn(className)} {...props} />
  );
}
