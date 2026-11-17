import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { getDb } from "./db";
import type { Result } from "./result";

/// The two erasure functions (spec 0002, Build plan task 9; AC-7). Independently
/// callable and independently timed: contact-details erasure (client "delete my
/// details", or the 90-day retention job) and note erasure (the 7-day job, which
/// fires earlier and on its own schedule). Neither touches status, timestamps,
/// or any related Payment/Refund/EmailLog row — those stay intact for History.
/// Each writes its BOOKING_ERASED AuditLog row in the same transaction (the
/// spec makes that row mandatory), and keeps the first erasure time if called
/// again.

export type ErasureActor =
  { type: "CLIENT" | "SYSTEM" } | { type: "ADMIN"; adminUserId: string };

export type ErasureOutcome = "ERASED" | "ALREADY_ERASED";
export type BookingNotFound = { kind: "NOT_FOUND" };

type ErasureScope = "CONTACT_DETAILS" | "NOTE";

async function erase(
  bookingId: string,
  actor: ErasureActor,
  db: PrismaClient,
  scope: ErasureScope,
  notYetErased: Prisma.BookingWhereInput,
  data: Prisma.BookingUpdateManyMutationInput,
): Promise<Result<ErasureOutcome, BookingNotFound>> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, ...notYetErased },
      data,
    });

    if (count === 0) {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      });
      return existing
        ? { ok: true, value: "ALREADY_ERASED" }
        : { ok: false, error: { kind: "NOT_FOUND" } };
    }

    // metadata names only the scope: AuditLog is kept forever and must never
    // hold client personal data (AC-14).
    await tx.auditLog.create({
      data: {
        actorType: actor.type,
        actorAdminUserId:
          actor.type === "ADMIN" ? actor.adminUserId : undefined,
        action: "BOOKING_ERASED",
        targetType: "Booking",
        targetId: bookingId,
        metadata: { scope },
      },
    });
    return { ok: true, value: "ERASED" };
  });
}

/// Nulls clientName/clientEmail/clientPhone/emailLookupHmac and sets erasedAt.
/// Json columns need Prisma.DbNull (plain `null` is ambiguous for a Json? field).
export async function eraseContactDetails(
  bookingId: string,
  actor: ErasureActor,
  db: PrismaClient = getDb(),
): Promise<Result<ErasureOutcome, BookingNotFound>> {
  return erase(
    bookingId,
    actor,
    db,
    "CONTACT_DETAILS",
    { erasedAt: null },
    {
      clientName: Prisma.DbNull,
      clientEmail: Prisma.DbNull,
      clientPhone: Prisma.DbNull,
      emailLookupHmac: null,
      erasedAt: new Date(),
    },
  );
}

/// Nulls note only and sets noteErasedAt, independently of eraseContactDetails.
export async function eraseNote(
  bookingId: string,
  actor: ErasureActor,
  db: PrismaClient = getDb(),
): Promise<Result<ErasureOutcome, BookingNotFound>> {
  return erase(
    bookingId,
    actor,
    db,
    "NOTE",
    { noteErasedAt: null },
    { note: Prisma.DbNull, noteErasedAt: new Date() },
  );
}
