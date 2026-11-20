import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { createBookingHold, rescheduleBooking } from "./booking";
import type { CreateBookingHoldInput, RescheduleBookingInput } from "./booking";

/// Unit tests for the booking creation/reschedule transaction (spec 0002,
/// AC-2, AC-11): deterministic coverage of the retry-on-40001 and
/// fall-through-to-SLOT_TAKEN logic that a live concurrency test can only
/// prove probabilistically. $transaction/$executeRaw are mocked at the
/// Prisma boundary; the real overlap/contention behavior is confirmed
/// live by /check verify.

function pgError(code: string): Error & { code: string } {
  return Object.assign(new Error(`pg error ${code}`), { code });
}

const INPUT: CreateBookingHoldInput = {
  sessionTypeId: "session-type-1",
  cancellationPolicyId: "policy-1",
  priceInPaise: 150000,
  gstRatePercent: 18,
  timeZone: "Asia/Kolkata",
  consentVersion: "v1",
  startsAt: new Date("2027-01-01T10:00:00.000Z"),
  endsAt: new Date("2027-01-01T10:30:00.000Z"),
  holdExpiresAt: new Date("2027-01-01T10:10:00.000Z"),
};

/// Builds a fake PrismaClient whose $transaction invokes the given
/// sequence of tx behaviors (one per call), so each test can script
/// exactly what the raw SQL would have done on each attempt.
function fakeDb(behaviors: Array<() => Promise<unknown>>) {
  let call = 0;
  const executeRaw = vi.fn();
  const availabilitySettings = {
    findFirst: vi.fn().mockResolvedValue({ bufferMinutes: 15 }),
  };
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const behavior = behaviors[call];
    call += 1;
    executeRaw.mockImplementation(behavior);
    const tx = { availabilitySettings, $executeRaw: executeRaw };
    return fn(tx);
  });
  return {
    db: { $transaction: transaction } as unknown as PrismaClient,
    transaction,
    availabilitySettings,
    executeRaw,
  };
}

/// The interpolated values of a tagged-template $executeRaw call.
function sqlValues(call: unknown[]): unknown[] {
  return call.slice(1);
}

describe("createBookingHold", () => {
  it("returns ok with an id and joinToken when the insert succeeds on the first attempt", async () => {
    const { db, transaction } = fakeDb([async () => undefined]);

    const result = await createBookingHold(INPUT, db);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value.id).toBe("string");
      expect(typeof result.value.joinToken).toBe("string");
      expect(result.value.id).not.toBe(result.value.joinToken);
    }
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("returns SLOT_TAKEN immediately on an exclusion violation (23P01), without retrying", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("23P01");
      },
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("retries a serialization failure (40001) and succeeds once a later attempt clears", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
      async () => undefined,
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result.ok).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("retries 40001 up to 3 times, then falls through to SLOT_TAKEN once retries are exhausted", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
    // initial attempt + 3 retries = 4 total
    expect(transaction).toHaveBeenCalledTimes(4);
  });

  it("propagates an unexpected database error instead of reporting SLOT_TAKEN", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("23505"); // unique violation, not a retry/exclusion code
      },
    ]);

    await expect(createBookingHold(INPUT, db)).rejects.toMatchObject({
      code: "23505",
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("pads the stored range by the current AvailabilitySettings.bufferMinutes", async () => {
    const { db, availabilitySettings } = fakeDb([async () => undefined]);
    availabilitySettings.findFirst.mockResolvedValue({ bufferMinutes: 20 });

    const result = await createBookingHold(INPUT, db);

    expect(result.ok).toBe(true);
    expect(availabilitySettings.findFirst).toHaveBeenCalledTimes(1);
  });

  it("writes holdExpiresAt so the hold can expire", async () => {
    const { db, executeRaw } = fakeDb([async () => undefined]);

    await createBookingHold(INPUT, db);

    expect(sqlValues(executeRaw.mock.calls[0] ?? [])).toContain(
      INPUT.holdExpiresAt,
    );
  });

  it("splits the buffer across both sides, so the gap between bookings is bufferMinutes", async () => {
    const { db, executeRaw, availabilitySettings } = fakeDb([
      async () => undefined,
    ]);
    availabilitySettings.findFirst.mockResolvedValue({ bufferMinutes: 20 });

    await createBookingHold(INPUT, db);

    const values = sqlValues(executeRaw.mock.calls[0] ?? []);
    expect(values).toContainEqual(new Date("2027-01-01T09:50:00.000Z"));
    expect(values).toContainEqual(new Date("2027-01-01T10:40:00.000Z"));
  });

  it("retries Prisma's P2034 transaction conflict like a serialization failure", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("P2034");
      },
      async () => undefined,
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result.ok).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("reads the Postgres code from error.meta.code on a P2010 raw query failure", async () => {
    const { db } = fakeDb([
      async () => {
        throw Object.assign(new Error("raw query failed"), {
          code: "P2010",
          meta: { code: "23P01" },
        });
      },
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
  });

  it("fails loudly when no AvailabilitySettings row exists, instead of using a 0 minute buffer", async () => {
    const { db, availabilitySettings } = fakeDb([async () => undefined]);
    availabilitySettings.findFirst.mockResolvedValue(null);

    await expect(createBookingHold(INPUT, db)).rejects.toThrow(
      /AvailabilitySettings/,
    );
  });

  it("rejects a range that does not start before it ends, without touching the database", async () => {
    const { db, transaction } = fakeDb([async () => undefined]);

    const result = await createBookingHold(
      { ...INPUT, startsAt: INPUT.endsAt, endsAt: INPUT.startsAt },
      db,
    );

    expect(result).toEqual({ ok: false, error: { kind: "INVALID_RANGE" } });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("reads the code from the real driver adapter error shape (meta.driverAdapterError.cause.originalCode)", async () => {
    const { db } = fakeDb([
      async () => {
        throw Object.assign(new Error("raw query failed"), {
          code: "P2010",
          meta: { driverAdapterError: { cause: { originalCode: "23P01" } } },
        });
      },
    ]);

    const result = await createBookingHold(INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
  });
});

describe("rescheduleBooking", () => {
  const RESCHEDULE_INPUT: RescheduleBookingInput = {
    bookingId: "booking-1",
    startsAt: new Date("2027-01-02T10:00:00.000Z"),
    endsAt: new Date("2027-01-02T10:30:00.000Z"),
  };

  it("succeeds on the first attempt", async () => {
    const { db, transaction } = fakeDb([async () => 1]);

    const result = await rescheduleBooking(RESCHEDULE_INPUT, db);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("returns SLOT_TAKEN on an exclusion violation against the new range", async () => {
    const { db } = fakeDb([
      async () => {
        throw pgError("23P01");
      },
    ]);

    const result = await rescheduleBooking(RESCHEDULE_INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
  });

  it("retries 40001 up to 3 times then falls through to SLOT_TAKEN", async () => {
    const { db, transaction } = fakeDb([
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
      async () => {
        throw pgError("40001");
      },
    ]);

    const result = await rescheduleBooking(RESCHEDULE_INPUT, db);

    expect(result).toEqual({ ok: false, error: { kind: "SLOT_TAKEN" } });
    expect(transaction).toHaveBeenCalledTimes(4);
  });

  it("rejects an inverted range as INVALID_RANGE", async () => {
    const { db, transaction } = fakeDb([async () => 1]);

    const result = await rescheduleBooking(
      {
        ...RESCHEDULE_INPUT,
        startsAt: RESCHEDULE_INPUT.endsAt,
        endsAt: RESCHEDULE_INPUT.startsAt,
      },
      db,
    );

    expect(result).toEqual({ ok: false, error: { kind: "INVALID_RANGE" } });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_RESCHEDULABLE when no HELD or CONFIRMED booking matches the id", async () => {
    const { db } = fakeDb([async () => 0]);

    const result = await rescheduleBooking(RESCHEDULE_INPUT, db);

    expect(result).toEqual({
      ok: false,
      error: { kind: "NOT_RESCHEDULABLE" },
    });
  });
});
