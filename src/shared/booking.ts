import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { getDb } from "./db";

/// Booking creation/reschedule (spec 0002, Build plan task 8): the one place
/// that writes Booking.timeRange/blockedRange. Both are Unsupported("tstzrange")
/// columns Prisma's query builder cannot write, so this runs raw SQL inside a
/// SERIALIZABLE transaction, retrying a serialization failure and falling
/// through to "slot taken" on either a real conflict or an exhausted retry
/// (AC-2, AC-11). Full booking input (client details, consent, etc.) is
/// designed by the feature specs that call this; this is the shared primitive.

const EXCLUSION_VIOLATION = "23P01";
const SERIALIZATION_FAILURE = "40001";
const MAX_SERIALIZATION_RETRIES = 3;

export type SlotTaken = { kind: "SLOT_TAKEN" };
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: SlotTaken };

export type CreateBookingHoldInput = {
  sessionTypeId: string;
  cancellationPolicyId: string;
  priceInPaise: number;
  gstRatePercent: number;
  timeZone: string;
  consentVersion: string;
  startsAt: Date;
  endsAt: Date;
  holdExpiresAt: Date;
};

export type BookingHold = {
  id: string;
  joinToken: string;
};

// Prisma wraps a raw-query failure in a generic P2010; the real Postgres
// error code the driver adapter preserved lives nested under
// error.meta.driverAdapterError.cause.originalCode (see the
// prisma-driver-adapter-implementation skill: "preserve original database
// error code/message").
function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const meta = (error as { meta?: unknown }).meta;
  if (typeof meta === "object" && meta !== null) {
    const driverAdapterError = (meta as { driverAdapterError?: unknown })
      .driverAdapterError;
    if (typeof driverAdapterError === "object" && driverAdapterError !== null) {
      const cause = (driverAdapterError as { cause?: unknown }).cause;
      if (typeof cause === "object" && cause !== null) {
        const originalCode = (cause as { originalCode?: unknown }).originalCode;
        if (typeof originalCode === "string") {
          return originalCode;
        }
      }
    }
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

// Duck-typed to just the members used, instead of naming Prisma's internal
// interactive-transaction client type (Omit<PrismaClient, ITXClientDenyList>).
type AvailabilityReader = {
  availabilitySettings: {
    findFirst: PrismaClient["availabilitySettings"]["findFirst"];
  };
};
type RawExecutor = { $executeRaw: PrismaClient["$executeRaw"] };

async function currentBufferMinutes(tx: AvailabilityReader): Promise<number> {
  const settings = await tx.availabilitySettings.findFirst();
  return settings?.bufferMinutes ?? 0;
}

async function insertHold(
  tx: RawExecutor,
  input: CreateBookingHoldInput,
  bufferMinutes: number,
): Promise<BookingHold> {
  const id = randomUUID();
  const joinToken = randomUUID();
  const bufferMs = bufferMinutes * 60_000;
  const blockedStart = new Date(input.startsAt.getTime() - bufferMs);
  const blockedEnd = new Date(input.endsAt.getTime() + bufferMs);

  await tx.$executeRaw`
    INSERT INTO "Booking" (
      "id", "timeRange", "blockedRange", "status",
      "sessionTypeId", "cancellationPolicyId", "priceInPaise", "gstRatePercent",
      "timeZone", "consentVersion", "joinToken", "manageTokenVersion",
      "calendarSyncStatus", "rescheduleCount", "createdAt", "updatedAt"
    ) VALUES (
      ${id},
      tstzrange(${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, '[)'),
      tstzrange(${blockedStart}::timestamptz, ${blockedEnd}::timestamptz, '[)'),
      'HELD',
      ${input.sessionTypeId}, ${input.cancellationPolicyId}, ${input.priceInPaise}, ${input.gstRatePercent},
      ${input.timeZone}, ${input.consentVersion}, ${joinToken}, 0,
      'PENDING', 0, now(), now()
    )
  `;

  return { id, joinToken };
}

/// Creates a HELD booking for a slot, rejecting an overlapping HELD/CONFIRMED
/// booking at the database level (AC-2). Retries a SERIALIZABLE conflict up
/// to 3 times with no backoff before reporting the slot as taken (AC-11).
export async function createBookingHold(
  input: CreateBookingHoldInput,
  db: PrismaClient = getDb(),
): Promise<Result<BookingHold>> {
  for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      const hold = await db.$transaction(
        async (tx) => {
          const bufferMinutes = await currentBufferMinutes(tx);
          return insertHold(tx, input, bufferMinutes);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { ok: true, value: hold };
    } catch (error) {
      const code = pgErrorCode(error);
      if (code === EXCLUSION_VIOLATION) {
        return { ok: false, error: { kind: "SLOT_TAKEN" } };
      }
      if (
        code === SERIALIZATION_FAILURE &&
        attempt < MAX_SERIALIZATION_RETRIES
      ) {
        continue;
      }
      if (code === SERIALIZATION_FAILURE) {
        return { ok: false, error: { kind: "SLOT_TAKEN" } };
      }
      throw error;
    }
  }
  return { ok: false, error: { kind: "SLOT_TAKEN" } };
}

export type RescheduleBookingInput = {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
};

/// Moves a booking to a new time, keeping the same row: records the old
/// timeRange in previousTimeRange and increments rescheduleCount (so a
/// reminder keyed to the pre-reschedule time is treated as a fresh
/// idempotency target, AC-8). Same overlap/retry handling as creation.
export async function rescheduleBooking(
  input: RescheduleBookingInput,
  db: PrismaClient = getDb(),
): Promise<Result<void>> {
  for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      await db.$transaction(
        async (tx) => {
          const bufferMinutes = await currentBufferMinutes(tx);
          const bufferMs = bufferMinutes * 60_000;
          const blockedStart = new Date(input.startsAt.getTime() - bufferMs);
          const blockedEnd = new Date(input.endsAt.getTime() + bufferMs);

          await tx.$executeRaw`
            UPDATE "Booking"
            SET
              "previousTimeRange" = "timeRange",
              "timeRange" = tstzrange(${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, '[)'),
              "blockedRange" = tstzrange(${blockedStart}::timestamptz, ${blockedEnd}::timestamptz, '[)'),
              "rescheduleCount" = "rescheduleCount" + 1,
              "updatedAt" = now()
            WHERE "id" = ${input.bookingId}
          `;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { ok: true, value: undefined };
    } catch (error) {
      const code = pgErrorCode(error);
      if (code === EXCLUSION_VIOLATION) {
        return { ok: false, error: { kind: "SLOT_TAKEN" } };
      }
      if (
        code === SERIALIZATION_FAILURE &&
        attempt < MAX_SERIALIZATION_RETRIES
      ) {
        continue;
      }
      if (code === SERIALIZATION_FAILURE) {
        return { ok: false, error: { kind: "SLOT_TAKEN" } };
      }
      throw error;
    }
  }
  return { ok: false, error: { kind: "SLOT_TAKEN" } };
}
