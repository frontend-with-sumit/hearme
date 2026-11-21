# HearMe design system

Source of truth for how HearMe looks. The decisions and reasons are in [spec 0003](docs/specs/0003-design-system-ui-foundation/index.md). The token values live once, in [src/app/globals.css](src/app/globals.css); this file explains them and a test keeps the two in step.

## Character

Calm, warm and unhurried. A serif voice (Newsreader, with italic emphasis in the primary green) for the big moments, a friendly sans (Figtree) for everything you read and press. Soft sage greens on an off white page, round pill shaped buttons, generous space. Nothing shouts, nothing flashes, nothing is urgent unless it truly is.

## Build mandate

- Use tokens, never raw colours. A raw hex colour in a `.ts` or `.tsx` file under `src/` fails lint. Colours come from the theme variables in `globals.css` (for example `bg-primary`, `text-muted-foreground`).
- Use the type roles (`text-display`, `text-label`, `text-helper` and so on), never loose pixel sizes. Pixel sizes and font names appear only in the roles in `globals.css`.
- Build screens from the primitives in `src/components/ui/`. Add a new primitive only when none fits, with a story that shows every state in light and dark.
- Meaning is never carried by colour alone: errors, selected items, statuses and availability all pair colour with an icon, text or shape.
- Controls and inactive text are never placed on a `--secondary` surface.
- Every interactive element has a visible 2px focus outline and a pointer area of at least 44 by 44 CSS pixels.
- Light mode follows Figma. Dark mode is derived (not drawn by a designer) and is marked as such everywhere.
- Page content (landing, booking, admin screens) belongs to the later feature specs. This file covers tokens and primitives only.

## Source of truth

- Figma file key `HpHZNlRSHt2aec0CflECzs`. Pages: Public site `0:1`, Booking flow `3:2`, Admin `3:3`. The file defines no Figma variables, so every value was read from the frames.
- Light mode follows the Figma frames. **Dark mode is derived** in spec 0003 from the admin sidebar tones and checked by the contrast test. It is not in Figma.
- Type measured from nodes: hero `5:14`, step title `4:181`, quote `5:53`, labels `4:189`, input `4:190`, caption `4:192`, body small `4:220`, wordmark `4:176` and `7:150`, eyebrow `5:13`, lead `5:15`, button `5:16` and `7:77`, pill `5:26`, badge `7:80`, card title `7:75`.

## Tokens

Every custom property in `:root` (light) and `.dark` in `globals.css`. A test requires this list to match the stylesheet exactly. Light values come from Figma except where the differences table says otherwise; dark values are derived.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f1f3ee` | `#172120` | Page |
| `--foreground` | `#1d2927` | `#e8eee9` | Body text and headings |
| `--card` | `#ffffff` | `#1e2b29` | Cards and input fill |
| `--card-foreground` | `#1d2927` | `#e8eee9` | Text on cards |
| `--popover` | `#ffffff` | `#1e2b29` | Dialog fill (same as card) |
| `--popover-foreground` | `#1d2927` | `#e8eee9` | Text in dialogs |
| `--muted-foreground` | `#5b6864` | `#a5b6b0` | Secondary and helper text |
| `--text-inactive` | `#606c67` | `#8fa09a` | Unavailable calendar days |
| `--primary` | `#355e52` | `#a9cbbe` | Buttons, links, selected, ring |
| `--primary-foreground` | `#ffffff` | `#172120` | Text on primary |
| `--primary-hover` | `#2d5045` | `#b8d5ca` | Filled button hover (decided here) |
| `--primary-active` | `#26443a` | `#c6dfd5` | Filled button pressed (decided here) |
| `--secondary` | `#e3e9e1` | `#26352f` | Pills, summary strip, selected slot fill, outline and ghost hover |
| `--secondary-foreground` | `#2c4a41` | `#c9d5d0` | Text on secondary |
| `--muted` | `#e3e9e1` | `#26352f` | Same as secondary (shadcn name) |
| `--accent` | `#d9e2d6` | `#2f403c` | Hero arch |
| `--accent-foreground` | `#4a5e57` | `#c9d5d0` | Text on the hero arch |
| `--border` | `#e1e6df` | `#2f403c` | Card borders |
| `--divider` | `#edf0eb` | `#26352f` | Hairline dividers in lists |
| `--input` | `#7f8f87` | `#6f8a80` | Control boundary (darkened from Figma) |
| `--ring` | `#355e52` | `#a9cbbe` | Focus outline |
| `--progress-track` | `#d5dcd3` | `#2f403c` | Unfilled progress segment (decorative) |
| `--destructive` | `#8a2e25` | `#f5b8b0` | Error text, destructive button |
| `--destructive-foreground` | `#ffffff` | `#172120` | Text on destructive |
| `--destructive-soft` | `#f6e1de` | `#3d2420` | Danger badge and alert fill |
| `--warning` | `#f7e8cc` | `#3a3020` | Note alert fill |
| `--warning-foreground` | `#4f4430` | `#f0d49a` | Text on the note alert |
| `--warning-strong` | `#6b4b12` | `#f0d49a` | Warning badge text |
| `--success-soft` | `#e0eee6` | `#1f3a2e` | Paid badge fill |
| `--success-foreground` | `#1f5a43` | `#a9dcc0` | Paid badge text |
| `--success-dot` | `#6fcf97` | `#6fcf97` | Connected dot, only on the dark sidebar |
| `--neutral-soft` | `#e9ece8` | `#2f403c` | Hold expired badge fill |
| `--neutral-foreground` | `#3e4a47` | `#c9d5d0` | Hold expired badge text |
| `--sidebar` | `#1e2b29` | `#1e2b29` | Admin sidebar |
| `--sidebar-card` | `#26352f` | `#26352f` | Sidebar status box |
| `--sidebar-accent` | `#2f403c` | `#2f403c` | Active sidebar row |
| `--sidebar-foreground` | `#c9d5d0` | `#c9d5d0` | Sidebar text |
| `--sidebar-accent-foreground` | `#ffffff` | `#ffffff` | Text on the active row |
| `--sidebar-muted` | `#a5b6b0` | `#a5b6b0` | Sidebar secondary text |
| `--sidebar-label` | `#93a7a0` | `#93a7a0` | Sidebar section labels |
| `--sidebar-primary` | `#a9cbbe` | `#a9cbbe` | Sidebar accent |
| `--sidebar-primary-foreground` | `#1e2b29` | `#1e2b29` | Text on sidebar accent |
| `--sidebar-brand` | `#a9cbbe` | `#a9cbbe` | Sidebar wordmark |
| `--sidebar-ring` | `#a9cbbe` | `#a9cbbe` | Sidebar focus outline |
| `--sidebar-border` | `#2f403c` | `#2f403c` | Sidebar edges |
| `--shadow-float` | `0 24px 48px -24px rgba(28, 41, 38, 0.28)` | `none` | Quote and feature card shadow |

Notes:
- `--muted` equals `--secondary`, `--popover` equals `--card` and `--popover-foreground` equals `--card-foreground`, for shadcn compatibility. `--accent` is the hero arch colour here, not a hover colour, so ghost and outline hover use `--secondary`.
- The admin sidebar is a dark surface in both themes. Put `data-surface="sidebar"` on it and everything inside swaps `--ring`, `--foreground`, `--muted-foreground` and `--border` for the sidebar values, because the light ring is only 2.0:1 on the sidebar fill.
- Every pair in the contrast table of the spec is checked in both themes by `src/app/globals.test.ts`. No dark value needed adjusting, so the differences table has no dark lightness changes.

## Type roles

Defined under `@theme` in `globals.css` as `--text-<role>` with line height, tracking and weight. Newsreader is the serif (`font-serif`), Figtree the sans (`font-sans`).

| Role (utility) | Font | Size and line height | Weight and tracking | Figma node |
|---|---|---|---|---|
| display (`text-display`) | Newsreader | 76px at 1440px, fluid below: `clamp(2.75rem, 1.6rem + 4.7vw, 4.75rem)`; 1.02 | 400, -0.02em; italic emphasis in `--primary` | `5:14` |
| heading 1 (`text-heading-1`) | Newsreader | 32px, 1.1 | 400 | `4:181` |
| quote (`text-quote`) | Newsreader italic | 21px, 1.45 | 400 | `5:53` |
| wordmark (`text-wordmark`, `text-wordmark-admin`) | Newsreader italic | 22px, 26px in admin | 400; "me" in `--primary` (mint in sidebar) | `4:176`, `7:150` |
| eyebrow (`text-eyebrow`) | Figtree | 13px | 600, +0.09em, add `uppercase` | `5:13` |
| lead (`text-lead`) | Figtree | 20px, 1.6 | 400 | `5:15` |
| label (`text-label`) | Figtree | 15px | 600 | `4:189` |
| input text (`text-input-text`) | Figtree | 16px, 1.45 | 500 | `4:190` |
| body small (`text-body-small`) | Figtree | 14px, 1.5 | 400 | `4:220` |
| helper (`text-helper`) | Figtree | 13px, 1.45 | 400 | `4:192` |
| button (`text-button`, `text-button-small`) | Figtree | 16px, 14px small | 600 | `5:16`, `7:77` |
| pill (`text-pill`) | Figtree | 14px | 500 | `5:26` |
| badge (`text-badge`) | Figtree | 12px | 600 | `7:80` |
| card title (`text-card-title`) | Figtree | 18px | 700 | `7:75` |

Not yet measured (Figma tool limit was reached on 2026-11-20). No value is invented for these. Whoever has Figma access reads them first:

- Section headings: TBD, Figma nodes `5:62` and `9:35`
- Price numerals: TBD, Figma node `9:105`
- Helpline numbers: TBD, Figma node `9:182`
- Admin page title and stat numbers: TBD, Figma frame `7:203`
- Radio option cards: TBD, Figma nodes `3:13` and `3:20`
- Plan card: TBD, Figma node `9:109`
- FAQ item: TBD, Figma node `9:205`. The accordion question uses `text-accordion-question` (18px, from the spec text); its weight and line height are TBD for the same node.
- Topic card: TBD, Figma node `5:67`
- Privacy table: TBD, Figma node `9:167`
- Admin tables: TBD, Figma frame `7:444`

## Spacing, radii and shadow

- Spacing: Tailwind's 4px scale. The Figma values 6, 10, 14, 18 and 22px are the half steps `1.5`, `2.5`, `3.5`, `4.5` and `5.5`.
- Radii: `--radius-control` 14px (inputs, radio cards), `--radius-alert` 12px, `--radius-card` 18px (admin cards), `--radius-calendar` 20px, `--radius-feature` 22px (feature cards, dialogs), `--radius-checkbox` 5px. Fully round is `rounded-full` (buttons, pills, badges).
- Shadow: `--shadow-float` (`0 24px 48px -24px` at 28 percent of the foreground green) on the quote card and dialogs. It is `none` in dark, where `--border` separates surfaces instead. Use it as `shadow-[var(--shadow-float)]`.
- Switch track: 44 by 24px. Not measured in Figma, chosen here so the thumb and track meet the 3:1 rule.

## Components and states

Every primitive in `src/components/ui/` has a Storybook story for each state, in light and dark. Run `pnpm storybook`.

| Component | Variants and sizes | Notes |
|---|---|---|
| Button | primary, outline, ghost, link, destructive; lg 54px, md 48px, sm 40px, icon | Pill shaped. `icon` size needs `aria-label` and an `icon` prop, and takes no children (checked at compile time). `loading` keeps the label, sets `aria-busy` and ignores clicks. |
| Input | 52px, radius 14px | 1.5px `--input` border, `--card` fill. Use inside Field. |
| Textarea | min 96px | Optional counter "54 / 280" (hidden from assistive technology) plus a live region that speaks at 20 left and at 0. |
| Field | label, helper, error, optional | Wires `htmlFor`, `aria-describedby`, `aria-invalid`. Error has an icon and text. |
| Checkbox | 22px box, radius 5px | Pass `label` so the whole 44px row is the target. |
| Radio card group | 88px cards, radius 14px | Selected: 2px `--primary` border and a filled radio. Arrow keys move and select. |
| Switch | 44 by 24px | Visible label required. |
| Pill | 34px | Static text. |
| Status badge | success, warning, danger, neutral; 24px | Words always present. |
| Card | admin radius 18px, feature radius 22px | Compose with the Card parts. |
| Alert | info, warning, danger | Icon on every tone. `role="status"`, danger `role="alert"`. |
| Accordion | Radix | Fades, never animates height. |
| Dialog, Alert dialog | Radix | Traps focus, restores it, Escape closes the dialog. Alert dialog does not close on scrim click and starts focus on Cancel. |
| Table | semantic parts | `th scope="col"`. Scrolls sideways inside its wrapper on narrow screens. |
| Separator | horizontal, vertical | Decorative by default. |
| Skip link | | First focusable element. Visible only on focus. |
| Theme control | Light, Dark, System | Stored in `localStorage` under `theme`, never a cookie. |

State rules, for every primitive that has the state:

- **Hover and pressed**: filled buttons use `--primary-hover` and `--primary-active`; outline and ghost use `--secondary`. Destructive has no hover tokens in the spec, so it uses a small brightness change (`hover:brightness-110`, `active:brightness-90`) that only ever raises text contrast.
- **Focus visible**: a 2px solid outline in `--ring` with a 2px offset (an outline, never a box shadow). In Windows forced colours it becomes the system `Highlight` colour, still 2px wide.
- **Disabled**: 50 percent opacity and `cursor-not-allowed`. Disabled controls are exempt from contrast rules.
- **Invalid**: `--destructive` border plus an icon and text in Field, and `aria-invalid`. Never colour alone.
- **Selected or checked**: `--primary` fill or border plus a check or filled radio.
- **Loading** (Button only): spinner, label kept, `aria-busy`.
- **Motion**: transitions are 200ms or less and animate only colour, opacity and transform. With reduced motion on, all animation and transition is turned off. Nothing plays automatically.

## Accessibility rules

WCAG 2.2 AA, enforced rather than hoped for:

1. **Contrast**: every pair in the spec's contrast table meets its minimum in light and dark. `src/app/globals.test.ts` fails on any miss.
2. **Axe**: every story runs through axe in a real browser, in light and dark, and any serious or critical violation fails (`pnpm test`).
3. **Pointer area**: every control answers pointer input over at least 44 by 44px, even where it looks smaller (`touch-target` utility). Checked on every story by probing `elementFromPoint`.
4. **Keyboard**: Tab order, Space and Enter, arrow keys in the radio groups, Escape closes dialogs, focus is trapped and restored.
5. **Reflow**: every story runs at a 320px wide viewport and must not scroll sideways.
6. **Names**: every control has an accessible name; labels and messages are tied with `aria-describedby`.
7. **Landmarks**: the layout renders one `<main id="main-content" tabIndex={-1}>` and the Skip link is first. Later specs must not add a second `<main>`.
8. **Privacy**: fonts, icons and styles are served from this site. No request to any other origin (checked by `e2e/foundation.spec.ts`).

## Differences from Figma

| Figma value | Used for | Built value | Reason |
|---|---|---|---|
| `#cdd6cb` border, 1.3 to 1.5 on its background | Input, slot, outline button, checkbox boundaries | `--input` `#7f8f87` (3.0 on the page, 3.4 on white) | WCAG 1.4.11 needs 3:1 for control boundaries |
| `#d5dcd3` switch off track, 1.4 on white | Switch | `--input` `#7f8f87` | Same rule |
| `#b4bdb2` and `#a7b0a5` day numbers, 1.9 and 2.2 on white | Out of month and unavailable days | `--text-inactive` `#606c67` (5.5 on white, 4.9 on page) | Struck through days carry meaning, so they get 4.5:1 |
| `#d5dcd3` progress track, 1.25 on page | Step progress | Kept | The "3/4" text carries the meaning |
| Control heights 40, 42, 22 | Admin buttons, calendar days, checkbox | Kept visually | Hit area extended to 44px |
| Newsreader and Figtree as Google web fonts | All text | Same fonts as committed local files | No build time network dependency; same runtime privacy |
| No focus, error, hover, pressed, disabled, loading, destructive, dark | All components | Defined in spec 0003 | Engineer choices and cross check |
| No switch size | Switch | 44 by 24px | Not measured; chosen so the track and thumb meet 3:1 |

## Icons

All icons come from `lucide-react`, rendered through the `Icon` component at the Figma sizes 16, 18, 20, 22 and 28. They are hidden from assistive technology unless given a `label`.

Used by the primitives so far:

| Where | Lucide icon | Size |
|---|---|---|
| Field error, Alert danger | `CircleAlert` | 16, 18 |
| Alert info | `Info` | 18 |
| Alert warning | `TriangleAlert` | 18 |
| Checkbox check | `Check` | 16 |
| Accordion chevron | `ChevronDown` | 22 |
| Dialog close | `X` | 20 |
| Button loading | `Loader2` | 16, 20 |
| Theme control | `Sun`, `Moon`, `Monitor` | 16 |

The Figma frames' own icon names (calendar, video, lock, shield, month arrows and so on) could not be read when this was written (the Figma tool limit was reached on 2026-11-20). TBD: map each Figma icon to its Lucide equivalent from the icon names in the frames, in node order, when Figma is reachable. Until then, pick the closest Lucide icon at the Figma size and add it to this table.
