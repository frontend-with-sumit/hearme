# 0003 Rationale: Design system and UI foundation

Decision record for [index.md](index.md). Build tasks read the index only; this file holds the why.

## Context

> ⚠️ Premise note: Three of the engineer's choices add weight a solo project may feel later: dark mode with a manual switch (nothing in Figma shows dark), Storybook (a second build system), and automatic accessibility tests on every story in CI. None is wrong, but each is upkeep that the light only, gallery page alternatives avoid. They were chosen knowingly, and the spec limits the damage: Storybook is kept out of the production build, and dark values are derived and checked by test. If upkeep becomes a burden, the stories and the dark token block can be removed without touching any component.

HearMe is a privacy first, paid 1:1 listening service with no client accounts. Its interface is a mobile first booking flow, a desktop landing page and a desktop admin dashboard. The people using it may be upset or anxious, and they use it on phones, in the evening, often in a hurry to hide the screen. Anything that looks like a template, shouts, or is hard to read or tap works against the product.

The stack (spec 0001) already fixed Tailwind CSS with shadcn/ui, and `AGENTS.md` requires WCAG 2.2 AA with visible focus, keyboard use and 44px touch targets. The project is still the create-next-app starter visually: Geist fonts and plain white and near black variables. A Figma file exists with three pages (the public landing page at 1440px, the five step booking flow plus manage, help now and email at 390px, and six admin screens at 1440px). It defines no Figma variables, only values set on frames, and shows each component in a single default state only.

Reading those frames shows the design language: a calm sage green palette (`#355e52` primary on a `#f1f3ee` page), Newsreader (a serif with an italic used for emphasis) for display text and Figtree for everything else, fully round buttons and pills, soft 14px to 22px corners, and an admin area built around a dark green sidebar.

Three gaps decide most of the work. First, the Figma control borders and a few other colours fail WCAG contrast (measured, table below). Second, there are no focus, error, disabled, loading or dark designs. Third, the Figma tool hit its plan limit during the read, so some sizes are still unmeasured. Not deciding means every feature spec invents its own tokens and states, and the contrast failures spread into forms, calendar and admin screens.

## Options considered

### Option 1: shadcn/ui on Radix, Tailwind v4 tokens, local fonts, Storybook with axe tests, Playwright for the app (chosen)

Tokens live in `globals.css`; shadcn components are copied into the repo on Radix primitives and restyled; fonts are committed files; Storybook shows every state in light and dark and every story is run through axe in CI (Vitest browser mode); a few Playwright checks run against the real built app. (basis: spec 0001's UI row, the installed `shadcn` and `storybook-init` skills, WCAG 2.2 AA)

**Pros**:
- Matches the stack already chosen; Radix gives tested keyboard and screen reader behaviour for dialog, accordion, radio, checkbox and switch.
- Every state is visible and automatically checked, so accessibility regressions fail CI.
- Components are owned code, so they can be restyled to the Figma look exactly.

**Cons**:
- Storybook and Playwright add dependencies, a second build and CI minutes.
- Copied components do not receive upstream fixes automatically.

### Option 2: The same stack with a dev only gallery page instead of Storybook

One `/dev/design` page renders every component and state; Playwright and axe scan it. Returns 404 in production.

**Pros**:
- No Storybook dependency tree or second build; fastest to set up.
- Runs inside the real app, so it uses the real layout and fonts.

**Cons**:
- A hand kept page: states and docs are written by hand and drift.
- No isolated per story review, controls or addon ecosystem.

### Option 3: Tokens and `design.md` only, components built by each feature

Fonts, colours and `design.md` now; each feature builds the components it needs.

**Pros**:
- Smallest and fastest now.

**Cons**:
- Features duplicate and diverge on buttons, fields and states; accessibility work is repeated and uneven.
- The scope's done condition (accessible base components) is not met.

### Option 4: Hand built components without shadcn or Radix

Write every component from scratch on plain Tailwind.

**Pros**:
- No dependency on a component kit; total control.

**Cons**:
- Dialog focus trapping, radio group keyboard behaviour and similar details are easy to get wrong and expensive to test.
- Contradicts the stack decision in spec 0001 with no offsetting benefit.

## Rationale

Option 1 fits the forces in Context. The audience is people who may be distressed on small screens, the rule set requires WCAG 2.2 AA, and the Figma file leaves the hard parts (focus, errors, dark, accessible borders) undefined. A shared, automatically checked system is the cheapest way to make every later screen safe by default, and Radix removes the riskiest hand written behaviour. Option 3 leaves the same gaps to every feature; Option 4 spends effort on things Radix already solves.

The engineer chose three things against the recommendation, and each is accepted here with its cost:
- **Light and dark, following the system, with a manual switch.** The recommendation was light only, because only light is designed. It works, because the admin sidebar already gives a dark family that passes AA, but it requires accepting a derived dark look that nobody has drawn and double QA on every story. The manual switch adds a stored preference; it is kept in `localStorage` only, so it adds no cookie and no data leaves the browser.
- **Storybook over a gallery page.** The gallery page was recommended as the cheaper path. Storybook is accepted for its per story review and the a11y panel, with the cost named in the premise note and contained by keeping it out of the production build.
- **Contrast fixes over Figma fidelity.** The engineer accepted darkening control borders to `#7f8f87`; forms look slightly firmer than the frames, which is the price of meeting the 3:1 rule for control boundaries.

Two choices changed after the cross check, both toward the simpler path the reviewer recommended, and the engineer accepted both. **Fonts are committed local files** instead of `next/font/google`, because the Google loader downloads from Google on every build (Vercel and Storybook included), so an outage or a blocked network would fail a build; local files have the same runtime privacy and no build dependency. **Accessibility tests run inside Storybook** (`@storybook/addon-vitest` with the a11y addon in error mode) instead of a hand written Playwright crawler over a static build, which removes a static server and a story index walk; Playwright stays only for what needs the real app (theme flash, third party requests, cookies, forced colors on the Skip link).

## Evidence

### Figma inventory (read on 2026-11-20, file `HpHZNlRSHt2aec0CflECzs`)

| Page | Frames |
|---|---|
| Public site `0:1` | Landing page desktop `5:2` (nav, hero, topics, is and isn't, how it works, in the session, scope, pricing, privacy, safety, FAQ, footer) |
| Booking flow `3:2` | `3:61` choose a session, `4:166` date and time, `4:233` minimal details, `4:281` payment (slot on hold), `10:35` confirmed, `10:60` manage booking, `10:93` help now, `10:121` confirmation email |
| Admin `3:3` | `7:203` overview, `7:444` appointments with detail, `11:195` history, `11:401` availability, `11:591` sessions and pricing, `11:729` boundaries and safety guide |

Frames read for exact values: hero `5:59`, details form `4:233`, date and time content `4:161`, admin sidebar `7:202`, admin right column `7:141`. Screenshots viewed: hero, details form, step 1, admin overview, admin availability.

Measured type: display Newsreader 400, 76px, line height 1.02, tracking -1.52px; step title Newsreader 400, 32px, 1.1; quote Newsreader Italic 21px, 1.45; wordmark Newsreader Italic 22px (26px in admin) with "me" in the accent colour; eyebrow Figtree SemiBold 13px uppercase, tracking 1.17px; lead Figtree 20px, 1.6; input text Figtree Medium 16px; label SemiBold 15px; helper 13px, 1.45; button SemiBold 16px (14px small); pill Medium 14px; badge SemiBold 12px; card title Bold 18px.

Measured shape and size: buttons and pills fully round (999px); inputs and slots 14px radius with 1.5px border; alert 12px; admin cards 18px; calendar card 20px; quote card 22px; checkbox 5px; hero arch 240px top and 28px bottom corners; button heights 54, 48 and 40; input 52; slot 48; calendar day 42; checkbox and radio 22; badge 24; pill 34; progress segment 4.

### Contrast measurements (WCAG relative luminance)

All text pairs in the Figma file pass 4.5:1: white on primary 7.3, body on page 13.4, muted on page 5.2 and on white 5.8, the four badge pairs 6.6 to 7.8, admin sidebar text 5.8 to 10.9. These fail:

| Pair | Ratio | Needed | Rule |
|---|---|---|---|
| Control border `#cdd6cb` on page `#f1f3ee` | 1.34 | 3:1 | 1.4.11 non text contrast |
| Control border `#cdd6cb` on white | 1.49 | 3:1 | 1.4.11 |
| Switch off track `#d5dcd3` on white | 1.40 | 3:1 | 1.4.11 |
| Out of month day text `#b4bdb2` on white | 1.93 | 4.5:1 | 1.4.3 (inactive text is exempt, but struck through days carry meaning) |
| Unavailable day text `#a7b0a5` on white | 2.23 | 4.5:1 | 1.4.3 |
| Progress track `#d5dcd3` on page | 1.25 | 3:1 | 1.4.11; accepted because the "3/4" text carries the meaning |

Candidates chosen: control border `#7f8f87` (3.04 on page, 3.40 on white); inactive text `#606c67` (5.47 on white, 4.90 on page, 4.43 on the secondary tint so it is not used there). Focus ring `#355e52` is 7.3 on white and 6.5 on the page, but only 2.0 on the dark sidebar, so the sidebar uses `#a9cbbe` (8.4). Dark pairs checked are listed in `index.md`.

### Cross check (opus, read only, 2026-11-20)

A second model found about 20 places where the first draft left a value or decision to the builder, and several stack conflicts. All were applied. The main ones: the contrast test had no pair list (now the Contrast pairs table); hover, pressed, disabled and destructive states had no tokens; shadcn init writes tokens (`oklch`, chart, popover, sidebar extras) the spec did not set; the focus ring was a box shadow that forced colors mode removes (now an outline); the 44px probe at 21px would pass a 42px target (now 21.75px); the app cannot boot in CI without the encryption env values from the data model work; Tailwind in this project loads through a turbopack loader that Storybook does not use (now `@tailwindcss/vite` with the Next.js Vite framework); and Storybook needed its own font and theme wiring. Soundness notes kept as follow ups or invariants: no controls on `--secondary`, sidebar border in dark, `--success-dot` only on the dark sidebar, per origin theme storage, and a pseudo element hit area clipped by `overflow: hidden` parents (a story covers it).

### Skill and MCP discovery (run 2026-11-20 with consent)

Installed by the engineer's pick: `shadcn-ui/ui@shadcn`, `storybookjs/storybook@storybook-init`, `lombiq/tailwind-agent-skills@tailwind-4-docs`, `wshobson/agents@tailwind-design-system`. Declined or not picked: `secondsky/claude-skills@tailwind-v4-shadcn`, `nweii/agent-stuff@suggest-lucide-icons`, `dengineproblem/agents-monorepo@accessibility-test-axe`, and the Radix, next-themes and axe community skills. MCP picked, to connect by the engineer: shadcn, Storybook addon MCP (preview), Playwright.

## References

**Project sources**:
- `AGENTS.md`: the WCAG 2.2 AA rule (focus, keyboard, 44px touch targets), named exports only, TypeScript strict, one error pattern, Tracer Bullet build approach.
- Spec 0001 (stack and architecture): the UI row (Tailwind CSS and shadcn/ui restyled to HearMe tokens) and the privacy and data residency rules.
- Scope item 4 in `docs/scope/scope.md`: the done condition for this feature.
- The HearMe Figma file `HpHZNlRSHt2aec0CflECzs`.
- Installed skills: `shadcn`, `storybook-init`, `tailwind-4-docs`, `tailwind-design-system`, `vercel-react-best-practices`, `playwright-cli`.

**Practices & standards**:
- WCAG 2.2 success criteria: 1.4.3 contrast minimum, 1.4.10 reflow, 1.4.11 non text contrast, 2.1.1 keyboard, 2.4.1 bypass blocks (skip link), 2.4.7 focus visible, 2.4.11 focus not obscured, 2.5.8 target size.
- Design tokens as the single source of values, consumed through semantic names.
- Copy in component kit model (shadcn): the project owns the component code.
- Self hosting fonts from committed files, so neither runtime nor build needs a third party request (privacy by design, build reliability).
- Respecting `prefers-color-scheme` and `prefers-reduced-motion` before any custom preference.
