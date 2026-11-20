import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * HearMe's type roles (`--text-<role>` in globals.css). tailwind-merge must
 * know them as font sizes; otherwise it mistakes `text-button` for a colour
 * and drops the real text colour next to it.
 */
const TYPE_ROLES = [
  "display",
  "heading-1",
  "quote",
  "wordmark",
  "wordmark-admin",
  "eyebrow",
  "lead",
  "label",
  "input-text",
  "body-small",
  "helper",
  "button",
  "button-small",
  "pill",
  "badge",
  "card-title",
  "accordion-question",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_ROLES }],
    },
  },
});

/**
 * Joins class names and resolves conflicting Tailwind utilities, so a
 * component's own classes and a caller's `className` combine predictably.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
