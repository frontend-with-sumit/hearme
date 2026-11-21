"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useTheme } from "next-themes";

import { Icon } from "@/components/ui/icon";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const FRAME =
  "border-input bg-card inline-flex h-[52px] items-center rounded-full border-[1.5px] p-1";

/**
 * Three way theme control: Light, Dark or System (the default). The choice is
 * stored by the theme provider in `localStorage` only. Until it mounts it
 * renders an empty frame of the same size, so there is no hydration mismatch
 * and no layout shift. Needs a `ThemeProvider` above it.
 */
export function ThemeControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        data-slot="theme-control-placeholder"
        className={cn(FRAME, "w-[calc(3*5.5rem+0.5rem+3px)]", className)}
      />
    );
  }

  return (
    <RadioGroupPrimitive.Root
      data-slot="theme-control"
      aria-label="Colour theme"
      value={theme ?? "system"}
      onValueChange={setTheme}
      orientation="horizontal"
      className={cn(FRAME, "w-[calc(3*5.5rem+0.5rem+3px)]", className)}
    >
      {OPTIONS.map(({ value, label, icon }) => (
        <RadioGroupPrimitive.Item
          key={value}
          value={value}
          className="text-body-small text-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex h-11 w-[5.5rem] items-center justify-center gap-1.5 rounded-full transition-colors duration-150"
        >
          <Icon icon={icon} size={16} />
          {label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
