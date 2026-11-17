import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { eraseContactDetails, eraseNote } from "./erasure";

/// Unit tests for the two independent erasure functions (spec 0002, AC-7):
/// each runs one guarded updateMany with exactly the fields its own policy
/// erases, plus its BOOKING_ERASED audit row, leaving the other erasure's
/// fields untouched. (DB-level survival of related rows is confirmed live by
/// /check verify; this locks in the write contract each function makes.)

const SYSTEM = { type: "SYSTEM" } as const;

function fakeDb(options: { count?: number; exists?: boolean } = {}) {
  const tx = {
    booking: {
      updateMany: vi.fn().mockResolvedValue({ count: options.count ?? 1 }),
      findUnique: vi
        .fn()
        .mockResolvedValue(options.exists === false ? null : { id: "b" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
  };
  const db = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaClient;
  return { db, tx };
}

describe("eraseContactDetails", () => {
  it("nulls clientName/clientEmail/clientPhone/emailLookupHmac and sets erasedAt, for the given bookingId", async () => {
    const { db, tx } = fakeDb();

    const result = await eraseContactDetails("booking-1", SYSTEM, db);

    expect(result).toEqual({ ok: true, value: "ERASED" });
    const call = tx.booking.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1", erasedAt: null });
    expect(call.data.clientName).toBe(Prisma.DbNull);
    expect(call.data.clientEmail).toBe(Prisma.DbNull);
    expect(call.data.clientPhone).toBe(Prisma.DbNull);
    expect(call.data.emailLookupHmac).toBeNull();
    expect(call.data.erasedAt).toBeInstanceOf(Date);
  });

  it("does not touch note or noteErasedAt", async () => {
    const { db, tx } = fakeDb();

    await eraseContactDetails("booking-1", SYSTEM, db);

    const call = tx.booking.updateMany.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("note");
    expect(call.data).not.toHaveProperty("noteErasedAt");
  });

  it("writes a BOOKING_ERASED audit row naming the actor and scope, never client data", async () => {
    const { db, tx } = fakeDb();

    await eraseContactDetails(
      "booking-1",
      { type: "ADMIN", adminUserId: "admin-1" },
      db,
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorType: "ADMIN",
        actorAdminUserId: "admin-1",
        action: "BOOKING_ERASED",
        targetType: "Booking",
        targetId: "booking-1",
        metadata: { scope: "CONTACT_DETAILS" },
      },
    });
  });

  it("keeps the first erasure: a second call reports ALREADY_ERASED and writes no audit row", async () => {
    const { db, tx } = fakeDb({ count: 0 });

    const result = await eraseContactDetails("booking-1", SYSTEM, db);

    expect(result).toEqual({ ok: true, value: "ALREADY_ERASED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a booking that does not exist", async () => {
    const { db, tx } = fakeDb({ count: 0, exists: false });

    const result = await eraseContactDetails("missing", SYSTEM, db);

    expect(result).toEqual({ ok: false, error: { kind: "NOT_FOUND" } });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("eraseNote", () => {
  it("nulls note and sets noteErasedAt, guarded on noteErasedAt, for the given bookingId", async () => {
    const { db, tx } = fakeDb();

    const result = await eraseNote("booking-1", SYSTEM, db);

    expect(result).toEqual({ ok: true, value: "ERASED" });
    const call = tx.booking.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1", noteErasedAt: null });
    expect(call.data.note).toBe(Prisma.DbNull);
    expect(call.data.noteErasedAt).toBeInstanceOf(Date);
  });

  it("does not touch clientName/clientEmail/clientPhone/emailLookupHmac/erasedAt", async () => {
    const { db, tx } = fakeDb();

    await eraseNote("booking-1", SYSTEM, db);

    const call = tx.booking.updateMany.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("clientName");
    expect(call.data).not.toHaveProperty("clientEmail");
    expect(call.data).not.toHaveProperty("clientPhone");
    expect(call.data).not.toHaveProperty("emailLookupHmac");
    expect(call.data).not.toHaveProperty("erasedAt");
  });

  it("writes its audit row with the NOTE scope", async () => {
    const { db, tx } = fakeDb();

    await eraseNote("booking-1", { type: "CLIENT" }, db);

    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({
      actorType: "CLIENT",
      metadata: { scope: "NOTE" },
    });
  });
});
