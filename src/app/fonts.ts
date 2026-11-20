import localFont from "next/font/local";

/**
 * The two HearMe typefaces, served from this app's own origin (spec 0003,
 * AC-2). The files are Latin subset variable fonts under the SIL Open Font
 * License, committed beside their licence text, so no build, deploy or
 * Storybook run needs a request to Google. `display: "swap"` plus Next's
 * automatic fallback adjustment stops text jumping when the fonts load.
 * Newsreader's optical size axis is left on `auto`, so the browser picks the
 * right cut for each size, which is what matches the Figma render.
 */
export const newsreader = localFont({
  src: [
    {
      path: "./fonts/Newsreader-Variable.woff2",
      style: "normal",
      weight: "200 800",
    },
    {
      path: "./fonts/Newsreader-Italic-Variable.woff2",
      style: "italic",
      weight: "200 800",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const figtree = localFont({
  src: [
    {
      path: "./fonts/Figtree-Variable.woff2",
      style: "normal",
      weight: "300 900",
    },
  ],
  variable: "--font-figtree",
  display: "swap",
  adjustFontFallback: "Arial",
});
