# Verify: data model · spec 0002 · updated 2026-11-16
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [x] `pnpm typecheck` passes with the generated Prisma client imported → AC-1
- [x] `pnpm migrate:check` passes (exclusion constraint + btree_gist exist; AuditLog REVOKE checked when `hearme_app` exists) → AC-2, AC-14
- [x] `pnpm exec prisma migrate deploy` is idempotent (re-running against an already-migrated database reports no pending migrations) → AC-1
- [x] `pnpm exec prisma db seed` run twice leaves exactly one `SessionType`, one `AvailabilitySettings`, one `CancellationPolicy` row (no duplicates) → AC-9

## Data / integration

- [x] Two `createBookingHold` calls for time ranges within `bufferMinutes` of each other: the first succeeds, the second returns `{ ok: false, error: { kind: "SLOT_TAKEN" } }` → AC-2
- [x] A `createBookingHold`/`rescheduleBooking` call that hits Postgres `40001` under contention is retried up to 3 times with no backoff and still succeeds without a duplicate row; if all retries fail it falls through to the same `SLOT_TAKEN` result as a real conflict → AC-11
- [x] Encrypt a field with `encryptField`, decrypt with the same `recordId`/`fieldName` → original plaintext returns. Decrypt the same envelope with a different `recordId` → throws (AAD binding rejects the swap) → AC-3
- [x] `hmacEmail` on the same email (varying case/whitespace) returns the same digest twice; a `Booking.emailLookupHmac` lookup finds the row without decrypting any encrypted column → AC-4
- [x] Insert the same `(provider, providerEventId)` into `WebhookEvent` twice → second insert is rejected by the unique constraint, not reprocessed; `redactWebhookPayload` strips any key containing "name"/"email"/"phone" before the row is written → AC-5
- [x] Attempt a direct write to `Booking.status` outside the application's transition functions is not exercised by raw SQL/ORM access from any other code path (code review: only the booking module writes `status`) → AC-6
- [x] Create a `Payment`/`Refund`/`EmailLog` row twice with the same `idempotencyKey` → second create is rejected by the unique constraint; create two `Payment` rows with the same `razorpayOrderId` → rejected → AC-8
- [x] Reschedule a booking and confirm its `EmailLog.idempotencyKey` (derived from `bookingId` + `emailType` + `rescheduleCount`) differs from the pre-reschedule one, so a reminder already queued isn't suppressed as a false duplicate → AC-8
- [x] Edit a `SessionType` price or the `CancellationPolicy` rules and confirm no migration was needed, and an existing `Booking.cancellationPolicyId` still points at the policy row captured at its own hold time, not the newly edited one → AC-9
- [x] Inspect any `timestamptz`-typed column's stored value across a DST boundary or non-UTC client timezone and confirm it reads back as the same instant → AC-10
- [ ] Resolve a `Booking.joinToken` via `/j/<token>` (once that route exists) and confirm it is not derivable from the booking's `id` → AC-12 (route doesn't exist yet, as noted in the spec; confirmed instead that a real `joinToken` isn't textually derived from its `id`)
- [x] Call `eraseContactDetails` and confirm `clientName`/`clientEmail`/`clientPhone`/`emailLookupHmac` are null and `erasedAt` is set while `note`/`noteErasedAt` are untouched; call `eraseNote` independently and confirm the reverse (note nulled, contact fields untouched) → AC-7
- [x] After either erasure function runs, confirm the `Booking` row, its `Payment`, `Refund`, and `EmailLog` rows are still queryable (not deleted) → AC-7
- [x] As a DB role other than `hearme_app` (e.g. the migration/owner role), run `UPDATE`/`DELETE` against `AuditLog` → succeeds (expected: only the owner role can). As `hearme_app`, the same statements fail with a permission error → AC-14

## Acceptance-criteria coverage

- AC-1 (every entity migrated, client generated, no `any`) — covered by the `pnpm typecheck` and `migrate deploy` idempotency steps above.
- AC-2 (exclusion constraint, `SERIALIZABLE` transaction) — covered by `migrate:check` and the overlapping-hold step.
- AC-3 (per-field envelope encryption, AAD-bound) — covered by the encrypt/decrypt roundtrip and AAD-mismatch step.
- AC-4 (email lookup via HMAC, no full decrypt) — covered by the `hmacEmail` determinism step.
- AC-5 (webhook dedup + PII-stripped payload) — covered by the duplicate-webhook-event step.
- AC-6 (status enum, app-only writer) — covered by the status code-review step.
- AC-7 (independent contact/note erasure, related rows survive) — covered by the two erasure steps.
- AC-8 (idempotency keys on Payment/Refund/EmailLog, reschedule-safe) — covered by the duplicate-idempotency-key and reschedule steps.
- AC-9 (session type/policy/availability edits need no migration; policy snapshot) — covered by the `prisma db seed` idempotency and policy-edit steps.
- AC-10 (every timestamp is `timestamptz`) — covered by the DST/timezone step.
- AC-11 (retry `40001` up to 3x, fall through to slot-taken) — covered by the contention step.
- AC-12 (opaque, non-derived `joinToken`) — covered by the join-link step (deferred until the route exists).
- AC-13 (multiple passkeys, replay-protected TOTP, sign-out-everywhere) — schema only in this spec; behavior is exercised once scope item 18 (admin auth & RBAC) is built.
- AC-14 (AuditLog append-only, DB-role hardened) — covered by `migrate:check` and the role-permission step. Verified live on 2026-11-17: `hearme_app` now exists on the Neon project, `DATABASE_URL` connects as it, and direct `UPDATE`/`DELETE` attempts against `AuditLog` as `hearme_app` both fail with "permission denied"; the owner role (`DIRECT_URL`) is unaffected and `hearme_app` can still read/write every other table.
