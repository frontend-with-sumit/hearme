import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type PillProps = ComponentProps<"span"> & { icon?: LucideIcon };

/** A 34px tall rounded label on `--secondary`. Static text, not focusable. */
export function Pill({ icon, className, children, ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "bg-secondary text-secondary-foreground text-pill inline-flex h-[34px] items-center gap-2 rounded-full px-4",
        className,
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : undefined}
      {children}
    </span>
  );
}
