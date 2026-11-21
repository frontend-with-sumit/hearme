"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps `next-themes` with HearMe's fixed settings (spec 0003, AC-5): a
 * `.dark` class on `<html>`, system preference by default, and the choice
 * kept only in `localStorage` under `theme` on this site's own origin. It
 * never writes a cookie and nothing is sent to the server. `next-themes`
 * injects a tiny inline script that sets the class before first paint, so a
 * page never flashes the wrong theme.
 */
export function ThemeProvider({
  children,
  ...props
}: Omit<
  ComponentProps<typeof NextThemesProvider>,
  "attribute" | "storageKey" | "defaultTheme" | "enableSystem"
>) {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey="theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
