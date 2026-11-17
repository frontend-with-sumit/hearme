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
      exclusion.rows[0].def.includes('"blockedRange"'),
    "Booking.blockedRange exclusion constraint is missing or changed shape",
  );

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
    console.warn(
      "hearme_app role does not exist in this database; skipping the AuditLog REVOKE check (AC-14 is unverified here, not failed).",
    );
  }

  await pool.end();
  console.log("Migration smoke test passed.");
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
