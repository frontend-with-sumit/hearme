# HearMe

## Stack

- **Language / Runtime**: TypeScript, Next.js (App Router), Node current LTS
- **Key dependencies**: Prisma + Postgres (Neon), Inngest, Resend, Sentry, Upstash Redis, Tailwind CSS + shadcn/ui
- **Package manager**: pnpm
- **Hosting**: Vercel (Mumbai region, hostname routed: `admin.hearme.com` vs `hearme.com`)
- **Payments / Calendar**: Razorpay and Google Calendar/Meet, each behind a typed `PaymentProvider` / `CalendarProvider` adapter
- Full decision record and rationale: [docs/specs/0001-stack-architecture/index.md](docs/specs/0001-stack-architecture/index.md)

## Build approach

**Tracer Bullet** — one thin, real booking runs through every layer first, then each slice thickens one part of it end to end.

## Commands

```bash
# Install
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Test (runner installed by /test; Vitest + Playwright per spec 0001)
pnpm test

# Browser e2e (needs pnpm build first)
pnpm test:e2e

# Storybook (UI primitives; not part of the app build)
pnpm storybook
pnpm build-storybook
```

## Design system

- Design system: build all UI to `design.md` (token tables and Figma source of truth); token values live in `src/app/globals.css`.

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Functional & immutable: pure functions by default, no shared mutable state, side effects pushed to the edges. Prefer composition over classes; `map`/`filter`/`reduce` over imperative loops. Avoid `null`; use explicit `undefined` with union types or `Result`/`Either`-style returns for expected failures.
- Folder-by-feature: colocate by feature (e.g. `booking/`, `admin/`), with a thin shared layer for the provider adapters, the PII encryption service, and Prisma.
- TypeScript strict mode everywhere, no `any`.
- Every public function/module in the shared layer (adapters, encryption service) carries a short doc comment on what it does and why.
- One consistent error handling pattern across adapters: typed errors marked retryable vs terminal (per spec 0001), never a bare throw across a provider boundary.
- All env vars validated at startup through one typed env module; a missing/wrong secret fails loudly at boot.
- Named exports only, no default exports.
- UI meets WCAG 2.2 AA (focus, keyboard, 44px touch targets) — see the design system spec once written.
- Conventional commit messages.

## Tooling

- Lint/format/typecheck run on every commit (pre-commit gate); CI runs the same checks on push plus Vitest against a real Postgres.
- Testing: Vitest (unit/integration), Playwright (booking flow e2e) — per spec 0001.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

- [prisma-orm-setup](.agents/skills/prisma-orm-setup/): `prisma/skills`, Prisma ORM setup and connection
- [prisma-client-api](.agents/skills/prisma-client-api/): `prisma/skills`, Prisma Client queries
- [prisma-cli](.agents/skills/prisma-cli/): `prisma/skills`, Prisma CLI workflows
- [prisma-postgres-setup](.agents/skills/prisma-postgres-setup/): `prisma/skills`, Prisma Postgres provisioning
- [prisma-driver-adapter-implementation](.agents/skills/prisma-driver-adapter-implementation/): `prisma/skills`, driver adapter work (Neon adapter)
- [prisma-compute](.agents/skills/prisma-compute/): `prisma/skills`, Prisma Compute deploys
- [prisma-upgrade-v7](.agents/skills/prisma-upgrade-v7/): `prisma/skills`, Prisma v7 migration
- [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React/Next.js performance patterns
- [inngest-setup](.agents/skills/inngest-setup/): `inngest/inngest-skills`, durable functions, retries, scheduled jobs
- [resend](.agents/skills/resend/): `resend/resend-skills`, Resend API, idempotency keys, webhook verification
- [sentry-sdk-setup](.agents/skills/sentry-sdk-setup/): `getsentry/sentry-for-ai`, Sentry SDK setup
- [upstash-ratelimit-js](.agents/skills/upstash-ratelimit-js/): `upstash/skills`, rate limiting with `@upstash/ratelimit`
- [razorpay-webhooks](.agents/skills/razorpay-webhooks/): `hookdeck/webhook-skills`, Razorpay webhook signature verification and event handling
- [gws-calendar](.agents/skills/gws-calendar/): `googleworkspace/cli`, Google Calendar/Meet API
- [playwright-cli](.agents/skills/playwright-cli/): `microsoft/playwright-cli`, Playwright e2e conventions
- [shadcn](.agents/skills/shadcn/): `shadcn-ui/ui`, adding and restyling shadcn components
- [storybook-init](.agents/skills/storybook-init/): `storybookjs/storybook`, Storybook setup
- [tailwind-4-docs](.agents/skills/tailwind-4-docs/): `Lombiq/Tailwind-Agent-Skills`, Tailwind CSS v4 reference
- [tailwind-design-system](.agents/skills/tailwind-design-system/): `wshobson/agents`, Tailwind v4 design tokens and component patterns

Declined: Vitest skill (antfu/skills@vitest), extra skills and MCP servers for Storybook, shadcn, Radix, next-themes (2026-11-21, covered by installed skills)
MCP servers: resend-mcp (recommended, `npx -y resend-mcp`), Sentry MCP (recommended, `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`), Upstash MCP (recommended, `npx -y @upstash/mcp-server`), Razorpay MCP (recommended, `razorpay/razorpay-mcp-server`)

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

- [src/components/ui/AGENTS.md](src/components/ui/AGENTS.md): UI primitives, token rules, accessibility checks and Storybook conventions

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
