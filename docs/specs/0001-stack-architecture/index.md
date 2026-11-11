# 0001. Stack and architecture for HearMe

**Date**: 2026-10-05
**Status**: Accepted
**Updated**: 2026-11-11 (data residency added; cross check fixes applied)

## Summary

This decides the full technical foundation for HearMe: a single Next.js app on Vercel, Postgres on Neon through Prisma, and a small set of managed services for jobs, email, and error tracking. Every entity (bookings, payments, personal data) runs through app level encryption before it reaches the database. The public booking site and the admin dashboard are the same codebase, split only by which subdomain a request arrives on. Every later feature builds on this; it is picked once and changed deliberately, not per feature.

## Decision

**Chosen option**: Option 1: Managed serverless stack (Vercel + Neon + Inngest + Resend)

Build one Next.js (App Router, TypeScript) application, deployed to Vercel, backed by a Neon Postgres database through Prisma, with Inngest for anything that must run on a delay or retry (hold expiry, retention jobs, calendar sync), Resend for the confirmation email, Sentry for error tracking, and Upstash Redis for rate limiting. Hostname based routing inside the one app serves `admin.hearme.com` as the admin dashboard and `hearme.com` as the public booking flow.

**Implementation skills**: `prisma-orm-setup`, `prisma-client-api`, `prisma-cli`, `prisma-postgres-setup`, `prisma-driver-adapter-implementation`, `prisma-compute`, `prisma-upgrade-v7`, `prisma-mongodb-upgrade`, `prisma-database-setup`, `prisma-postgres` (`prisma/skills`, `.agents/skills/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/`)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | One language across the whole app (UI, server, jobs); matches the rest of the stack and the scope's existing framing. |
| Framework | Next.js (App Router) | Already set by the scope. Server actions plus route handlers cover both the form driven booking flow and the webhook/signed link endpoints without a second API layer. |
| Primary DB | Postgres on Neon, via Prisma | A relational database fits bookings, payments, and refunds cleanly (strong relations, `EXCLUDE` constraints). Neon's branching gives a real preview database per pull request; scale to zero keeps idle cost near nothing at this traffic level. |
| No double booking | Postgres `EXCLUDE USING gist` constraint (needs `btree_gist`), scoped to rows in `HELD` or `CONFIRMED` state only; any new hold first expires overlapping stale holds in the same transaction | Rejects an overlapping booking at the database level even under concurrent requests, and does not depend on a background job's timing; a late cleanup run can delay tidying up but can never cause a double booking. Prisma cannot express a range type or this constraint natively: the column is `Unsupported("tstzrange")` in `schema.prisma`, and the constraint plus `CREATE EXTENSION btree_gist` are added in a hand written SQL migration. The app catches Postgres error `23P01` (exclusion violation) and returns "slot taken". |
| Webhook idempotency | A `WebhookEvent` table with a unique constraint on the provider's event id, written in the same transaction as the booking state change | A retried webhook delivery (Razorpay or Google) can never be applied twice; this is safer than a cache based check since it can't lose data. The Razorpay signature is verified against the raw request body before anything is written. |
| PII encryption | App level envelope encryption, AES-256-GCM: a per-record Data Encryption Key (DEK) wraps the field, itself wrapped by a versioned Key Encryption Key (KEK) held in an env based keyring (`KEK_V1`, `KEK_V2`, …, plus which version is current), separate keys per environment | A database breach alone exposes nothing readable. Destroying a record's DEK makes that record unreadable in the live database and in any copy or export taken from it (crypto-shredding). It does **not** reach into Neon's restore history, because restoring an old backup also restores the old DEK; what guarantees deletion reaches backups is the 35 day restore window cap (see Consequences). Each ciphertext is bound to its record id and field name so values can't be swapped between records. The email lookup index is an HMAC (a keyed fingerprint) made with its **own** key, `HMAC_KEY_Vn`, never the KEK, so admin can still search Appointments by email. The Google Calendar refresh token is encrypted the same way. The exact ciphertext format, where the DEK is stored, and the list of encrypted fields belong to the data model spec (scope item 3). |
| Admin sessions | Server side sessions stored in Postgres; the cookie holds only an opaque id: `__Host-`, `Secure`, `Path=/`, `HttpOnly`, `SameSite=Strict`, no `Domain` attribute | A session can be revoked instantly (suspected compromise, logout everywhere), which matters for an account that can see personal data and issue refunds. `__Host-` cookies cannot carry a `Domain` attribute (browsers reject the cookie if they do); omitting it still locks the cookie to the exact host that set it (`admin.hearme.com`), which is the isolation that was actually wanted. |
| App topology | One Next.js app and deploy; middleware reads the request hostname: `admin.hearme.com` rewrites to a real `/admin` path segment (not just a route group, since route groups don't appear in the URL), `hearme.com` serves the public routes and returns 404 for `/admin`. Webhook routes and `/api/inngest` are excluded from the rewrite entirely. An `ADMIN_HOST` env var controls which hostname counts as admin in production. Outside production (local and `*.vercel.app` previews, which have no `admin.` subdomain), admin is served directly at the `/admin` path; previews hold no real client data and sit behind Vercel's deployment protection. Middleware is only the first gate: every admin page, route handler and server action also checks the host and the admin session itself, because server action requests can reach a handler without passing through the page route | Both surfaces share the Prisma client, the provider adapters, and most backend logic; a second app and deploy pipeline would duplicate that for no isolation this project needs yet. |
| DB connection | `@prisma/adapter-neon` in its WebSocket pool mode (not the HTTP mode), Neon's pooled connection string at runtime (`DATABASE_URL`) and the direct (unpooled) string for migrations (`DIRECT_URL`); the Prisma major version is pinned at scaffold time and recorded in `AGENTS.md`; Prisma is never imported into middleware (the Edge runtime can't run it); the Vercel function region is pinned to match the Neon project's region | Neon's plain HTTP driver mode does not support Prisma's interactive transactions, which the hold/exclusion logic above needs; the adapter avoids that gap. Matching regions keeps DB latency low. |
| Background jobs | Inngest, used for cleanup and notification only (the hold expiry and overlap are enforced in the database, not by job timing); also the daily retention/deletion jobs and Google Calendar retry/reconciliation | Each of these is a multi step, retryable job; Inngest's durable functions give per step retries without a second deploy surface, and it runs inside the same serverless deploy as the app. Only booking ids are passed in job payloads, never a client's name, email, phone, or note (Inngest stores event payloads, and that data has no reason to live there). |
| Payment provider | Razorpay hosted checkout, behind a `PaymentProvider` adapter: each call takes a caller supplied idempotency key, and returns typed errors marked retryable or terminal so a job runner knows whether to retry | Already set by the scope; the adapter keeps a future provider swap (international payments, deferred) from touching the booking flow, and the typed retryable/terminal split is what Inngest's retry logic needs to behave correctly. A payment that lands against an already expired, now re-held slot triggers an automatic refund through this adapter. |
| Calendar provider | Google Calendar/Meet API, behind a `CalendarProvider` adapter, same idempotency key and typed error shape as above (the calendar event id is derived deterministically from the booking id, so retrying a create is safe) | Already set by the scope. |
| Email provider | Resend, behind an `EmailProvider` adapter, same idempotency key and typed error shape as above | Built by the React Email team, first class Next.js templating for the confirmation email and its `.ics` attachment, strong developer experience at this volume. |
| Rate limiting | Upstash Redis (pay per request, same deploy model as the rest of the stack), used for admin login/TOTP attempt throttling | Kept as a dedicated, battle tested rate limiter rather than hand rolling attempt counting in Postgres, even though admin login volume is low (one account). Webhook idempotency does not use Redis (see the `WebhookEvent` row above): a cache can lose data, and this must never apply a payment twice. |
| Hosting | Vercel | Native fit for the App Router (server actions, image optimization, edge middleware for the hostname split) and a Mumbai edge region for low latency to Indian users; fastest to ship for a solo founder. |
| Data residency | Everything that stores client personal data (the database, its backups, and the functions that decrypt it) lives in one Indian region: Mumbai. Services that only see a booking id, or nothing personal, may sit elsewhere. Every service that sees client personal data outside India is named in the privacy notice. Full map below | Keeps the most sensitive copy of client data (the database and its restore history) in India, keeps the database and the code that reads it next to each other for speed, and makes the privacy notice's "who processes what, where" list complete and true. |
| Observability | Sentry for errors, a structured JSON logger with a redaction list (name, email, phone, note, tokens, auth headers) for logs, and an external uptime check on a `/api/health` route that alerts the founder by email or phone | Official Next.js SDK for errors; redaction stops personal data reaching logs; the uptime check is the 3am alarm a solo operator needs, since nothing else would tell you the site is down. |
| UI | Tailwind CSS + shadcn/ui components, restyled to the HearMe design tokens | Already set by the scope; accessible primitives (dialogs, calendars, switches) that the project owns and can restyle, so it doesn't look like a template. The tokens themselves are decided in the design system spec (scope item 4). |
| Tooling | pnpm, the current Node LTS, the Next.js major pinned at scaffold time | One package manager and pinned runtimes so local, CI and Vercel builds behave the same. |
| Time | UTC everywhere: `timestamptz` columns, `tstzrange` slots, the server `TZ` set to UTC, Inngest cron schedules written in UTC; conversion to IST or the client's zone only at the edges (UI, emails, `.ics`) | One rule removes a whole class of off by one hour bugs in a product whose core object is a time slot. |
| Environments & config | Three environments: local, preview (one Neon branch per pull request, from a data free parent), and production. Each has its own KEK, HMAC key, Razorpay test or live keys, and Google test or production account. All config is read through one typed env module that fails at startup if anything is missing | A missing or wrong secret fails loudly at boot, not halfway through a payment; no real key or client data ever reaches local or preview. |
| Testing | Vitest for unit and integration tests, Playwright for the booking flow end to end; CI runs integration tests against a real Postgres (not a mock) | The no double booking constraint, the exclusion error handling, and the hold logic can only be proven against real Postgres. |
| CI/CD | Vercel's git integration (preview deploy per PR, deploy `main` on merge) plus GitHub Actions for lint, typecheck, Vitest (with a Postgres service), and a Prisma migration dry run as required checks | Vercel's own build does not gate on lint/test/migration safety; GitHub Actions closes that gap without hand rolling the deploy pipeline. |

### Data residency map

Where each service runs, and what client data (if any) it sees. "Personal data" here means a client's preferred name, email, phone, or note.

| Service | Region | Client personal data it sees | Why that is acceptable |
|---|---|---|---|
| Neon (database + restore history) | Mumbai (`aws-ap-south-1`) | All of it, encrypted per record | The one full copy stays in India. If Mumbai is not offered when the project is created, stop and decide again; do not silently fall back to another region |
| Vercel functions | Mumbai (`bom1`), pinned to match Neon | Decrypts it briefly while handling a request; stores nothing | Same region as the database, so no personal data crosses a border in normal operation |
| Upstash Redis | Mumbai | None (login attempt counters and hashed IPs only) | Nothing personal is stored |
| Inngest | Its hosted region (outside India) | None (job payloads carry booking ids only) | Enforced by the "ids only in job payloads" rule above |
| Resend | Its nearest available sending region (outside India) | Name, email, session time (it has to, to send the email); never the note | Named in the privacy notice as an email processor |
| Sentry | Its hosted region (outside India) | None, provided `sendDefaultPii: false` and body scrubbing are on | Named in the privacy notice as a precaution |
| Razorpay | India | Whatever the client enters at checkout; HearMe sends only the booking id (plus email if prefilled) | Indian payment provider |
| Google Workspace (Calendar, Meet) | Google's global infrastructure | Preferred name in the event title; the call itself | Unavoidable for Meet; named in the privacy notice |

## Consequences

**Positive**:
- Every later feature (booking flow, admin dashboard, retention jobs) scaffolds onto real infrastructure instead of guessing at it.
- The no double booking guarantee and the PII envelope are both correct by construction (a database constraint, and ciphertext that is unreadable without the KEK), not habits every new code path has to remember.
- Everything here runs inside a small number of managed services (Vercel, Neon, Inngest, Resend, Sentry, Upstash) a solo founder can operate without a platform engineering function.

**Negative / tradeoffs**:
- Serverless functions on Vercel cannot hold a long running process or a persistent DB connection without a pooling proxy; this is handled by `@prisma/adapter-neon` and the pooled connection string (see the DB connection row above), but it has to be set up correctly from the start, not discovered later.
- Six managed services (Vercel, Neon, Inngest, Resend, Sentry, Upstash) means six vendor relationships and six places a bill or an outage can originate, instead of one box to watch.
- App level encryption means every new field that touches PII has to go through the envelope; a future contributor who writes a raw Prisma query against an encrypted field will get ciphertext, not a readable value, unless they know to go through the encryption service.
- Vercel's free Hobby plan's terms do not permit commercial use; this product takes real payments from day one, so budget for a paid Vercel plan (Pro) before launch, not as an afterthought (tracked in scope item 28, launch readiness).
- Data residency cannot be fully local: Inngest, Resend, Sentry and Google run outside India. Resend and Google necessarily see some personal data, so the privacy notice must name them; "your data never leaves India" can never be promised.
- Rotating the KEK is a real chore, not a config change: every record's DEK has to be re-wrapped with the new KEK by a one off job before the old KEK can be retired. Plan it as a job when the first rotation is needed.
- Neon scales to zero when idle, so the first request after a quiet spell is slower (a cold start). Webhook handlers must tolerate this, and payment and calendar providers retry on failure anyway.
- Vercel limits how long one function may run (shorter on lower plans). Calls to Google and Razorpay must have their own timeouts and hand slow work to Inngest, never block a request.
- A restore window longer than Neon's free tier allows needs a paid Neon plan; choose it alongside the Vercel plan in scope item 28.
- A database region is effectively permanent. Moving Neon out of Mumbai later means a migration and downtime, so the region has to be right on the day the project is created.

**Neutral**:
- Any absolute link the app generates (e.g. in the confirmation email) must be written with the right host in mind (`hearme.com` vs `admin.hearme.com`) from day one.
- Sentry must be configured with `sendDefaultPii: false` and request body scrubbing enabled, or a client's note or contact details can end up in an error report.
- Neon preview branches must be created from a seeded, data free parent branch, not a branch of the production database, or every pull request preview carries a live copy of client PII.
- Neon's point in time restore retention must be configured to 35 days or less to match the backup aging promise in scope item 17 (data retention & deletion jobs). This cap is what actually guarantees "delete my details" reaches backups: a deleted record disappears from restore history once the window passes it. Crypto-shredding covers the live database and its copies, not backups.
- Rate limiting keys on a salted hash of the IP address (a plain hash of an IP can be reversed by trying every address, so it still counts as personal data).

## Follow-up

- [ ] Connect the `getsentry/sentry-mcp` MCP server once Sentry is set up, so errors can be queried directly from the agent instead of pasted in manually (the engineer's own MCP config step).
- [ ] `/audit` should capture these conventions (package manager: pnpm; the provider adapter pattern; the envelope encryption service; hostname based routing) in root `AGENTS.md` once the scaffold exists, per scope item 2 (coding standards & tooling).
- [ ] The KEK (Key Encryption Key) for the PII envelope starts as a Vercel encrypted environment variable; revisit a dedicated cloud KMS (e.g. AWS KMS) for key rotation once there is budget or a compliance requirement for it (see rationale.md, Options considered).
- [ ] Timezone handling (IST plus the client's zone, used throughout the booking flow and the confirmation email) and `.ics` generation are implementation details for the features that need them (booking step 2, confirmation email), not pinned here; recommend Luxon for timezone safe date math and the `ics` npm package for calendar file generation when those specs are written.

- [ ] Legal review (scope items 6 and 28): confirm that India's DPDP law permits the cross border processing in the data residency map (it restricts transfers only to countries the government names, but have a lawyer confirm the current list), and that the privacy notice wording covers every processor listed there.
- [ ] For the data model spec (scope item 3): the ciphertext format (versioned, with IV and auth tag), where each record's DEK is stored, and the explicit list of encrypted fields.
- [ ] For the core booking thread spec (scope item 5): reading the raw webhook body in App Router before verifying the signature, a replay window for Razorpay webhooks, and handling both `23P01` (slot taken) and `40001` (serialization retry) when a hold races another.
- [ ] When creating the Neon project (the scaffold step of this feature), confirm Mumbai is offered and pick it; if not, come back to `/architect` before choosing another region.

## Rationale

Reasoning, the options considered, and the sourcing for every pick above: see [rationale.md](rationale.md).
