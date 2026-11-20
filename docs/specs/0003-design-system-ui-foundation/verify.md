# Verify: design system & UI foundation · spec 0003 · updated 2026-11-20

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Open `/` in light, then dark, at 1440px and 390px → fonts are Newsreader (heading) and Figtree (body), no layout jump on load → AC-2, AC-3, AC-16
- [ ] Compare the hero at 1440px with the Figma screenshot (file `HpHZNlRSHt2aec0CflECzs`, node `5:14`) → size, weight and tracking match. Not yet done: needs Figma access → AC-2
- [ ] Press Tab once on `/` → Skip link appears with a 2px outline, Enter moves focus to `main` → AC-9, AC-16
- [ ] Choose Dark, reload, then choose System → dark persists, then follows the OS; DevTools shows `theme` in localStorage and no cookies → AC-5
- [ ] Windows or emulated forced colors on `/`, Tab to the Skip link → 2px outline in a system colour → AC-7
- [ ] Run `pnpm storybook`, open each primitive in light and dark → every state listed in spec 0003 is shown → AC-6, AC-7, AC-13
- [ ] Value sourcing: switch the OS theme with the control on System → colours follow `prefers-color-scheme`; with Light or Dark chosen the OS setting is ignored → AC-5
- [ ] Value sourcing: tab through every story with the keyboard only → every control is reachable and shows the focus outline → AC-7, AC-9
- [ ] Open a Dialog, press Escape, and confirm focus returns to the trigger; open an Alert dialog and confirm focus starts on Cancel → AC-9
- [ ] Turn on reduced motion in the OS, open the Dialog and Accordion stories → nothing animates → AC-10

## Commands

- [ ] `pnpm test` → unit tests, the contrast test, the design.md sync test and every story in light and dark (axe, 44px probe, 320px reflow, reduced motion) pass → AC-1, AC-4, AC-7, AC-8, AC-9, AC-10, AC-12, AC-14
- [ ] `pnpm typecheck` → passes, which proves `button.type-test.ts` (icon Button needs `aria-label`, forbids children) → AC-9
- [ ] `pnpm lint` → passes; a `"#ff00aa"` string in any `src/**/*.tsx` fails it → AC-1
- [ ] `pnpm build && pnpm test:e2e` → own origin only, no cookie on theme switch, no flash with scripts blocked, skip link outline in forced colors → AC-2, AC-5, AC-15
- [ ] `pnpm build && ! grep -rli storybook .next/static` → no match → AC-13
- [ ] `pnpm build-storybook` → completes → AC-13
- [ ] Edit `--primary` in `:root` of `globals.css` to a pale colour, then `pnpm test` → the contrast test fails; revert → AC-4
- [ ] Add a token to `globals.css` without listing it in `design.md` → `pnpm test` fails; revert → AC-12

## Acceptance-criteria coverage

- AC-1 … lint rule, one CSS file test · AC-2 … e2e fonts and origin, Figma hero compare (open) · AC-3 … 320px reflow in every story, type roles in design.md (TBD rows listed) · AC-4 … contrast test · AC-5 … e2e theme and flash, theme control story · AC-6 … stories for every primitive · AC-7 … state stories, focus check · AC-8 … 44px probe on every story · AC-9 … keyboard stories, type test, e2e skip link · AC-10 … reduced motion stories · AC-11 … Icon component and design.md table (Figma icon names still TBD) · AC-12 … design.md sync test · AC-13 … storybook build, bundle grep · AC-14 … axe on every story in CI · AC-15 … `e2e/foundation.spec.ts` · AC-16 … layout, e2e
