import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { getDb } from "./db";
import type { Result } from "./result";

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
export type NotReschedulable = { kind: "NOT_RESCHEDULABLE" };
export type InvalidRange = { kind: "INVALID_RANGE" };

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
// error code the driver adapter preserved lives either nested under
// error.meta.driverAdapterError.cause.originalCode or in error.meta.code (see
// the prisma-driver-adapter-implementation skill: "preserve original database
// error code/message"). Prisma also reports a transaction-level write
// conflict or deadlock as P2034 with no Postgres code at all.
const PRISMA_TRANSACTION_CONFLICT = "P2034";

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
    const metaCode = (meta as { code?: unknown }).code;
    if (typeof metaCode === "string") {
      return metaCode;
    }
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isSerializationFailure(code: string | undefined): boolean {
  return code === SERIALIZATION_FAILURE || code === PRISMA_TRANSACTION_CONFLICT;
}

/// Runs one SERIALIZABLE attempt at a time: a 23P01 returns SLOT_TAKEN at
/// once, a serialization failure retries up to MAX_SERIALIZATION_RETRIES
/// times and then also reports SLOT_TAKEN, anything else is a real error.
async function withSlotRetries<T, E>(
  attempt: () => Promise<Result<T, E>>,
): Promise<Result<T, E | SlotTaken>> {
  for (let tries = 0; tries <= MAX_SERIALIZATION_RETRIES; tries++) {
    try {
      return await attempt();
    } catch (error) {
      const code = pgErrorCode(error);
      if (code === EXCLUSION_VIOLATION) {
        return { ok: false, error: { kind: "SLOT_TAKEN" } };
      }
      if (!isSerializationFailure(code)) {
        throw error;
      }
    }
  }
  return { ok: false, error: { kind: "SLOT_TAKEN" } };
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
  if (!settings) {
    // A missing singleton row is a setup error; a silent 0 minute buffer
    // would weaken the no-double-booking guarantee.
    throw new Error("AvailabilitySettings row is missing; run the seed");
  }
  return settings.bufferMinutes;
}

/// blockedRange is the session padded by half the buffer on each side, so two
/// bookings overlap only when they are closer than bufferMinutes in total
/// (spec 0002: "no two bookings within bufferMinutes of each other").
function blockedRangeFor(
  startsAt: Date,
  endsAt: Date,
  bufferMinutes: number,
): { blockedStart: Date; blockedEnd: Date } {
  const halfBufferMs = (bufferMinutes * 60_000) / 2;
  return {
    blockedStart: new Date(startsAt.getTime() - halfBufferMs),
    blockedEnd: new Date(endsAt.getTime() + halfBufferMs),
  };
}

async function insertHold(
  tx: RawExecutor,
  input: CreateBookingHoldInput,
  bufferMinutes: number,
): Promise<BookingHold> {
  const id = randomUUID();
  const joinToken = randomUUID();
  const { blockedStart, blockedEnd } = blockedRangeFor(
    input.startsAt,
    input.endsAt,
    bufferMinutes,
  );

  await tx.$executeRaw`
    INSERT INTO "Booking" (
      "id", "timeRange", "blockedRange", "status", "holdExpiresAt",
      "sessionTypeId", "cancellationPolicyId", "priceInPaise", "gstRatePercent",
      "timeZone", "consentVersion", "joinToken", "manageTokenVersion",
      "calendarSyncStatus", "rescheduleCount", "createdAt", "updatedAt"
    ) VALUES (
      ${id},
      tstzrange(${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, '[)'),
      tstzrange(${blockedStart}::timestamptz, ${blockedEnd}::timestamptz, '[)'),
      'HELD', ${input.holdExpiresAt}::timestamptz,
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
): Promise<Result<BookingHold, SlotTaken | InvalidRange>> {
  if (input.startsAt >= input.endsAt) {
    return { ok: false, error: { kind: "INVALID_RANGE" } };
  }
  return withSlotRetries<BookingHold, InvalidRange>(async () => {
    const hold = await db.$transaction(
      async (tx) => {
        const bufferMinutes = await currentBufferMinutes(tx);
        return insertHold(tx, input, bufferMinutes);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { ok: true, value: hold } as const;
  });
}

export type RescheduleBookingInput = {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
};

/// Moves a HELD or CONFIRMED booking to a new time, keeping the same row:
/// records the old timeRange in previousTimeRange and increments
/// rescheduleCount (so a reminder keyed to the pre-reschedule time is treated
/// as a fresh idempotency target, AC-8). Same overlap/retry handling as
/// creation. A missing booking, or one already CANCELLED/COMPLETED/EXPIRED,
/// matches no row and reports NOT_RESCHEDULABLE instead of succeeding.
export async function rescheduleBooking(
  input: RescheduleBookingInput,
  db: PrismaClient = getDb(),
): Promise<Result<void, SlotTaken | NotReschedulable | InvalidRange>> {
  if (input.startsAt >= input.endsAt) {
    return { ok: false, error: { kind: "INVALID_RANGE" } };
  }
  return withSlotRetries<void, NotReschedulable>(async () => {
    const updated = await db.$transaction(
      async (tx) => {
        const bufferMinutes = await currentBufferMinutes(tx);
        const { blockedStart, blockedEnd } = blockedRangeFor(
          input.startsAt,
          input.endsAt,
          bufferMinutes,
        );

        return tx.$executeRaw`
          UPDATE "Booking"
          SET
            "previousTimeRange" = "timeRange",
            "timeRange" = tstzrange(${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, '[)'),
            "blockedRange" = tstzrange(${blockedStart}::timestamptz, ${blockedEnd}::timestamptz, '[)'),
            "rescheduleCount" = "rescheduleCount" + 1,
            "updatedAt" = now()
          WHERE "id" = ${input.bookingId}
            AND "status" IN ('HELD', 'CONFIRMED')
        `;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return updated === 1
      ? ({ ok: true, value: undefined } as const)
      : ({ ok: false, error: { kind: "NOT_RESCHEDULABLE" } } as const);
  });
}
