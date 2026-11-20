import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { SkipLink } from "@/components/ui/skip-link";

import { figtree, newsreader } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "HearMe",
  description: "A calm place to be heard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <SkipLink />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex flex-1 flex-col outline-none"
          >
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
