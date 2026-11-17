# Rationale: 0002. Data model

## Context

Spec 0001 picked the stack and the shape of a few cross cutting mechanisms (the no double booking database constraint, the envelope encryption approach for personal data) but explicitly deferred three things to this spec: the full entity list, the exact ciphertext storage format, and where each record's encryption key is kept. Scope item 3 ("Data model") exists specifically to settle these before any feature starts writing real queries against guessed tables.

The forces at play: this is a solo founder product handling real payments and personal data under India's DPDP law, with a crisis protocol where a bug has real consequences, so the schema has to get retention, erasure, and audit logging right from the start rather than retrofitted. At the same time the project is pre revenue and the build approach is Tracer Bullet (prove one thin real booking end to end first), which argues against over designing. The two pull in different directions: scope item 3's own "done when" line resolves this by asking for the full foundation now ("without needing a breaking migration for later slices"), while the actual booking flow logic (slot generation, checkout, admin screens) stays deferred to its own slices. This spec is schema only; no application logic beyond the few invariants a schema must enforce (the exclusion constraint, uniqueness) is designed here.

Not deciding this now means every later feature spec (booking flow, admin auth, availability settings, pricing) would either invent its own slice of schema in isolation, risking incompatible shapes that need a breaking migration to reconcile, or stall waiting for this spec anyway. Settling it once, as a single coherent target, is cheaper than discovering the gaps piecemeal.

## Options considered

### Option 1: Model the full foundation now (chosen)

Migrate every entity the current scope will eventually need (not just the 9 scope item 3 names), including `SessionType`, `AvailabilitySettings`, `CancellationPolicy`, `AdminUser`, and `AdminSession`, even though the features that build their UI (items 18, 22, 23) come later.

**Pros**:
- No later foundation phase feature forces a breaking migration; every later spec just reads and writes an existing table.
- One coherent, reviewed schema instead of several uncoordinated slices that might not compose cleanly.

**Cons**:
- More upfront design before any feature ships; a few of these tables (AdminUser, AvailabilitySettings) sit unused until their own feature is built.
- A design mistake here is more expensive to unwind, since more is built on top of it before it is exercised by real code.

### Option 2: Model only the 9 named entities, defer the rest

Migrate just Booking, Payment, Refund, WebhookEvent, GoogleConnection, EmailLog, AuditLog as scope item 3 literally names them (dropping the unused `Job` and `Settings` placeholders), and let items 18/22/23 design their own tables when they're built.

**Pros**:
- Smaller spec, faster to ship, nothing speculative.

**Cons**:
- Directly risks the outcome scope item 3's own "done when" line rules out: item 23 (pricing/cancellation policy) and item 18 (admin auth) are both foundation-adjacent and almost certain to need their own tables soon, at which point a migration coordinating them with the already-shipped booking flow is exactly the breaking change this spec exists to avoid.

### Option 3: Shared `ClientDetails` table instead of PII columns on `Booking`, one DEK per booking

Normalize client personal data into its own table keyed by `bookingId`, with a single data encryption key per booking rather than one per field.

**Pros**:
- Fewer encryption keys to manage per booking; a conventional normalized shape.

**Cons**:
- The product has no concept of a returning client (client accounts are explicitly deferred), so PII is always 1:1 with a booking; the extra table buys nothing but a join on every read.
- A single DEK per booking means crypto-shredding the note (7 day retention) also destroys the name/email/phone (90 day retention), since they share a key; it cannot support the per-field retention timers scope item 17 requires.

## Rationale

Scope item 3's own "done when" line ("without needing a breaking migration for later slices") is the deciding force: Option 2 reads smaller today but reopens exactly the risk this spec exists to close, since items 18, 22, and 23 are foundation-adjacent, not speculative futures. Option 1 costs more design time now in exchange for every later feature spec treating this schema as fixed ground.

The per-field envelope (Option 1) over a shared DEK (Option 3) follows directly from the per-field retention timers already decided for scope item 17 (note gone in 7 days, contact details in 90): a shared key cannot destroy one field without destroying all of them, which would either violate the 7 day note promise or the 90 day contact promise. Per-field DEKs, each wrapped by the current KEK version from spec 0001's keyring, make each field's retention timer independently enforceable by deleting that field's own DEK.

Dropping the originally named `Job` and generic `Settings` entities (from scope item 3's literal wording) is a deliberate reduction, not an oversight: Inngest (chosen in spec 0001) already owns job run history and retries, and every concrete setting the product actually needs now has a properly typed table (`AvailabilitySettings`, `CancellationPolicy`, `SessionType`, `GoogleConnection`), leaving nothing for a generic key-value table to hold.

**Revisions from an independent cross check.** A read only review on a different model, run after the first draft, found several load bearing gaps the first pass missed: the single `erasedAt` column could not support the two independently timed PII retention rules already decided for scope item 17 (note at 7 days, contact details at 90), the encryption envelope never actually named where the wrapped DEK lived, the exclusion constraint ran against the raw `timeRange` rather than a buffer-aware range (so two bookings inside the configured buffer could both succeed), and several columns later scope items will need (a join token, revocable manage links, reschedule history, a booking outcome, passkey storage) had no home yet. The spec above reflects the fixes: a separate `noteErasedAt`, a fully specified envelope shape with AAD binding, a `blockedRange` column the constraint actually runs on, and the added columns/tables. This is why the schema below is larger than a first pass at scope item 3's literal nine-entity list would suggest; each addition traces to a specific later scope item's acceptance criteria, not speculative scope creep.

## References

**Project sources** (verifiable, in this repo):
- Spec [0001](../0001-stack-architecture/index.md), the stack decision this spec builds on (Postgres via Prisma on Neon, the exclusion constraint approach, the envelope encryption approach, the per-record DEK / versioned KEK keyring)
- `docs/scope/scope.md`, scope item 3 ("Data model") and the later items this spec models ahead of time (6, 17, 18, 21, 22, 23, 25, 26)
- `prisma-client-api`, `prisma-cli`, `prisma-driver-adapter-implementation` (`.agents/skills/`), the installed Prisma skills whose conventions this schema follows (native Prisma enums, the `Unsupported("tstzrange")` escape hatch, hand written SQL migrations for what Prisma Migrate cannot express)

**Practices & standards**:
- Envelope encryption with per-record data encryption keys, wrapped by a versioned key encryption keyring (crypto-shredding as a deletion mechanism)
- Idempotency keys for operations involving money or external side effects (payments, refunds, outbound email)
- Append only audit logging for actions touching money, access control, or compliance scope
- Database level exclusion constraints (`EXCLUDE USING gist`) for overlap-free interval scheduling, over application level locking
