# Review, feat/data-model, 2026-11-17

**Reviewed by**: claude-opus-5-5 (author on a different model, per /check review)
**Scope**: 18 files reviewed (26 non-skill files changed; vendored skill docs under .agents/, .windsurf/, .claude/ and skills-lock.json skipped), branch vs main
**Verdict**: Blocked

## Summary
This branch lands the full foundation schema from spec 0002 (13 models, 14 enums), a hand-written exclusion constraint for no-double-booking, AuditLog hardening, the envelope-encryption helper, booking hold/reschedule primitives with 40001 retry, the two erasure functions, a typed env module, and a Vitest suite. The schema and migration match the spec closely and the encryption core is sound. Two shared primitives are wrong in ways that will cause harm once they are wired in. `createBookingHold` silently drops `holdExpiresAt`, so holds never expire. `redactWebhookPayload` only looks at top-level keys, so real Razorpay payloads keep all their PII. The buffer is also applied on both sides of both bookings, which doubles the effective gap. CI never runs the new tests.

## Blockers

### 🔴 `holdExpiresAt` is accepted but never written, `src/shared/booking.ts:91-106`
**Problem**: `CreateBookingHoldInput.holdExpiresAt` is required, but the `INSERT` column list and `VALUES` leave out `"holdExpiresAt"`, so every HELD booking is stored with `holdExpiresAt = NULL`.
**Why it matters**: The HELD to EXPIRED transition and the retention job for EXPIRED rows (spec value-sourcing table) both key off `holdExpiresAt`. A hold that is never paid will never expire. Because the exclusion constraint covers HELD rows, that slot stays blocked indefinitely, and the retention date for those rows cannot be computed. The unit tests mock `$executeRaw`, so they can't catch this.
**Suggested fix**: Add `"holdExpiresAt"` to the column list with `${input.holdExpiresAt}::timestamptz`. Add a test that checks the SQL values passed to `$executeRaw`, or better, an integration test that reads the row back.

### 🔴 Webhook redaction only strips top-level keys, `src/shared/encryption.ts:131-144`
**Problem**: `redactWebhookPayload` filters `Object.entries(payload)` one level deep, using a denylist of substrings (`name`/`email`/`phone`). Razorpay nests PII at `payload.payment.entity.email`, `payload.payment.entity.contact` (Razorpay's phone field is named `contact`, which the denylist doesn't match) and `notes.*`. Run on a real Razorpay event, this function strips nothing.
**Why it matters**: AC-5 says the stored `WebhookEvent.payload` never carries client name, email or phone. `WebhookEvent` has no erasure path, so PII written there survives the 90-day contact-details erasure. That defeats the DPDP retention model the spec is built around.
**Suggested fix**: Follow the spec ("keeping only ids, amounts, and status") and switch to an allowlist. Either project each provider's event into a typed, minimal shape (ids, amount, currency, status, event type), or redact recursively. A recursive denylist must at least cover `contact`, `notes`, `vpa`, `card`, `address` and `customer`. Test it against a real Razorpay `payment.captured` fixture.

## Major

### 🟠 Buffer padded on both sides of both bookings doubles the required gap, `src/shared/booking.ts:87-89` (and `:167-169`)
**Problem**: `blockedRange` is `[start - buffer, end + buffer)`, and the constraint compares two padded ranges. Take A at 10:00 to 10:30 with a 15-minute buffer, so A blocks 9:45 to 10:45. B at 10:45 blocks 10:30 to 11:15. Those ranges overlap, so B is rejected. The actual minimum gap is 2 × `bufferMinutes`.
**Why it matters**: The spec invariant is that bookings can't land "within `bufferMinutes` of each other", not within twice that. An availability generator built on `bufferMinutes` will show slots (for example 10:00, then 10:45) that the database then rejects as SLOT_TAKEN. Clients see slots that can't actually be booked. verify.md only checked the "within buffer is rejected" side, never "exactly buffer apart is accepted".
**Suggested fix**: Pad one side only (`[start, end + buffer)` is the usual choice), or pad each side by buffer/2. Document the choice in the spec. Add an integration test that two bookings exactly `bufferMinutes` apart both succeed.

### 🟠 Reschedule has no status guard and reports success for a missing booking, `src/shared/booking.ts:171-180`
**Problem**: The `UPDATE` uses only `WHERE "id" = ...`. It will reschedule a CANCELLED, COMPLETED or EXPIRED booking. Because the exclusion constraint doesn't cover those statuses, nothing at the database level stops it either. If the id doesn't exist, `$executeRaw` returns 0 and the function still returns `{ ok: true }`.
**Why it matters**: The spec says no transition leaves a terminal state and reschedule applies to live bookings. A stale manage link or an admin race could move a cancelled booking and fire a MOVED email. Callers can't tell "rescheduled" apart from "nothing happened".
**Suggested fix**: Add `AND "status" IN ('HELD','CONFIRMED')` to the `WHERE` clause, check the affected-row count, and return a typed `NOT_FOUND_OR_NOT_RESCHEDULABLE` error in the `Result` union instead of `ok`.

### 🟠 CI does not run the test suite, `.github/workflows/ci.yml:66-67`
**Problem**: The branch adds Vitest, a `test` script and four test files, but CI still ends with the placeholder comment "Added once the test runner lands". `pnpm test` never runs.
**Why it matters**: AGENTS.md says CI runs Vitest against a real Postgres. As it stands, none of the new tests gate a merge, and the Postgres service in CI is used only for `migrate deploy`.
**Suggested fix**: Add `- run: pnpm test` after `migrate:check`, using the existing Postgres service. That also provides the place for the integration tests suggested below.

## Minor

### 🟡 Tests mock the wrong error shape and assert nothing on padding, `src/shared/booking.test.ts:13-15, 133-141`
**Problem**: `pgError` puts `code` at the top level. In production the code comes from `meta.driverAdapterError.cause.originalCode`, the nested branch of `pgErrorCode`, which no test exercises. The test "pads the stored range by the current bufferMinutes" only checks that `findFirst` was called, not the range that was written. Nothing touches real Postgres, so none of these tests cover the exclusion constraint, the SERIALIZABLE retry or erasure persistence. They are all mock-only.
**Why it matters**: The two blockers and the buffer bug above all passed these tests. If a Prisma upgrade moves where the error code lives, every conflict would rethrow instead of returning SLOT_TAKEN, and the tests would stay green.
**Suggested fix**: Add a fixture shaped like the real P2010/driver-adapter error. Assert on the template values passed to `$executeRaw`. Add a small integration suite against the CI Postgres covering overlap rejection, adjacent-at-buffer acceptance, a row read-back including `holdExpiresAt`, and erasure leaving Payment/EmailLog rows intact.

### 🟡 AC-14 hardening is vacuous in CI and depends on undocumented manual grants, `prisma/migrations/0001_foundation_schema/migration.sql:363-369`, `prisma/check-migration.ts:36-53`, `.github/workflows/ci.yml:53-56`
**Problem**: CI creates `hearme_app` with no grants at all, so "no UPDATE/DELETE on AuditLog" passes whether or not the REVOKE ran. The migration also does nothing if the role is missing. In Neon, the INSERT/SELECT grants for `hearme_app` were set up by hand (verify.md) and aren't recorded anywhere in the repo. If anyone later runs `GRANT ALL ON ALL TABLES ... TO hearme_app` to cover a new table, the REVOKE is silently undone.
**Suggested fix**: In CI, grant `hearme_app` the same privileges production has before running `migrate deploy`, so the check is meaningful. Then actually attempt an UPDATE as `hearme_app` and expect a permission error. Record the grant script (or the `ALTER DEFAULT PRIVILEGES` setup) in the repo. Also have `check-migration` assert that the constraint's `WHERE` clause still names HELD and CONFIRMED.

### 🟡 Price and policy snapshots are trusted from the caller, `src/shared/booking.ts:22-32`
**Problem**: The spec's value-sourcing table says `priceInPaise`/`gstRatePercent` are copied from `SessionType`, and `cancellationPolicyId` is the latest policy with `effectiveFrom <= now()`, both captured at hold time. The primitive takes all three as caller input, inside the transaction, without checking them. It also never checks `startsAt < endsAt`. An inverted range makes Postgres raise 22000, which is rethrown as an unexpected error.
**Suggested fix**: Read `SessionType` and the current `CancellationPolicy` inside the same transaction and derive the snapshot there. Validate the range up front and return a typed error.

### 🟡 Env validation is lazy and doesn't validate key material, `src/shared/env.ts:20-72`
**Problem**: `getEnv()` runs on first call, not at boot. The doc comment says "validated once at import time", which is inaccurate. KEK and HMAC values are only checked for being non-empty. A KEK that isn't valid base64 or doesn't decode to 32 bytes passes validation, then fails with "Invalid key length" on the first encrypt in a live request. `CURRENT_KEK_VERSION=V1` (uppercase) fails with the misleading message "no matching KEK_V1" even when `KEK_V1` is set.
**Why it matters**: AGENTS.md: "a missing/wrong secret fails loudly at boot."
**Suggested fix**: Validate that each keyring entry decodes to exactly 32 bytes. Normalize the case of the `CURRENT_*` versions. Call `getEnv()` from Next's `instrumentation.ts` `register()` so validation really runs at boot.

### 🟡 Decryption has no envelope parser or typed failure, `src/shared/encryption.ts:92-113`
**Problem**: `decryptField` takes an `Envelope`, but Prisma returns `JsonValue`, so every caller has to cast without any runtime check. `envelope.v` is never checked. Tamper, AAD mismatch and unknown-KEK failures all come out as bare `Error`s. The shared-layer rule asks for typed errors or `Result` returns for expected failures.
**Suggested fix**: Export a zod `parseEnvelope(json)`. Reject unknown `v` values. Return a `Result` with typed reasons (`TAMPERED`, `UNKNOWN_KEK`, `MALFORMED`) so the admin UI can degrade gracefully when a record fails to decrypt.

### 🟡 `emailLookupHmac` carries no key version, `src/shared/encryption.ts:118-129`
**Problem**: The HMAC always uses the current key version, and the stored value doesn't record which key produced it. Once `CURRENT_HMAC_KEY_VERSION` rotates, email search silently stops matching every older row.
**Suggested fix**: Prefix the stored digest with its version (for example `v1:...`) and have search compute digests for all configured versions, or decide in the spec that the HMAC key is never rotated.

### 🟡 Erasure writes no audit row and isn't idempotent, `src/shared/erasure.ts:13-41`
**Problem**: The spec's security model makes an `AuditLog` row (`BOOKING_ERASED`) mandatory for booking erasure. Neither function writes one, and nothing makes callers do it. Running either function again overwrites the original `erasedAt`/`noteErasedAt` timestamp. A missing booking surfaces as a raw Prisma P2025 throw.
**Suggested fix**: Write the erasure and its `AuditLog` row in one transaction, inside this function. Guard with `erasedAt IS NULL` (or `noteErasedAt IS NULL`) so the first erasure time is kept. Return a `Result` instead of throwing.

### 🟡 Duplicated retry loop, `src/shared/booking.ts:114-146, 158-203`
**Problem**: `createBookingHold` and `rescheduleBooking` repeat the same mutable `for` loop, error classification and padding math line for line. That conflicts with the project's functional style rule and will drift.
**Suggested fix**: Extract a `withSerializableRetry(db, fn)` helper that returns a `Result`, plus a pure `blockedRangeFor(start, end, buffer)`. The pure helper also makes the padding unit-testable.

## Nits
- ⚪ `prisma/migrations/0001_foundation_schema/migration.sql:345-346`: the comment says btree_gist is needed for "an equality column (status)", but the constraint has no equality column; status is in a partial `WHERE` clause. Either drop the extension or fix the comment.
- ⚪ `src/shared/encryption.ts:9-10`: the module comment says "per-record DEK", but the implementation (correctly) uses a per-field DEK.
- ⚪ `src/shared/db.ts:14-23`: the module-level singleton isn't stored on `globalThis`, so Next dev HMR will open a new Neon pool on every reload.
- ⚪ `src/shared/booking.ts:75-78`: a missing `AvailabilitySettings` row silently becomes a 0-minute buffer. Failing closed, or at least logging, would be safer.
- ⚪ `src/shared/env.ts:24-31`: `collectKeyring` builds its result with a mutable object and a loop, where `Object.fromEntries(... .filter().map())` would match the project style.

## Strengths
- The schema and migration follow spec 0002 almost field for field: every timestamp is `timestamptz`, every unique constraint required by AC-5 and AC-8 is present, and `Unsupported("tstzrange")` plus a partial `EXCLUDE USING gist` scoped to HELD/CONFIRMED is the right way to enforce no-double-booking at the database level.
- The envelope encryption is sound: AES-256-GCM, a fresh DEK and IV per field, the DEK wrapped by a versioned KEK, and AAD binding `recordId:fieldName`, with tests proving that swapping a ciphertext between records or fields fails.
- `migrate:check` as a CI drift guard for the hand-written SQL is a good idea, and the erasure tests pin down exactly which fields each function writes, so the two erasures can't overlap.

## Test coverage
Unit coverage is solid for the encryption round-trip, AAD binding, HMAC normalization, env parsing and the retry decision logic. All of it is mock-based, though, and CI doesn't run it. Not covered: the SQL actually written by `createBookingHold` and `rescheduleBooking` (the missing `holdExpiresAt` and the doubled buffer both slip through); the real Prisma/driver-adapter error shape; nested webhook payloads; reschedule of a missing or terminal booking; and any integration test against Postgres for the exclusion constraint, 40001 under contention, or erasure leaving related rows intact (AC-2, AC-7, AC-11), which AGENTS.md expects CI to run.
