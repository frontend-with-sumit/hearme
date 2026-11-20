import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../generated/prisma/client";
import { getEnv } from "./env";

/// Shared Prisma client for the whole app. Uses @prisma/adapter-neon in its
/// WebSocket pool mode (per spec 0001 — Neon's plain HTTP driver mode does
/// not support interactive transactions, which the hold/exclusion logic needs).
/// Never import this into middleware: the Edge runtime can't run Prisma.

neonConfig.webSocketConstructor = ws;

// Kept on globalThis so Next dev hot reloads reuse one Neon pool instead of
// opening a new one on every module reload.
const globalForDb = globalThis as { hearmeDb?: PrismaClient };

/// Returns the one shared Prisma client, creating it on first use from the
/// validated env. Pass a different client to the shared-layer functions in tests.
export function getDb(): PrismaClient {
  if (!globalForDb.hearmeDb) {
    const env = getEnv();
    const adapter = new PrismaNeon({ connectionString: env.databaseUrl });
    globalForDb.hearmeDb = new PrismaClient({ adapter });
  }
  return globalForDb.hearmeDb;
}
