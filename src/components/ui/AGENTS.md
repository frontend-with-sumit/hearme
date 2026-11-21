# UI primitives (`src/components/ui/`)

The shared accessible components every screen builds from. Governed by [spec 0003](../../../docs/specs/0003-design-system-ui-foundation/index.md) and [design.md](../../../design.md).

## Rules

- Colours, spacing and type come from tokens in `src/app/globals.css` (use utilities like `bg-primary`). No raw hex in `src/**/*.tsx`; ESLint fails it. A new token must also be listed in `design.md` or `src/app/design-md.test.ts` fails.
- Named exports only. Most primitives start from shadcn on Radix (`components.json`) and are restyled to the tokens.
- Interactive controls need a 44 by 44 pixel hit area even when the visual is smaller. Extend it with padding or a pseudo element, not by growing the visual.
- Animate only colour, opacity and transform, 200ms or less. Nothing may animate under `prefers-reduced-motion: reduce`.
- `Button` with `size="icon"` needs `aria-label` and takes no children (enforced by `button.type-test.ts` through `pnpm typecheck`).
- Spread incoming `...props` first and set computed attributes after, as `Input` and `Textarea` do. Spreading last lets `Field`'s values erase `aria-invalid` and `aria-describedby`. `field.test.ts` guards this.
- `Field` wraps one control and wires label, helper and error text with `aria-describedby` and `aria-invalid`. Only set attributes it actually has, never `undefined`.

## Stories and tests

- Every primitive appears in a `*.stories.tsx` file with all its states. Every story runs in Vitest browser mode in light and dark with axe, the 44px probe, a 320px reflow check and a reduced motion check (`.storybook/checks.ts`).
- Storybook's test panel runs the light project only, because its plugin renames projects and two would clash (see `vitest.config.ts`). `pnpm test` and CI run both themes.
- Hover and pressed states are not yet shown in stories (open review follow up).

_Drafted by /sync from the introducing change, worth a quick human pass._
