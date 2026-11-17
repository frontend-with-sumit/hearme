import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { eraseContactDetails, eraseNote } from "./erasure";

/// Unit tests for the two independent erasure functions (spec 0002, AC-7):
/// each calls db.booking.update with exactly the fields its own policy
/// erases, leaving the other erasure's fields untouched. (Independence and
/// DB-level survival of related rows is confirmed live by /check verify;
/// this locks in the exact write contract each function makes.)

function fakeDb() {
  return {
    booking: { update: vi.fn().mockResolvedValue(undefined) },
  };
}

describe("eraseContactDetails", () => {
  it("nulls clientName/clientEmail/clientPhone/emailLookupHmac and sets erasedAt, for the given bookingId", async () => {
    const db = fakeDb();

    await eraseContactDetails("booking-1", db as unknown as PrismaClient);

    expect(db.booking.update).toHaveBeenCalledTimes(1);
    const call = db.booking.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1" });
    expect(call.data.clientName).toBe(Prisma.DbNull);
    expect(call.data.clientEmail).toBe(Prisma.DbNull);
    expect(call.data.clientPhone).toBe(Prisma.DbNull);
    expect(call.data.emailLookupHmac).toBeNull();
    expect(call.data.erasedAt).toBeInstanceOf(Date);
  });

  it("does not touch note or noteErasedAt", async () => {
    const db = fakeDb();

    await eraseContactDetails("booking-1", db as unknown as PrismaClient);

    const call = db.booking.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("note");
    expect(call.data).not.toHaveProperty("noteErasedAt");
  });
});

describe("eraseNote", () => {
  it("nulls note and sets noteErasedAt, for the given bookingId", async () => {
    const db = fakeDb();

    await eraseNote("booking-1", db as unknown as PrismaClient);

    expect(db.booking.update).toHaveBeenCalledTimes(1);
    const call = db.booking.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1" });
    expect(call.data.note).toBe(Prisma.DbNull);
    expect(call.data.noteErasedAt).toBeInstanceOf(Date);
  });

  it("does not touch clientName/clientEmail/clientPhone/emailLookupHmac/erasedAt", async () => {
    const db = fakeDb();

    await eraseNote("booking-1", db as unknown as PrismaClient);

    const call = db.booking.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("clientName");
    expect(call.data).not.toHaveProperty("clientEmail");
    expect(call.data).not.toHaveProperty("clientPhone");
    expect(call.data).not.toHaveProperty("emailLookupHmac");
    expect(call.data).not.toHaveProperty("erasedAt");
  });
});
