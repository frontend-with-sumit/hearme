## Context

HearMe is a solo founder, paid 1:1 listening service: one person sells booked video conversations over Google Meet. Three forces shape the foundation more than usual for a product this small.

First, real money and real personal data move through it from day one. Payments go through Razorpay, and the booking details, preferred name, email, phone, and an optional note, are personal data under India's DPDP law, not a hypothetical future concern. A crisis protocol exists for when a client is in distress, which means a bug in this system can have consequences beyond a bad user experience.

Second, there is no operations team. One person builds, ships, and will be paged by anything that breaks, including at 3am. The foundation has to be operable by one person without a platform engineering function, which rules out anything that demands dedicated infrastructure staff to run safely.

Third, two business rules are load bearing and timing sensitive: a booking slot can never be double sold, and a payment hold on a slot must expire exactly on schedule or the slot wrongly stays blocked (or wrongly opens up while a payment is in flight). Both have to be correct under concurrent requests from the first day, not hardened later.

This spec covers the platform, pattern, and provider layer: hosting, database host, the concurrency and encryption patterns, background job infrastructure, and the app's topology. It does not cover the data model's entities and fields (a separate decision, scope item 3) or the specifics of admin authentication (passkey/password plus TOTP, scope item 18); those are out of scope here and get their own specs.

## Options considered

### Option 1: Managed serverless stack (Vercel + Neon + Inngest + Resend)

A Next.js app on Vercel, Postgres on Neon through Prisma, Inngest for anything that runs on a delay or needs retries, Resend for email, Sentry for errors, Upstash Redis for rate limiting. Every piece is a managed service with a free or cheap tier at this traffic level, and all of it fits inside Vercel's serverless/edge execution model.

**Pros**:
- No server to patch, scale, or lose sleep over; every layer is a managed service with its own on call team.
- Neon's database branching gives a real, isolated preview database per pull request, which matters for migration safety with only one engineer reviewing their own changes.
- Every layer has a free or near free tier at this traffic level; the whole stack can run for low double digit dollars a month until the business actually grows.

**Cons**:
- Serverless functions cannot hold a long running connection or process; Prisma needs a pooled connection string (Neon provides one) and every background job has to be modeled as short, retryable steps rather than a long running worker.
- Six vendor relationships (Vercel, Neon, Inngest, Resend, Sentry, Upstash) instead of one, each with its own billing and status page to watch.

### Option 2: Container based, self managed (Railway + Railway Postgres + QStash + Resend)

A Next.js app deployed as a container on Railway, Postgres hosted by Railway itself, QStash for scheduled/delayed HTTP calls, Resend for email. Still managed infrastructure, but with a long running container instead of serverless functions, and one dashboard for both the app and the database.

**Pros**:
- A long running process is available if a future feature needs one (a persistent connection, a WebSocket), which serverless does not offer.
- One dashboard and one bill for both hosting and the database, simpler to watch than five separate vendors.

**Cons**:
- QStash has no step level retry model of its own; the multi step calendar sync and reconciliation logic (retry, then re-check state, then retry again) would have to be hand rolled in the app instead of leaning on Inngest's durable functions.
- Railway Postgres has no database branching; a migration mistake in a preview environment risks touching a shared database unless a second Postgres instance is manually provisioned per branch.
- Less Next.js specific tooling than Vercel (no built in edge functions, no automatic image optimization pipeline).

### Option 3: Self hosted (Hetzner/DigitalOcean + Cloudflare + self hosted Postgres + cron)

A VPS running the Next.js app and Postgres directly, a cron job (e.g. `node-cron` or system cron) for scheduled work, Cloudflare in front for TLS and DDoS protection. The cheapest option by a wide margin at this traffic level.

**Pros**:
- Lowest cost by far; a single small VPS covers hosting and the database.
- Full control over every layer, nothing hidden behind a managed service's abstraction.

**Cons**:
- Every operational concern (TLS renewal, OS patching, Postgres backups and point in time recovery, process supervision, scaling) becomes the founder's job, with no managed fallback, for a product that already carries real compliance and payment risk.
- No database branching, no managed preview environments; testing a migration safely needs manual setup every time.
- A VPS going down at 3am with no on call team behind it is a worse failure mode for a product with a crisis protocol than a managed platform's status page and SLA.

## Rationale

Option 1 fits the actual constraint better than the other two: one person, no ops function, real compliance and payment stakes from day one. Option 3's appeal is cost, but it converts every piece of infrastructure into something the founder personally operates at 3am, which is the wrong tradeoff for a product that already has a crisis protocol for its users; it also has no good answer for database branching, which matters more here than usual because there is no second reviewer to catch a bad migration. Option 2 is a reasonable middle ground, and would be the fallback if Vercel's pricing became a problem at scale, but QStash's lack of durable, multi step retries is a real gap against the calendar sync and reconciliation requirement (scope item 13), and Railway Postgres's lack of branching reintroduces the same migration risk as Option 3.

Within Option 1, the no double booking constraint is enforced in the database (`EXCLUDE USING gist`) rather than in application code, because a database constraint cannot be bypassed by a code path someone forgets to lock; this is the standard, proven mechanism for "no overlapping ranges" in Postgres. The PII envelope is encrypted in the application, not in the database (`pgcrypto`) or through a third party field encryption vendor, because app level encryption means a database breach alone (the most common real world breach vector for a hosted database) exposes nothing readable, with no new vendor dependency on the path to every PII read. Admin sessions are stored server side rather than as a stateless JWT because the ability to revoke a session instantly is a real requirement for an account that can see client PII and issue refunds, not a nice to have.

The PII envelope uses a **per-record** DEK, wrapped by a KEK, rather than one key encrypting everything directly. Destroying one record's DEK makes that record unreadable in the live database and in any copy or export made from it (**crypto-shredding**). **Correction (2026-11-11, from the cross check):** an earlier version of this spec claimed crypto-shredding also reaches into Neon's point in time restore history. It does not. Restoring an old backup restores the old DEK alongside the ciphertext, so the record is readable again in that restore. The promise in scope item 17 (deletion reaches backups within 35 days) is fulfilled by capping the restore window at 35 days, not by shredding. Shredding remains worth having for the live database and its exports, and per-record keys also limit what one leaked key exposes.

**Data residency (added 2026-11-11).** The engineer asked to pin everything to India and record what leaves it. Full localisation is not possible with this stack (Inngest, Resend, Sentry and Google have no India only option worth switching for), and it is not what the risk actually calls for. The real exposure is the one complete, long lived copy of client data: the database and its restore history. Pinning that copy, and the functions that decrypt it, to Mumbai covers the meaningful risk. The other services are either kept free of personal data by design (Inngest gets ids only, Sentry is scrubbed, Upstash holds counters), or are unavoidable processors that the privacy notice names (Resend for the email, Google for Meet). Swapping vendors purely for an India region was rejected: it would trade a proven, low ops stack for weaker tools, to solve a problem the encryption and the "ids only" rule already contain.

### Landscape scan (2026)

A web search across the undecided layers, run during this design conversation, confirmed the picks above were still current and not stale:

- **Hosting**: Vercel, Railway, and Fly.io remain the three realistic managed options for a Next.js app with India traffic; Hetzner plus Cloudflare is the cost floor but trades every ops concern to the founder. Vercel's Mumbai edge region and native App Router support were the deciding factor at this team size.
- **Database**: Neon versus Supabase is now a live, well documented comparison; Neon's serverless/branching model fits a Prisma heavy, Vercel deployed app better than Supabase's bundled auth/storage/realtime, most of which this project would not use since admin auth and storage are built custom.
- **Background jobs**: Inngest and Trigger.dev are both durable function platforms as of 2026; QStash is a thinner, HTTP only alternative. Inngest's step level retries were the deciding factor for the calendar sync/reconciliation requirement.
- **Email**: Resend, Postmark, and AWS SES are the three top rated transactional email APIs in 2026; Resend's React Email heritage and Next.js first developer experience fit this project's volume and stack.
- **PII encryption**: current practice for encrypting PII fields in a Postgres plus Prisma app in 2026 is application level envelope encryption (AES-256-GCM, a per record DEK wrapped by a KEK), matching the choice above; a dedicated vendor (e.g. CipherStash) exists but adds a paid dependency this project's PII surface does not yet need.

## References

**Project sources** (verifiable, in this repo):
- `docs/scope/scope.md`, scope item 1 (stack & architecture), already names Next.js App Router, TypeScript, Tailwind plus shadcn/ui, Postgres/Prisma, the provider adapters, the booking state machine, and the encrypted PII envelope as the starting point for this decision.
- `docs/scope/scope.md`, scope item 12, already names Razorpay hosted checkout and the 10 minute payment hold.
- `docs/scope/scope.md`, scope item 13, already names the Google Calendar/Meet integration and its retry/reconciliation requirement.
- `docs/scope/scope.md`, scope item 18, already names passkey/password plus mandatory TOTP and `__Host-` session cookies for admin auth.
- `prisma/skills` and `vercel-labs/agent-skills@vercel-react-best-practices`, installed community skills (see `## Decision`), confirmed current and relevant during this conversation's tool discovery step.

**Practices & standards**:
- `EXCLUDE USING gist` range exclusion constraints for "no overlapping interval" invariants (the standard Postgres mechanism for this exact problem, not specific to this project).
- Envelope encryption (a per record DEK wrapped by a KEK) as current best practice for application level PII encryption.
- Server side, revocable sessions over stateless JWTs for any account with elevated access (PII read, refund authority).
- OWASP session management guidance for the `__Host-`, `HttpOnly`, `SameSite=Strict` cookie attributes already decided in scope item 18.

**Links** (web verified during this conversation's landscape scan):
- [Vercel pricing](https://vercel.com/pricing)
- [Neon vs Supabase](https://www.rapidevelopers.com/md/vs/neon-vs-supabase)
- [Serverless background jobs and message queues in 2026](https://upstash.com/blog/serverless-background-jobs-and-message-queues-every-major-option-in-2026)
- [Resend](https://resend.com)
- [Sentry MCP server](https://mcpservers.org/servers/getsentry/sentry-mcp)
