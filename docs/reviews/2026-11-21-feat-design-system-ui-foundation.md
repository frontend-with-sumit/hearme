# Review, feat/design-system-ui-foundation, 2026-11-21

**Reviewed by**: claude-opus-5-5 (fresh review session; author model not recorded in the branch)
**Scope**: 72 files (pnpm-lock.yaml skipped), branch vs main (merge base 6992de7) plus uncommitted docs edits
**Verdict**: Approve with nits

## Summary
This branch adds the HearMe design system from spec 0003. It brings hex tokens for light and dark in one `globals.css`, local Newsreader and Figtree fonts, a next-themes provider with no flash and no cookie, 17 primitives restyled from shadcn/Radix, and Storybook running axe, a 44px hit area probe and a 320px reflow check in both themes. It also adds a contrast test copied from the spec table, a design.md token sync test, a raw hex ESLint rule (checked against a sample and it catches strings, template literals and JSX class names), and Playwright checks against `next start`. The work is careful and closely follows the spec. I found no blockers or majors. The main issue is a prop override bug: Field silently cancels Input and Textarea's `invalid` prop. The rest are small gaps in what the stories prove: hover and pressed states, the AlertDialog under reduced motion, and the hit probe's exemptions. Two acceptance items (the AC-2 Figma hero comparison and the AC-11 icon mapping) are still open, but the verify and scope docs mark them done.

## Minor
### 🟡 Field cancels the child's `invalid` prop, `src/components/ui/field.tsx:52`
**Problem**: Field clones its child with `"aria-invalid": error ? true : children.props["aria-invalid"]`. When there is no `error`, that key is still passed, with the value `undefined`. Input (`input.tsx:24` then `:32`) and Textarea (`textarea.tsx:56` then `:64`) first compute `aria-invalid` from `invalid`, then spread `{...props}` afterwards, so the explicit `undefined` replaces the computed `true`. The result is that `<Field label="x"><Input invalid /></Field>` renders no `aria-invalid` and no red border, because the border is keyed on the `aria-invalid:` variant. That breaks the one setup the Input doc comment recommends ("Use it inside `Field`").
**Why it matters**: A later form spec that marks a field invalid without text in that exact Field (for example, the error shown in a summary at the top) gets no invalid state, and nothing reports it. No story covers this branch.
**Suggested fix**: Add the `aria-invalid` key to the clone only when Field has an error, or let Field read the child's `invalid` prop. In Input and Textarea, spread `props` before the computed `aria-invalid`. Add a story for Input `invalid` inside Field. Field also replaces any `aria-describedby` the child already has. Merge the two lists instead of replacing.

### 🟡 Destructive hover and pressed use a brightness filter, `src/components/ui/button.tsx:34`
**Problem**: AC-7 says hover and pressed colours come from tokens that the contrast test can read. The destructive variant uses `hover:brightness-110` and `active:brightness-90` instead. The colours this produces are never contrast checked.
**Why it matters**: The ratios probably still pass today: white on a lighter #8a2e25 stays well above 4.5. But this is the one state colour outside the AC-4 guard, so a later change to `--destructive` could push its hover state below the minimum without any test failing.
**Suggested fix**: Add `--destructive-hover` and `--destructive-active` tokens in `:root`, `.dark` and design.md, and add them to the contrast pairs table. Alternatively, record this choice as a Figma difference in design.md.

### 🟡 Hover and pressed states are defined but not rendered, and some primitives have none, `src/components/ui/button.stories.tsx:20`
**Problem**: AC-7 and AC-13 ask for every state that applies to be shown. In the stories, focus appears only through a play function, and hover and pressed are never rendered (there is no pseudo state addon and no forced state story). Checkbox, Switch, RadioCard and Input have no hover style at all.
**Why it matters**: Reviewers can't check hover and pressed in Storybook, and axe never sees those colours.
**Suggested fix**: Add `storybook-addon-pseudo-states` or per state stories. Decide whether checkbox, switch and radio card get a hover treatment, or record in design.md that they have none.

### 🟡 Reduced motion check never opens the AlertDialog, `src/components/ui/dialog.stories.tsx:140`
**Problem**: `ReducedMotionDialog` renders both dialogs but only opens `AboutDialog`. AC-10 says the check runs after opening each overlay.
**Why it matters**: AlertDialog has its own overlay and content animation classes, so a regression there would go unnoticed.
**Suggested fix**: Open the AlertDialog in the same story (or a sibling story) and assert `settledAnimationCount() === 0`.

### 🟡 Textarea announces only when the count is exactly 20 or exactly 0, `src/components/ui/textarea.tsx:16`
**Problem**: `announcement` checks `remaining === 20`. A paste, autocomplete or word deletion that skips from 21 to 15 says nothing.
**Why it matters**: A screen reader user who pastes text gets no warning that they are near the limit. That is the point of the live region.
**Suggested fix**: Announce when the count crosses the threshold: compare against the previous remaining count, or announce whenever `remaining <= 20` and the band changes.

### 🟡 The hit area probe is more lenient than the spec, `.storybook/checks.ts:28`
**Problem**: The probe skips disabled controls (line 28) and skips any probe point outside the viewport (line 73). The AC-8 probe has neither exemption. At the 320px story width, a control near the right edge, or one scrolled sideways inside the Table's scroll wrapper, can pass because its points go unchecked.
**Why it matters**: The clipping container rule (Card, Table, Dialog) is the case the probe exists to catch, and these exemptions weaken it.
**Suggested fix**: Keep the off-screen exemption only for the skip link (match on `data-slot`). Treat any other skipped point as a failure, or scroll the control into view first. Record the disabled exemption in design.md, or remove it.

### 🟡 The type role list in `cn` has to be kept in step by hand, `src/lib/utils.ts:9`
**Problem**: `TYPE_ROLES` copies the `--text-*` names from `globals.css`. If a role is added to the CSS but not to this list, tailwind-merge treats `text-<role>` as a colour and silently drops the real text colour next to it (the comment at line 6 describes exactly this).
**Why it matters**: The result is a quiet styling bug that no test catches.
**Suggested fix**: Add a unit test, next to the design.md test, that reads the `--text-<role>` names from the `@theme` block and compares them to `TYPE_ROLES`. You could also export the list from a module the test can import.

### 🟡 The sidebar surface and the shared keyboard helpers are not tested, `src/app/globals.css:259`
**Problem**: AC-5 defines `[data-surface="sidebar"]`, which redefines the ring, text and border tokens, but no story or test renders it. AC-14 asks for the keyboard checks (AC-9) to run as shared helpers. They are written by hand in each story's play function, and only motion and the hit probe are shared.
**Why it matters**: The sidebar ring exists because the light ring is only 2.0:1 on that surface, and nothing currently proves the override works.
**Suggested fix**: Add a story that wraps a Button and a link in `data-surface="sidebar"` with `bg-sidebar`, so axe and the focus check run on it. Either move the common keyboard checks into `.storybook/checks.ts`, or note the deviation.

### 🟡 Verify and scope docs mark open items as done, `docs/specs/0003-design-system-ui-foundation/verify.md:8`
**Problem**: The Figma hero comparison (AC-2) is ticked `[x]` but its own text says "Not yet done: needs Figma access". The AC-11 icon mapping is TBD in `design.md:202`. `scope.md` ticks Verify and Test while the "Icons, design.md and final checks" build step is still unchecked.
**Why it matters**: Spec status and scope are what later skills read, and these ticks overstate what is complete.
**Suggested fix**: Untick the hero comparison step and list AC-2 (visual match) and AC-11 (Figma icon names) as open follow-ups until someone with Figma access completes them.

## Nits
- ⚪ `src/components/ui/radio-card-group.tsx:52`: `group-data-[state=checked]:border-primary` has no `group` ancestor, so it does nothing. The `[[data-state=checked]_&]` selector already does the job.
- ⚪ `src/components/ui/textarea.tsx:38`: `counterId` is assigned to the live region but nothing references it.
- ⚪ `src/components/ui/button.tsx:117`: a loading icon button renders both the spinner and the icon side by side. Consider swapping the icon for the spinner.
- ⚪ `package.json`: `shadcn` (the CLI) is a runtime dependency only so that `shadcn/tailwind.css` can be imported. A dev dependency would be enough, since the CSS is resolved at build time.
- ⚪ `src/app/fonts.ts:30`: `figtree` has no doc comment of its own; the one block above covers both fonts.
- ⚪ `src/components/ui/dialog.stories.tsx:52`: the "Got it" button isn't wrapped in `DialogClose`, so clicking it does nothing.
- ⚪ `src/components/ui/alert.tsx:51`: `role="status"` on a static notice that is present at page load is harmless but adds a live region for no reason. Consider applying the role only when the alert is inserted dynamically.

## Strengths
- The guards are real and lock in the spec: the contrast test copies the spec's pairs table and fails on missing tokens; the design.md sync test and the one CSS file test catch drift; and the raw hex ESLint rule catches strings, template literals and JSX class names.
- The no-flash e2e checks block `/_next/static/chunks/**` and test both the "system dark" and the "explicit Light beats dark OS" cases. The cookie, own-origin font and forced colours skip link checks run against `next start`, not the dev server.
- The shared Storybook `afterEach` applies the 44px `elementFromPoint` probe and the 320px reflow check to every story in both themes, so coverage scales automatically.
- Button's icon discriminated union, with `button.type-test.ts`, enforces `aria-label` and forbids children at compile time.
- `touch-target` comes before `absolute` in the compiled CSS, so the Dialog close button keeps its position. I checked this because it looked like a risk.

## Test coverage
Coverage is strong for a UI foundation. The unit tests cover contrast, token sync, the one CSS file rule and the Vitest config. The stories (in light and dark) cover axe, hit area, reflow, keyboard behaviour for Button, Accordion, Dialog, AlertDialog, radio group, Checkbox and Switch, focus on Escape, focus starting on Cancel, the Textarea live region, and reduced motion for Dialog and Accordion. Playwright covers AC-15. These paths are untested:
- Input or Textarea `invalid` inside Field without an `error`, where the bug above lives
- the AlertDialog under reduced motion
- the `data-surface="sidebar"` token override
- hover and pressed state colours
- Textarea announcements when the count jumps past 20
- keeping `TYPE_ROLES` in step with the `@theme` roles
