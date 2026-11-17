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

let client: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!client) {
    const env = getEnv();
    const adapter = new PrismaNeon({ connectionString: env.databaseUrl });
    client = new PrismaClient({ adapter });
  }
  return client;
}
