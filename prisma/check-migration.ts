import { join } from "node:path";
import { config } from "dotenv";

config({ path: join(__dirname, "../.env.local") });
config({ path: join(__dirname, "../.env") });

// Plain `pg`, not @neondatabase/serverless: this script also runs in CI
// against a generic Postgres service container, which doesn't speak Neon's
// WebSocket/HTTP proxy protocol.
import { Pool } from "pg";

/// CI migration smoke test (spec 0002, Build plan task 10): asserts the
/// no-double-booking exclusion constraint and the AuditLog hardening both
/// exist after `prisma migrate deploy`, so silent drift in the hand-written
/// SQL migration (constraints Prisma Migrate itself can't express or verify)
/// fails the build instead of shipping quietly.

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });

  const extension = await pool.query(
    `SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'`,
  );
  assert(extension.rowCount === 1, "btree_gist extension is missing");

  const exclusion = await pool.query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'booking_blocked_range_excl'`,
  );
  assert(
    exclusion.rowCount === 1 &&
      exclusion.rows[0].def.includes("EXCLUDE USING gist") &&
      exclusion.rows[0].def.includes('"blockedRange"') &&
      exclusion.rows[0].def.includes("HELD") &&
      exclusion.rows[0].def.includes("CONFIRMED"),
    "Booking.blockedRange exclusion constraint is missing, or no longer limited to HELD and CONFIRMED",
  );

  await assertAuditLogRejectsChanges(pool);

  const role = await pool.query(
    `SELECT 1 FROM pg_roles WHERE rolname = 'hearme_app'`,
  );
  if (role.rowCount === 1) {
    const grants = await pool.query(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = 'AuditLog' AND grantee = 'hearme_app'
         AND privilege_type IN ('UPDATE', 'DELETE')`,
    );
    assert(
      grants.rowCount === 0,
      "hearme_app still has UPDATE/DELETE on AuditLog — AC-14 hardening regressed",
    );
  } else {
    // CI creates the role on purpose; a missing one there means the REVOKE
    // check silently stopped running.
    assert(
      !process.env.CI,
      "hearme_app role is missing in CI, so the AuditLog REVOKE check cannot run",
    );
    console.warn(
      "hearme_app role does not exist in this database; skipping the AuditLog REVOKE check (AC-14 is unverified here, not failed).",
    );
  }

  await pool.end();
  console.log("Migration smoke test passed.");
}

/// Tries a real UPDATE and DELETE on an AuditLog row as the connecting role
/// (the owner in CI) and expects both to be refused, then rolls everything
/// back. Checks the behavior, not just that a grant or trigger exists.
async function assertAuditLogRejectsChanges(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "AuditLog" ("id", "actorType", "action", "targetType", "targetId")
       VALUES ('migrate-check-audit', 'SYSTEM', 'LOGIN', 'migrate-check', 'migrate-check')`,
    );

    for (const statement of [
      `UPDATE "AuditLog" SET "targetId" = 'changed' WHERE "id" = 'migrate-check-audit'`,
      `DELETE FROM "AuditLog" WHERE "id" = 'migrate-check-audit'`,
    ]) {
      await client.query("SAVEPOINT attempt");
      const refused = await client.query(statement).then(
        () => false,
        () => true,
      );
      await client.query("ROLLBACK TO SAVEPOINT attempt");
      assert(
        refused,
        `AuditLog accepted "${statement.split(" ")[0]}" — AC-14 hardening regressed`,
      );
    }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error: unknown) => {
  console.error("Migration smoke test FAILED:", error);
  process.exitCode = 1;
});
