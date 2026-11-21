import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The icon sizes used in the Figma frames, in CSS pixels. */
const ICON_SIZES = {
  16: "size-4",
  18: "size-[18px]",
  20: "size-5",
  22: "size-[22px]",
  28: "size-7",
} as const;

export type IconSize = keyof typeof ICON_SIZES;

type IconProps = {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  /** Gives the icon an accessible name. Leave it out for decorative icons. */
  label?: string;
};

/**
 * Renders a `lucide-react` icon at one of the Figma sizes. Icons are
 * decorative (hidden from assistive technology) unless a `label` is given.
 * All icons in the app come from `lucide-react` (spec 0003, AC-11).
 */
export function Icon({ icon: Glyph, size = 20, className, label }: IconProps) {
  return (
    <Glyph
      className={cn("shrink-0", ICON_SIZES[size], className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
