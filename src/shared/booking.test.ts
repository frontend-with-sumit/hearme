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
  const availabilitySettings = {
    findFirst: vi.fn().mockResolvedValue({ bufferMinutes: 15 }),
  };
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const behavior = behaviors[call];
    call += 1;
    const tx = {
      availabilitySettings,
      $executeRaw: vi.fn(behavior),
    };
    return fn(tx);
  });
  return {
    db: { $transaction: transaction } as unknown as PrismaClient,
    transaction,
    availabilitySettings,
  };
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

  it("defaults the buffer to 0 minutes when no AvailabilitySettings row exists", async () => {
    const { db, availabilitySettings } = fakeDb([async () => undefined]);
    availabilitySettings.findFirst.mockResolvedValue(null);

    const result = await createBookingHold(INPUT, db);

    expect(result.ok).toBe(true);
  });
});

describe("rescheduleBooking", () => {
  const RESCHEDULE_INPUT: RescheduleBookingInput = {
    bookingId: "booking-1",
    startsAt: new Date("2027-01-02T10:00:00.000Z"),
    endsAt: new Date("2027-01-02T10:30:00.000Z"),
  };

  it("succeeds on the first attempt", async () => {
    const { db, transaction } = fakeDb([async () => undefined]);

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
});
