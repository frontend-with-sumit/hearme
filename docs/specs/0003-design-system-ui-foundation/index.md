# 0003. Design system and UI foundation

**Date**: 2026-11-20
**Status**: In Progress

## Summary

This turns the HearMe look from the Figma file into code every screen can share: colours, two fonts (Newsreader and Figtree), spacing and shape rules, and a set of basic accessible building blocks (buttons, form fields, badges, cards, dialogs and so on). It works in light and dark, follows the system setting, and also has a manual switch. Storybook (a separate page that shows every component in every state) runs an automatic accessibility check on every story, and a few browser tests check the real app. The Figma file has no focus, error, hover or dark designs and a few colours that fail accessibility rules, so this spec decides those and records each difference from Figma.

## Requirements

**User stories**:
- As a visitor, I want every screen to look like one calm product and be usable by keyboard, screen reader, large text and phone thumbs, so that nothing about the interface adds to a hard moment.
- As the listener (the admin), I want her dashboard to use the same system as the public site, so that nothing feels bolted on.
- As the builder, I want tokens and components defined once, with their states shown and checked automatically, so that each later feature assembles screens instead of inventing styles.

**Acceptance criteria** (the contract, each independently checkable):
- **AC-1**: HearMe's colour, radius, shadow and type values exist once, as theme variables in `src/app/globals.css`: colours as 6 digit hex under `:root` (light) and `.dark`, using the shadcn semantic names plus the HearMe additions in the token tables below; radii, type roles and fonts under `@theme` using the names in the Naming section. `shadcn init` runs before any token is written (it overwrites `globals.css`), and its `oklch()` values and chart tokens are replaced. No raw hex colour appears in any `.ts` or `.tsx` file under `src/` except `src/generated/**`, enforced by an ESLint `no-restricted-syntax` rule on string and template literals matching `#[0-9a-fA-F]{3,8}\b`; a Vitest test asserts `globals.css` is the only `.css` file under `src/`. The create-next-app defaults (Geist fonts, the plain white and near black variables, the Arial body font) are gone.
- **AC-2**: Newsreader (upright and italic) and Figtree load through `next/font/local` from committed Latin subset variable font files in `src/app/fonts/` (the files are SIL Open Font License, with their licence text beside them), declared once in `src/app/fonts.ts` and used by both `layout.tsx` and the Storybook preview. They are served from the app's own origin. No build step, Vercel build or Storybook run needs a network request to Google. Fonts use `display: swap` with Next's automatic fallback adjustment, so text does not jump when they load. Optical size and weight are set so the rendered text matches the Figma render (compare the hero at 1440px with the Figma screenshot before accepting).
- **AC-3**: The type roles measured in Figma (display, heading 1, quote, wordmark, eyebrow, lead, input text, label, helper, button, small button, pill, badge, card title; see the Type roles table) are defined in code and in `design.md` with the measured size, weight, line height and tracking. Roles not yet measured are listed in `design.md` as "TBD, Figma node X" and get no invented value. The display role scales fluidly: `clamp(2.75rem, 1.6rem + 4.7vw, 4.75rem)` (44px at 390px, 76px at 1440px). At a 320px viewport and at 200 percent zoom, every story fits without horizontal scrolling (`scrollWidth <= clientWidth`) and without clipped text.
- **AC-4**: Every pair in the Contrast pairs table meets its minimum ratio, in the light values and in the dark values, unless the row names one theme. A Vitest test copies that table as its fixture, reads the hex values from the `:root` and `.dark` blocks of `globals.css` with a regular expression (no new dependency), and fails on any miss or any pair token that is missing. Dark values that miss are adjusted only by changing lightness in 2 percent steps (OKLCH) until they pass, and each change is recorded in `design.md`'s differences table.
- **AC-5**: Dark mode exists with the dark tokens below, applied through a `.dark` class on `<html>`. The default follows `prefers-color-scheme`. A visible three way control (Light, Dark, System) overrides it; the choice is stored only in `localStorage` under the key `theme` on that site's own origin (so `hearme.com` and `admin.hearme.com` keep separate choices, which is intended), never in a cookie, never sent to the server. A page load never flashes the wrong theme: the check sets the browser to dark, seeds `localStorage`, blocks `/_next/static/chunks/**`, and asserts `html.dark` is present at `domcontentloaded`. The admin sidebar is a dark surface in both themes and sets `data-surface="sidebar"`, which redefines `--ring`, `--foreground`, `--muted-foreground` and `--border` for everything inside it. The theme control renders a same sized placeholder until it mounts, so it causes no hydration mismatch.
- **AC-6**: These primitives exist in `src/components/ui/`: Button, Input, Textarea (with character counter), Field (label, helper text, error text, optional marker), Checkbox, Radio card group, Switch, Pill, Status badge, Card, Alert, Accordion, Dialog and Alert dialog, Table, Separator, Skip link and Theme control. Button, Input, Textarea, Checkbox, Switch, Card, Alert, Accordion, Dialog, Alert dialog, Table, Separator and the radio parts start from the shadcn CLI on Radix and are restyled to the tokens; Field, Radio card, Pill, Status badge, Skip link and Theme control are hand built compositions of those parts. Feature specific pieces (calendar, slot picker, stepper, stat card, sidebar, hold timer) are not built here.
- **AC-7**: Each primitive defines and renders every state that applies: default, hover, focus visible, pressed, disabled, invalid, selected or checked, loading (Button only). Hover and pressed use the `--primary-hover` and `--primary-active` tokens for filled buttons and `--secondary` for outline and ghost; disabled is 50 percent opacity with `cursor-not-allowed`; no state uses a colour with transparency that the contrast test cannot read. Focus is a 2px outline in `--ring` with a 2px offset (not a box shadow), and in Windows forced colors mode it becomes a system colour with the outline still 2px wide and not `none`. Errors always pair colour with an icon and text, never colour alone. Button has a `destructive` variant (`--destructive` fill, `--destructive-foreground` text) for cancel and refund confirmations.
- **AC-8**: Every interactive primitive responds to pointer input over at least a 44 by 44 CSS pixel area, even where the Figma visual is smaller (admin buttons 40px, checkbox 22px, calendar day 42px, month arrows 40px). The visible size stays as designed; the hit area is extended with the element's own padding or a pseudo element, and controls inside clipping containers (Card, Table, Dialog) are covered by a story. Links inside running sentences are exempt. The check, inside `#storybook-root`, takes every `button, a[href]` (except links inside a paragraph), `input:not([type=hidden])`, `[role=radio]`, `[role=checkbox]` and `[role=switch]`, calls `document.elementFromPoint` at the four points 21.75px from its centre along each axis, and passes when the result is the control, one of its descendants, or its associated `label`.
- **AC-9**: Every primitive works by keyboard with the expected keys (Tab order, Space and Enter, arrow keys inside the radio group, Escape closing dialogs), traps and restores focus in dialogs, associates every label and message with its control (`aria-describedby`, `aria-invalid`), and exposes an accessible name. Button's `size="icon"` is a discriminated union that requires `aria-label` and forbids children, proved by a `button.type-test.ts` using `@ts-expect-error` and checked by `pnpm typecheck` (`asChild` bypasses it, which the file notes). Field always renders its error text tied to the control with `aria-describedby` and `aria-invalid`; announcing errors on submit belongs to the later form specs. The Textarea counter is `aria-hidden` and a separate visually hidden live region announces when 20 characters remain and at 0. The layout renders `<main id="main-content" tabIndex={-1}>`, the Skip link is the first focusable element and moves focus to it, and later specs must not add a second `<main>`.
- **AC-10**: Transitions last 200ms or less and animate only colour, opacity and transform (the Accordion fades and does not animate height). With `prefers-reduced-motion: reduce`, after opening each overlay and disclosure story `document.getAnimations().length` is 0. Nothing plays automatically.
- **AC-11**: Icons come only from `lucide-react`, sized to the Figma sizes (16, 18, 20, 22, 28). Decorative icons are hidden from assistive technology. `design.md` lists the Lucide icon chosen for each Figma icon, matched by the icon names in the Figma frames.
- **AC-12**: `design.md` at the repo root documents the tokens (light and dark), type roles, spacing, radii, shadow, component states, accessibility rules, every difference from Figma with its reason, and the Figma file key and node ids as the source of truth for light mode (dark is marked derived). Its `## Tokens` tables have a backticked `--name` in the first column. A Vitest test requires that set to equal the custom properties declared in `:root` and `.dark` of `globals.css` (not those under `@theme`).
- **AC-13**: Storybook (the `@storybook/nextjs-vite` framework, with Tailwind through `@tailwindcss/vite`, the a11y addon, `@storybook/addon-themes` for light and dark, and `@storybook/addon-vitest`) shows every primitive in every state in both themes. It runs with `pnpm storybook` and builds with `pnpm build-storybook`. It is not part of `pnpm build` or the Vercel deploy: after `pnpm build`, a search of `.next/static` for the word `storybook` finds nothing.
- **AC-14**: CI runs every story through axe in Vitest browser mode (`parameters.a11y.test: "error"`, WCAG 2.2 A and AA tags), in light and dark; any serious or critical violation fails CI. The keyboard checks (AC-9), the hit area probe (AC-8), the reflow check (AC-3) and the reduced motion check (AC-10) run as shared helpers from the same story tests. CI installs the Chromium browser with `pnpm exec playwright install --with-deps chromium`.
- **AC-15**: App level checks run in Playwright (`e2e/**/*.spec.ts`, kept out of Vitest's `src/**/*.test.ts` include) against `next build` and `next start` with dummy CI only env values (32 byte base64 `KEK_V1` and `HMAC_KEY_V1`, `CURRENT_KEK_VERSION=v1`, `CURRENT_HMAC_KEY_VERSION=v1`, local `DATABASE_URL` and `DIRECT_URL`) added to `ci.yml`. On `/`: zero requests to any other origin for fonts, icons or styles; switching theme sets no cookie; the no flash check from AC-5 passes; and focusing the Skip link shows the 2px outline under forced colors (`emulateMedia({ forcedColors: "active" })`).
- **AC-16**: `src/app/layout.tsx` uses the fonts from `src/app/fonts.ts`, sets `lang="en"`, mounts the theme provider with `suppressHydrationWarning` on `<html>`, applies `--background` and `--foreground` to the body, renders the Skip link and the `<main>` target. The placeholder page keeps working in both themes. Page content (landing and the rest) stays with the later feature specs.

## Decision

**Chosen option**: Option 1: shadcn/ui on Radix with Tailwind v4 tokens, local fonts, Storybook with automatic accessibility tests, and Playwright for app level checks

Build the design system as tokens in `globals.css`, shadcn components copied into the repo and restyled to them, a Storybook that shows every state with axe run on every story in CI, and a few Playwright checks against the real built app. Light mode follows Figma; dark mode is derived and clearly marked as such. (basis: your `AGENTS.md` WCAG 2.2 AA rule, spec 0001's UI row, the copy in component kit model, WCAG 1.4.3 and 1.4.11)

**Implementation skills**: `shadcn` (`shadcn-ui/ui`, `.agents/skills/shadcn/`) · `storybook-init` (`storybookjs/storybook`, `.agents/skills/storybook-init/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`) · `tailwind-design-system` (`wshobson/agents`, `.agents/skills/tailwind-design-system/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

**Design source**: Figma file `HpHZNlRSHt2aec0CflECzs` (pages: Public site `0:1`, Booking flow `3:2`, Admin `3:3`), read through the Figma connection on 2026-11-20. The file defines no Figma variables, so every value below was read from the frames themselves.

**Reasoning and options**: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: none. No database table, column or migration changes.

**State transitions**: none for data. The theme preference has three values (`light`, `dark`, `system`), default `system`.

**Interface surface** (this spec defines no HTTP endpoints; the surface is the component API plus the tokens):

| Component | Key props | Variants and sizes (Figma) | Accessibility contract |
|---|---|---|---|
| Button | `variant` (primary, outline, ghost, link, destructive), `size` (lg 54px, md 48px, sm 40px, icon), `loading`, `asChild` | All pill shaped (999px); icon size requires `aria-label` and has no children | Native `button`; 44px hit area; `aria-busy` when loading, label kept |
| Input | standard input props, `invalid` | Height 52px, radius 14px, 1.5px `--input` border, `--card` fill, 16px Figtree Medium | Used only inside Field; `aria-invalid`; visible focus outline |
| Textarea | `maxLength`, `showCount` | Min height 96px, same style as Input; counter "54 / 280" right aligned 12px | Visible counter `aria-hidden`; hidden live region announces at 20 left and at 0 |
| Field | `label`, `helper`, `error`, `optional` | Label 15px SemiBold, helper 13px muted, 8px gap | Wires `htmlFor`, `aria-describedby`, `aria-invalid`; error has icon and text |
| Checkbox | `checked`, `onCheckedChange` | 22px box, radius 5px, `--primary` fill with `--primary-foreground` check | Radix checkbox; 44px row hit area; label is the click target |
| RadioCardGroup, RadioCard | `value`, `onValueChange` | 88px tall card, radius 14px, 1.5px border; selected: 2px `--primary` border with filled radio | Radix radio group; arrow keys move and select; whole card is the target |
| Switch | `checked`, `onCheckedChange` | Off track `--input`, on track `--primary` | Radix switch; visible label required |
| Pill | `icon`, children | Height 34px, `--secondary` fill, 14px Medium, radius 999px | Static text; not focusable unless a link |
| StatusBadge | `tone`: success, warning, danger, neutral | Height 24px, 12px SemiBold | Text always present; tone never the only signal |
| Card | `padding` | `--card`, 1px `--border`, radius 18px (admin) or 22px (feature card) | Landmark only when given a heading |
| Alert | `tone`: info, warning, danger | `--warning` fill, 12px radius, 18px icon, 13px text (the note warning) | `role="status"`; danger uses `role="alert"` |
| Accordion | Radix accordion | Question 18px, hairline dividers, 22px chevron | Radix semantics; button per header; Enter and Space toggle; fades, no height animation |
| Dialog, AlertDialog | Radix dialog | Centred card, scrim, radius 22px | Traps focus, Escape closes (Dialog), restores focus; AlertDialog for cancel and refund confirms with the destructive Button |
| Table | semantic `table` parts | Header row, hairline rows | Real `th scope`; no layout tables |
| Separator | `orientation` | 1px `--border` | Decorative by default |
| SkipLink | `href` | Visible only on focus | First focusable element; moves focus to `#main-content` |
| ThemeControl | none | Three option control: Light, Dark, System | Radio group semantics; same size placeholder until mounted |

**Value sourcing** (where every value an acceptance criterion needs comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Render light colours | Every light token in the tables below | Figma frames (node ids in `rationale.md`); deviations in the Figma differences table |
| Render dark colours | Every dark token | Derived in this spec from the admin sidebar tones (`#1e2b29`, `#26352f`, `#2f403c`, `#a9cbbe`); checked by the contrast test |
| Hover and pressed colours | `--primary-hover`, `--primary-active` | Decided here (starting values in the token tables, adjusted only by the AC-4 rule) |
| Pick the theme | `light`, `dark` or `system` | `localStorage` key `theme` on the current origin; `prefers-color-scheme` when absent or `system` |
| Focus and error styles | Ring colour, error colours | Decided here (engineer choice): `--ring` equals `--primary` in light and mint in dark; error is `--destructive` on `--destructive-soft` plus icon and text |
| Fonts | Newsreader and Figtree files | Variable Latin subset files committed in `src/app/fonts/`, downloaded once from Google Fonts (SIL Open Font License) at build task 2 |
| Type sizes | Measured role values | Figma frames: hero `5:14`, step title `4:181`, quote `5:53`, labels `4:189`; unmeasured roles are "TBD" in `design.md` |
| Display phone size | `clamp(2.75rem, 1.6rem + 4.7vw, 4.75rem)` | Decided here (44px at 390px, 76px at 1440px) |
| Hit area | 44px minimum | `AGENTS.md` rule (WCAG 2.2 AA, 44px touch targets) |
| Icons | Lucide icon per Figma icon | Mapping table written into `design.md` at build task 8 by matching the icon names in the Figma frames |
| Sidebar surface | Own ring, text and border values | `data-surface="sidebar"` scope redefines `--ring`, `--foreground`, `--muted-foreground`, `--border` (the light ring `#355e52` is only 2.0 on `#1e2b29`) |
| Spacing | 4px base scale plus half steps | Tailwind v4 default spacing; Figma 6, 10, 14, 18, 22 are 1.5, 2.5, 3.5, 4.5, 5.5 steps |
| Story themes | Light and dark per story | `@storybook/addon-themes` `withThemeByClassName`, global `theme` |
| CI app env | Dummy encryption keys, database URLs | Constants in `.github/workflows/ci.yml`, never real secrets |

**Naming**:
- Radii: `--radius-control` 14px, `--radius-alert` 12px, `--radius-card` 18px, `--radius-calendar` 20px, `--radius-feature` 22px, `--radius-checkbox` 5px; fully round is Tailwind's `rounded-full`.
- Type roles: `--text-<role>` plus `--text-<role>--line-height`, `--text-<role>--letter-spacing` and `--text-<role>--font-weight` under `@theme`, roles named as in the Type roles table.
- Fonts: `--font-serif` (Newsreader) and `--font-sans` (Figtree), fed from the `variable` option of each `next/font/local` call.
- shadcn compatibility: `--muted` equals `--secondary`; `--popover` equals `--card` and `--popover-foreground` equals `--card-foreground`; shadcn's ghost and outline hover is restyled to `--secondary` because `--accent` here is the hero arch colour; chart tokens are deleted.

**Type roles (measured in Figma)**:

| Role | Font | Size and line height | Weight and tracking | Figma node |
|---|---|---|---|---|
| display | Newsreader | 76px (fluid below desktop), 1.02 | 400, -0.02em; italic emphasis in `--primary` | `5:14` |
| heading 1 (booking steps) | Newsreader | 32px, 1.1 | 400 | `4:181` |
| quote | Newsreader italic | 21px, 1.45 | 400 | `5:53` |
| wordmark | Newsreader italic | 22px (26px in admin) | 400; "me" in `--primary` (mint in sidebar) | `4:176`, `7:150` |
| eyebrow | Figtree | 13px | 600, uppercase, +0.09em | `5:13` |
| lead | Figtree | 20px, 1.6 | 400 | `5:15` |
| label | Figtree | 15px | 600 | `4:189` |
| input text | Figtree | 16px, 1.45 | 500 | `4:190` |
| body small and caption | Figtree | 14px, 1.5, and 13px, 1.45 | 400 | `4:220`, `4:192` |
| button | Figtree | 16px (14px small) | 600 | `5:16`, `7:77` |
| pill | Figtree | 14px | 500 | `5:26` |
| badge | Figtree | 12px | 600 | `7:80` |
| card title (admin) | Figtree | 18px | 700 | `7:75` |

**Light tokens (from Figma unless marked)**:

| Token | Value | Use |
|---|---|---|
| `--background` | `#f1f3ee` | Page |
| `--foreground` | `#1d2927` | Body and headings |
| `--card`, `--card-foreground` | `#ffffff`, `#1d2927` | Cards, input fill |
| `--popover`, `--popover-foreground` | `#ffffff`, `#1d2927` | Dialog (mapped, see Naming) |
| `--muted-foreground` | `#5b6864` | Secondary text, helper text |
| `--text-inactive` | `#606c67` | Unavailable calendar days (darkened) |
| `--primary`, `--primary-foreground` | `#355e52`, `#ffffff` | Buttons, links, selected, ring |
| `--primary-hover`, `--primary-active` | `#2d5045`, `#26443a` | Pressed states (decided here, starting values) |
| `--secondary`, `--secondary-foreground`, `--muted` | `#e3e9e1`, `#2c4a41`, `#e3e9e1` | Pills, summary strip, selected slot fill, ghost hover |
| `--accent`, `--accent-foreground` | `#d9e2d6`, `#4a5e57` | Hero arch and its text |
| `--border` | `#e1e6df` | Card borders |
| `--divider` | `#edf0eb` | Hairline dividers in lists |
| `--input` | `#7f8f87` | Control boundary (darkened from Figma) |
| `--ring` | `#355e52` | Focus outline |
| `--progress-track` | `#d5dcd3` | Unfilled progress segment (decorative) |
| `--destructive`, `--destructive-foreground`, `--destructive-soft` | `#8a2e25`, `#ffffff`, `#f6e1de` | Error, destructive button, "Calendar" badge |
| `--warning`, `--warning-foreground`, `--warning-strong` | `#f7e8cc`, `#4f4430`, `#6b4b12` | Note alert, badge text |
| `--success-soft`, `--success-foreground` | `#e0eee6`, `#1f5a43` | "Paid" badge |
| `--success-dot` | `#6fcf97` | Connected dot, only on the dark sidebar |
| `--neutral-soft`, `--neutral-foreground` | `#e9ece8`, `#3e4a47` | "Hold expired" badge |
| `--sidebar`, `--sidebar-card`, `--sidebar-accent` | `#1e2b29`, `#26352f`, `#2f403c` | Admin sidebar, status box, active row |
| `--sidebar-foreground`, `--sidebar-accent-foreground`, `--sidebar-muted`, `--sidebar-label` | `#c9d5d0`, `#ffffff`, `#a5b6b0`, `#93a7a0` | Sidebar text |
| `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-brand`, `--sidebar-ring` | `#a9cbbe`, `#1e2b29`, `#a9cbbe`, `#a9cbbe` | Sidebar accent and ring |
| `--sidebar-border` | `#2f403c` | Sidebar edges (needed in dark, where it equals `--card`) |
| `--shadow-float` | `0 24px 48px -24px rgba(28,41,38,0.28)` | Quote card |

**Dark tokens (derived, not in Figma)**. Pairs already confirmed: text `#e8eee9` on `#172120` (14.0) and `#1e2b29` (12.5); muted `#a5b6b0` on both (7.8, 6.9); mint `#a9cbbe` on both (9.4, 8.4); text on mint (8.6); control border `#6f8a80` (4.4 on page, 3.9 on card); the four badge pairs (7.3 to 9.0). The rest are confirmed by the AC-4 test at build, adjusted only by the lightness rule.

| Token | Dark value |
|---|---|
| `--background`, `--foreground` | `#172120`, `#e8eee9` |
| `--card`, `--card-foreground`, `--popover`, `--popover-foreground` | `#1e2b29`, `#e8eee9`, `#1e2b29`, `#e8eee9` |
| `--muted-foreground`, `--text-inactive` | `#a5b6b0`, `#8fa09a` |
| `--primary`, `--primary-foreground`, `--ring` | `#a9cbbe`, `#172120`, `#a9cbbe` |
| `--primary-hover`, `--primary-active` | `#b8d5ca`, `#c6dfd5` |
| `--secondary`, `--secondary-foreground`, `--muted`, `--accent`, `--accent-foreground` | `#26352f`, `#c9d5d0`, `#26352f`, `#2f403c`, `#c9d5d0` |
| `--border`, `--divider`, `--progress-track` | `#2f403c`, `#26352f`, `#2f403c` |
| `--input` | `#6f8a80` |
| `--destructive`, `--destructive-foreground`, `--destructive-soft` | `#f5b8b0`, `#172120`, `#3d2420` |
| `--warning`, `--warning-foreground`, `--warning-strong` | `#3a3020`, `#f0d49a`, `#f0d49a` |
| `--success-soft`, `--success-foreground`, `--success-dot` | `#1f3a2e`, `#a9dcc0`, `#6fcf97` |
| `--neutral-soft`, `--neutral-foreground` | `#2f403c`, `#c9d5d0` |
| Sidebar tokens | Same as light (the sidebar is dark in both themes) |
| `--shadow-float` | `none` (dark surfaces use `--border` instead) |

**Contrast pairs** (the AC-4 test fixture is a copy of this table; each pair is checked in the light and the dark values unless a row names one theme):

| Foreground | Background | Minimum | What it covers |
|---|---|---|---|
| `--foreground` | `--background`, `--card` | 4.5 | Body text |
| `--muted-foreground` | `--background`, `--card`, `--secondary` | 4.5 | Helper and secondary text |
| `--text-inactive` | `--background`, `--card` | 4.5 | Unavailable days |
| `--primary-foreground` | `--primary`, `--primary-hover`, `--primary-active` | 4.5 | Filled button text |
| `--primary` | `--background`, `--card`, `--secondary` | 4.5 | Links and accent text |
| `--secondary-foreground` | `--secondary` | 4.5 | Pill text |
| `--accent-foreground` | `--accent` | 4.5 | Text on the hero arch |
| `--destructive` | `--background`, `--card`, `--destructive-soft` | 4.5 | Error text, danger badge |
| `--destructive-foreground` | `--destructive` | 4.5 | Destructive button |
| `--warning-foreground`, `--warning-strong` | `--warning` | 4.5 | Note alert, warning badge |
| `--success-foreground` | `--success-soft` | 4.5 | Success badge |
| `--neutral-foreground` | `--neutral-soft` | 4.5 | Neutral badge |
| `--sidebar-foreground`, `--sidebar-label` | `--sidebar` | 4.5 | Sidebar text |
| `--sidebar-accent-foreground` | `--sidebar-accent` | 4.5 | Active row |
| `--sidebar-muted` | `--sidebar-card` | 4.5 | Status text |
| `--input` | `--background`, `--card` | 3.0 | Input, slot, checkbox, switch boundary |
| `--ring` | `--background`, `--card` | 3.0 | Focus outline |
| `--sidebar-ring`, `--sidebar-brand` | `--sidebar` | 3.0 | Sidebar focus and wordmark |
| `--primary` | `--secondary` | 3.0 | Selected slot border on its fill |
| `--success-dot` | `--sidebar-card` | 3.0 | Connected dot |

Excluded on purpose, each with its reason: `--progress-track` (decorative, the "3/4" text carries the meaning); `--text-inactive` and `--input` on `--secondary` (4.4 and 2.8, so controls and inactive text are never placed on a `--secondary` surface); `--success-dot` on light surfaces (about 1.9, so it is only used in the sidebar); disabled controls (exempt, 50 percent opacity).

**Figma differences (decided here, each with its reason)**:

| Figma value | Used for | Built value | Reason |
|---|---|---|---|
| `#cdd6cb` border, 1.3 to 1.5 on its background | Input, slot, outline button, checkbox boundaries | `--input` `#7f8f87` (3.0 on the page, 3.4 on white) | WCAG 1.4.11 needs 3:1 for control boundaries |
| `#d5dcd3` switch off track, 1.4 on white | Switch | `--input` `#7f8f87` | Same rule |
| `#b4bdb2` and `#a7b0a5` day numbers, 1.9 and 2.2 on white | Out of month and unavailable days | `--text-inactive` `#606c67` (5.5 on white, 4.9 on page) | Struck through days carry meaning, so they get 4.5:1 |
| `#d5dcd3` progress track, 1.25 on page | Step progress | Kept | The "3/4" text carries the meaning |
| Control heights 40, 42, 22 | Admin buttons, calendar days, checkbox | Kept visually | Hit area extended to 44px (AC-8) |
| Newsreader and Figtree as Google web fonts | All text | Same fonts as committed local files | No build time network dependency; same runtime privacy |
| No focus, error, hover, pressed, disabled, loading, destructive, dark | All components | Defined here | Engineer choices and cross check; see Decision |

**Key invariants**:
- A component file never contains a raw hex colour; it uses tokens only. Pixel font sizes and font family names appear only in the type roles in `globals.css` (reviewed in code review; not machine enforced).
- Meaning is never carried by colour alone (error, selected, status, availability).
- Every interactive element has a visible focus outline that meets 3:1 on every surface it can sit on; surfaces that invert (the admin sidebar) use their own ring token.
- Controls and inactive text are never placed on a `--secondary` surface.
- Any token change is checked by the AC-4 test before merge.

**Security model**: public, client side only. No personal data is read or written. The only stored value is the theme choice in `localStorage` (not personal data, not sent anywhere, not a cookie, so no consent banner is needed). Compliance scope: WCAG 2.2 AA and DPDP privacy by design (no third party host reached for fonts, icons or styles, at runtime or at build). If a strict Content Security Policy is adopted later, the theme script needs a nonce.

**Configuration required**: no application environment variables. CI gets dummy values for the existing variables so the app boots (see AC-15). New packages: at runtime `lucide-react`, `next-themes`, and the shadcn dependencies (Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`); as dev dependencies Storybook (`@storybook/nextjs-vite`, a11y, themes and vitest addons, `@tailwindcss/vite`), Vitest browser mode support, and `@playwright/test`. Use the current majors at install time and record them in `package.json`.

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: the Button story renders in light and dark, passes axe, shows the outline on Tab, and the built page requests only its own origin, verifies **AC-2**, **AC-5**, **AC-7**, **AC-14**, **AC-15**.
- Failure case: a token edit that drops a pair below its minimum fails the Vitest test and CI, verifies **AC-4**.
- Failure case: an Input with `invalid` shows red border, icon and message and exposes `aria-invalid` and a described error, verifies **AC-7**, **AC-9**.
- Failure case: a 28px wide checkbox row fails the elementFromPoint probe until its hit area is extended, verifies **AC-8**.
- Keyboard: the radio card group moves with arrow keys; Dialog traps focus, closes on Escape and returns focus to its trigger, verifies **AC-9**.
- Theme: first load with the system set to dark shows dark with no flash even with scripts blocked; choosing Light stores `theme` in `localStorage`, sets no cookie, and survives reload, verifies **AC-5**, **AC-15**.
- Motion: with reduced motion on, opening Dialog and Accordion leaves no running animation, verifies **AC-10**.
- Reflow: every story fits a 320px viewport without horizontal scroll, verifies **AC-3**.
- Auth and permission: not applicable, no restricted data.

## Build plan

Approach: **Tracer Bullet** (the project default in `AGENTS.md`). One thin real path goes through every layer first (token, font, one component, its story, its axe test, CI), then each step thickens one part.

1. Install and initialise, in this order: run the shadcn CLI init first (Radix base, Tailwind v4, `components.json`, `src/components/ui`), then `lucide-react`, `next-themes`, Storybook with `@storybook/nextjs-vite`, `@tailwindcss/vite`, the a11y, themes and vitest addons, and `@playwright/test`. Add `storybook` and `build-storybook` scripts, satisfies **AC-6**, **AC-13**
2. Tracer: replace the generated `globals.css` with the hex tokens and names above (light and dark), download the Latin variable font files once into `src/app/fonts/` with their licences, write `src/app/fonts.ts`, update `layout.tsx` (fonts, theme provider, Skip link, `<main id="main-content">`), remove starter styles and Geist, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-16**
3. Tracer: build Button (all variants, sizes, states, hit area, typed icon size) with its story in both themes; wire the story axe run in Vitest browser mode and add the `ci.yml` steps (Chromium install, Storybook tests, dummy app env, `next build` and `next start`, Playwright); this proves the whole path before anything else is added, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-13**, **AC-14**
4. Contrast test (Vitest) from the pairs table, the ESLint rule against raw hex colours, and the "`globals.css` is the only CSS file" check, satisfies **AC-1**, **AC-4**
5. Form primitives: Field, Input, Textarea with counter, Checkbox, Radio card group, Switch, each with all states and stories, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**
6. Display primitives: Pill, StatusBadge, Card, Alert, Separator, Table, each with stories, satisfies **AC-6**, **AC-7**
7. Disclosure and overlay primitives: Accordion (fade only), Dialog, AlertDialog, plus SkipLink and ThemeControl with keyboard and reduced motion behaviour, satisfies **AC-6**, **AC-9**, **AC-10**
8. Icons: add Lucide with the Figma sizes and the icon mapping list, satisfies **AC-11**
9. Write `design.md` (tokens, type roles with "TBD" rows, states, differences, node ids, icon mapping) and the test that keeps its `## Tokens` list and `globals.css` in step, satisfies **AC-3**, **AC-11**, **AC-12**
10. Finish the checks: reflow at 320px, reduced motion, forced colors on the Skip link, no third party request, no cookie, no flash, and the "no `storybook` in `.next/static`" search; confirm Storybook is excluded from `pnpm build`, satisfies **AC-3**, **AC-10**, **AC-13**, **AC-14**, **AC-15**

## Consequences

**Positive**:
- Every later screen assembles from shared, already checked parts; contrast and keyboard regressions fail CI instead of reaching users.
- Fonts and icons are self hosted and builds need no Google request, so the privacy promise and build reliability both hold.
- The Figma file's accessibility gaps are fixed once, in the tokens, instead of per screen.

**Negative / tradeoffs**:
- Dark mode is a design nobody has drawn: more tokens to keep correct and every story shown twice. Later feature specs may assume a light only look, so dark can be wrong in places until someone draws it.
- Storybook adds a second build, a large dependency tree and upkeep for a solo project. Browser mode tests and Playwright add CI time.
- The darker control borders make forms look slightly firmer than the Figma frames.
- A stored theme preference and a visible theme control add a small amount of state and UI to the public site; the choice is per site, so `hearme.com` and `admin.hearme.com` each remember their own.
- Committed font files make the repo larger and font updates manual.
- Several measured values are still missing because the Figma tool limit was reached (listed in Follow-up).

**Neutral**:
- shadcn components are copied into the repo, so updates are manual and the project owns the code.
- The spec of record for later UI features is `design.md` plus the Figma file.

## Follow-up

- [ ] Read the Figma nodes this spec could not (Figma tool limit reached on 2026-11-20): section headings `5:62` and `9:35`, price numerals `9:105`, helpline numbers `9:182`, admin page title and stat numbers (frame `7:203`), radio option cards `3:13` and `3:20`, plan card `9:109`, FAQ item `9:205`, topic card `5:67`, privacy table `9:167`, admin tables (frame `7:444`). The builder cannot reach Figma during build task 9, so whoever has access reads them first; until then `design.md` lists them as "TBD, Figma node X" and no value is invented.
- [ ] The Figma file has no phone version of the landing page (scope item 7), no desktop version of the booking flow (390px only) and admin only at 1440px. Decide those layouts in the landing, booking and admin specs; this spec supplies the tokens and primitives they use.
- [ ] Ask the designer to add the Figma variables and the dark, focus, error and disabled states, so tokens can be synced instead of hand copied. The Figma file also subscribes to eight libraries the project does not use (Apple OS kits, Material 3).
- [ ] Newsreader and Figtree files are the Latin subset. If the deferred Hindi feature is built, pick matching Devanagari fonts and extend the type roles.
- [ ] Confirm the current Storybook major, its Next.js Vite framework package and `@storybook/addon-vitest` support at install time (the field moves quickly), and pin the `next-themes` version (its inline script can log a React 19 script tag warning in development on Next 16, which is accepted).
- [ ] `tailwind-design-system` conventions are not yet in root `AGENTS.md` `## Rules`; they apply to every file and belong at root level. Same for the `shadcn`, `storybook-init` and `tailwind-4-docs` skills in `## Agent skills` (owned by `/audit` and `/sync`).
- [ ] MCP servers chosen, to connect yourself (your MCP settings): shadcn (`npx shadcn@latest mcp`), Storybook addon MCP (`npx storybook add @storybook/addon-mcp`, then `claude mcp add --transport http` to `http://localhost:6006/mcp` while Storybook runs; preview, React only), and Playwright (`claude mcp add playwright npx @playwright/mcp@latest`; it overlaps the installed `playwright-cli` skill). Note them in the `MCP servers:` line of `AGENTS.md`.
- [ ] If a strict Content Security Policy is adopted, give the theme provider's inline script a nonce.
- [ ] Spec 0001's UI row says tokens are decided in "the design system spec"; `/sync` should point it at this spec.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
