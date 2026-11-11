# Verify: Stack & architecture · spec 0001 · updated 2026-11-11
_Steps derived from spec 0001 and the scope's "Done when" for feature 1 (scaffold step)._

## UI / manual
- [x] Visit `http://localhost:3000` with `pnpm dev` running → page loads with HTTP 200   → AC: boots locally

## Commands
- [x] `pnpm install` → completes without error                                          → AC: scaffold installable
- [x] `pnpm build` → compiles, typechecks, and generates static pages with no errors    → AC: passes build
- [x] `pnpm lint` → runs clean (no errors)                                               → AC: scaffold is lint clean

## Acceptance-criteria coverage
- AC: stack and architectural decisions recorded in a spec · covered by spec 0001 existing with `Status: In Progress` and a filled `## Proposed stack` table
- AC: empty project scaffold boots locally · covered by the `pnpm dev` + localhost step above
- AC: scaffold passes build · covered by the `pnpm build` step above

## Deferred to later features (not in this scaffold's scope)
- Postgres/Neon, Prisma, the `EXCLUDE` constraint, and the encrypted PII envelope → scope item 3 (data model)
- Tailwind restyle to HearMe tokens + shadcn/ui components → scope item 4 (design system & UI foundation)
- Inngest, Resend, Sentry, Upstash Redis → installed just in time by the features that need them
- `AGENTS.md` capturing conventions (pnpm, provider adapters, hostname routing) → scope item 2 (`/audit`)
