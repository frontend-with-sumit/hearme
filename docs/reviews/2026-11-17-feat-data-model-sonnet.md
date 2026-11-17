# Review, feat/data-model, 2026-11-17

**Reviewed by**: Sonnet 5.5 (author on a different model)
**Scope**: 25 files changed (about 20 application/config files in focus), branch vs main
**Verdict**: Changes requested

## Summary
Lands the full foundation schema, a hand-written migration with the buffer-aware exclusion constraint, an AES-256-GCM envelope helper with AAD binding, hold/reschedule transactions, and erasure functions. The schema, constraint and envelope crypto are solid and match the spec. The weak points are the application-layer pieces around them: the hold insert silently drops `holdExpiresAt`, webhook redaction does not handle real (nested) payloads, the AuditLog hardening is likely a no-op, the 40001 retry may never fire against real Prisma errors, and the tests never run in CI.

## Major
### 🟠 `holdExpiresAt` is accepted but never written, `src/shared/booking.ts:91`
**Problem**: `CreateBookingHoldInput.holdExpiresAt` is required, but the raw `INSERT` column list omits `"holdExpiresAt"`. Every hold is stored with NULL expiry.
**Why it matters**: The HELD to EXPIRED timer and the 90 day retention date for EXPIRED rows both derive from this column (spec Value sourcing). Holds never expire, so an abandoned checkout blocks the slot forever via the exclusion constraint. No test inspects the SQL, so this is invisible.
**Suggested fix**: Add the column and parameter to the INSERT, and add a test (ideally against real Postgres) that the row has the expected `holdExpiresAt`.

### 🟠 Webhook redaction only filters top-level keys and misses Razorpay's phone field, `src/shared/encryption.ts:131-144`
**Problem**: `redactWebhookPayload` filters only the top-level keys of the object. Real Razorpay payloads nest personal data (`payload.payment.entity.email`, `.contact`, `.notes`, `.customer_details`, `.card.name`). Razorpay's phone field is named `contact`, which does not contain "phone". Matching is by substring, so it also over-strips unrelated keys such as `username`, `filename`, `hostname`.
**Why it matters**: AC-5 and the key invariant say stored payloads never carry name, email or phone. As written, a real payload would be stored with PII, in a table with no retention timer. The unit test only exercises flat objects, so it passes.
**Suggested fix**: Redact recursively through objects and arrays, include provider-specific keys (`contact`, `notes`, `customer_details`), and prefer an allowlist (ids, amounts, status) as the spec describes ("keeping only ids, amounts, and status"). Add a test with a nested Razorpay-shaped payload.

### 🟠 AuditLog REVOKE is conditional and likely ineffective (AC-14), `prisma/migrations/0001_foundation_schema/migration.sql:363-369`
**Problem**: The REVOKE runs only if a `hearme_app` role already exists, otherwise it is silently skipped. Even when it runs, REVOKE removes nothing unless the role was previously granted UPDATE/DELETE, and a role that owns the table or inherits from PUBLIC/default privileges is unaffected. `src/shared/db.ts` connects with `DATABASE_URL`, which on Neon is normally the owner role, not `hearme_app`. Nothing creates the role or grants it a minimal privilege set (only INSERT/SELECT on AuditLog).
**Why it matters**: The spec calls this a hard guarantee ("even a bug cannot alter or remove an audit row"). In practice nothing guarantees the running app uses a restricted role, so the audit log is mutable.
**Suggested fix**: Create the role in the migration (or an explicit documented provisioning step) with explicit GRANTs (SELECT, INSERT only on AuditLog; full on others), make the app's `DATABASE_URL` use it, and also revoke TRUNCATE. Fail the migration or the check, not skip, when the role is absent in non-dev environments.

### 🟠 CI smoke test for AC-14 is vacuous, `prisma/check-migration.ts:36-51` and `.github/workflows/ci.yml`
**Problem**: CI creates `hearme_app` with no grants, then asserts it has no UPDATE/DELETE on AuditLog. That is true whether or not the REVOKE exists. The check also only warns and passes when the role is absent.
**Why it matters**: It gives false assurance for the exact drift the spec asked this test to catch.
**Suggested fix**: In CI, grant the role privileges (e.g. via default privileges or explicit GRANT ALL) before migrate so the REVOKE is observable, or assert via `has_table_privilege('hearme_app','"AuditLog"','UPDATE')` after a grant. Make absence of the role a failure in CI.

### 🟠 `pnpm test` is not run in CI, `.github/workflows/ci.yml:57-59`
**Problem**: The workflow ends with a comment "Added once the test runner lands" although the runner and 525 lines of tests are in this PR. AGENTS.md says CI runs Vitest against a real Postgres.
**Why it matters**: The whole suite is ungated; regressions in encryption or booking logic merge silently.
**Suggested fix**: Add a `pnpm test` step (with the same env, plus KEK/HMAC test vars) after migrate.

### 🟠 40001 retry probably never triggers against real Prisma errors, `src/shared/booking.ts:44-64`
**Problem**: `pgErrorCode` reads `meta.driverAdapterError.cause.originalCode`, falling back to `error.code`. In Prisma 7 driver adapters, SQLSTATE 40001 is mapped to a `TransactionWriteConflict` kind and surfaced as `P2034` (and the nested cause carries no `originalCode`), whereas only unmapped errors like 23P01 keep `originalCode`. I could not run it against Neon, so this is a risk, not a confirmed bug. If correct, a serialization failure is thrown as an unhandled error instead of retried then reported as SLOT_TAKEN, violating AC-11.
**Why it matters**: Under real contention (the case SERIALIZABLE is chosen for) users get 500s rather than "slot taken".
**Suggested fix**: Also treat `P2034` as the serialization failure, and add a real-Postgres concurrency test (two parallel holds) instead of only mocks that fabricate `{code: "40001"}`.

### 🟠 `rescheduleBooking` does not verify the booking exists or is reschedulable, `src/shared/booking.ts:171-180`
**Problem**: The UPDATE has no check on affected row count and no status predicate. A nonexistent id returns `{ok: true}`; a CANCELLED/COMPLETED/EXPIRED booking is silently moved (and, since the constraint is partial on status, a cancelled row would not even be guarded) and has `rescheduleCount` bumped.
**Why it matters**: Violates the spec's "no transition leaves a terminal state" and gives callers a false success. Also clobbers `previousTimeRange` on repeated calls without a real change.
**Suggested fix**: Add `AND "status" IN ('HELD','CONFIRMED')`, check the returned row count, and return a typed not-found/not-reschedulable error.

## Minor
### 🟡 KEK/HMAC key material not validated at boot, `src/shared/env.ts:20-59`
Spec/AGENTS require a bad secret to fail loudly at boot. Only presence is checked; a KEK that is not 32 bytes of base64 fails at first encrypt, mid-request. Validate decoded length (32 bytes) per key in `parseEnv`. Also the header comment says "validated at import time" but `getEnv()` is lazy; nothing triggers it at boot.

### 🟡 `emailLookupHmac` has no key version, `src/shared/encryption.ts:118-129`
Only the current HMAC key is ever used for lookup, and the column stores no version, so rotating `HMAC_KEY_Vn` makes existing rows unfindable with no way to try older keys. Decide the rotation story (store version prefix, or compute against all keyring versions at query time).

### 🟡 Missing buffer settings silently defaults to 0, `src/shared/booking.ts:75-78`
If `AvailabilitySettings` has no row, holds are created with no buffer, weakening the no-double-booking guarantee instead of failing. Prefer an explicit error. Also `hold`/reschedule do not validate `startsAt < endsAt`; a bad range surfaces as an unclassified DB error.

### 🟡 Tests assert almost nothing about the SQL, `src/shared/booking.test.ts:131-145`
The buffer test asserts only that `findFirst` was called (not the padded range), and the null-settings test asserts only `ok`. Everything is mocked, so the real exclusion constraint, serializable behavior, the error-shape parsing and the dropped `holdExpiresAt` are all untested despite a real Postgres being available in CI. Erasure tests likewise only check mocked `update` args.

### 🟡 Seed requires full encryption env, `prisma/seed.ts:11`
Importing `getDb` pulls in `getEnv()`, which demands KEK/HMAC vars just to seed non-sensitive rows. Minor friction; acceptable if documented.

## Nits
- ⚪ `src/shared/booking.ts:19` local `Result<T>` type will collide with the project-wide Result pattern when adapters add theirs; consider moving to a shared type.
- ⚪ `src/shared/db.ts:16` public export lacks a doc comment (AGENTS rule); `getEnv` is similar but documented.
- ⚪ `src/shared/booking.ts:118-145` and `:162-202` duplicate the retry loop; extract one `withSerializableRetry` helper.
- ⚪ `src/shared/env.ts:63` module-level mutable cache is at odds with the immutability rule (reasonable here, but worth a comment).

## Strengths
- Envelope encryption is correct: per-field random DEK, AES-GCM with AAD bound to record+field, versioned KEK, and good negative tests (wrong record, wrong field, tampering, unknown KEK).
- The exclusion constraint is properly scoped (`WHERE status IN ('HELD','CONFIRMED')` on the buffer-padded `blockedRange`, with `btree_gist`), and the schema matches the spec entity-for-entity with `timestamptz` everywhere and the right unique constraints.
- Erasure functions are independent and minimal, using `Prisma.DbNull` correctly for Json columns.
- Clear doc comments explaining the why, and the CI wiring of a real Postgres plus migrate deploy plus drift check is the right direction.

## Test coverage
Unit tests exist for encryption (good), env, erasure and booking, all beside source. Coverage is shallow where risk is highest: booking tests are fully mocked and fabricate the error shape, so the retry path, the INSERT contents and the constraint are untested; `redactWebhookPayload` has no nested-payload case; there is no test for reschedule of a missing or terminal booking; and none of it runs in CI (see Major).
