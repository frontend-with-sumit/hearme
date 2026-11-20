import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * "Skip to main content" link. It is the first focusable element on the page,
 * is visible only while focused, and moves focus to the element named by
 * `href` (the layout's `<main id="main-content" tabIndex={-1}>`).
 */
export function SkipLink({
  href = "#main-content",
  className,
  children = "Skip to main content",
  ...props
}: ComponentProps<"a">) {
  return (
    <a
      href={href}
      data-slot="skip-link"
      className={cn(
        "bg-primary text-primary-foreground text-button rounded-full px-5 py-3 font-sans",
        "fixed top-3 left-3 z-50 -translate-y-[200%] focus-visible:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
