"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Pill shaped button styles. Hover and pressed use the `--primary-hover` and
 * `--primary-active` tokens for filled buttons and `--secondary` for outline
 * and ghost. The focus outline comes from the global `:focus-visible` rule.
 */
export const buttonVariants = cva(
  [
    "touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap select-none",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        outline:
          "border-input text-foreground hover:bg-secondary active:bg-secondary border-[1.5px] bg-transparent",
        ghost:
          "text-foreground hover:bg-secondary active:bg-secondary bg-transparent",
        link: "text-primary hover:text-primary-hover underline underline-offset-4",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90",
      },
      size: {
        lg: "text-button h-[54px] px-8",
        md: "text-button h-12 px-6",
        sm: "text-button-small h-10 px-5",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type BaseProps = Omit<ComponentProps<"button">, "children"> &
  Pick<VariantProps<typeof buttonVariants>, "variant"> & {
    /** Renders the single child element as the button (for links). Bypasses the icon size rules. */
    asChild?: boolean;
    /** Shows a spinner, keeps the label, sets `aria-busy` and ignores clicks. */
    loading?: boolean;
  };

type TextButtonProps = BaseProps & {
  size?: "lg" | "md" | "sm";
  children?: ReactNode;
};

/**
 * Icon buttons have no visible text, so they must carry an `aria-label` and
 * take their glyph from the `icon` prop, never from children. `asChild`
 * bypasses this (the child element supplies its own content).
 */
type IconButtonProps = BaseProps & {
  size: "icon";
  "aria-label": string;
  icon: ReactNode;
  children?: never;
};

export type ButtonProps = TextButtonProps | IconButtonProps;

/**
 * HearMe's button: five variants (primary, outline, ghost, link, destructive),
 * sizes lg 54px, md 48px, sm 40px and icon, all pill shaped, with a 44px
 * minimum pointer area. Spec 0003, AC-6 to AC-9.
 */
export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  className,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const { children, icon, ...rest } = props as typeof props & {
    icon?: ReactNode;
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : "button"}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={handleClick}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <Icon
              icon={Loader2}
              size={size === "sm" ? 16 : 20}
              className="animate-spin"
            />
          ) : undefined}
          {size === "icon" ? icon : children}
        </>
      )}
    </Comp>
  );
}
