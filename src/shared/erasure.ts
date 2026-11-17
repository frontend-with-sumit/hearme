import { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";
import { getDb } from "./db";

/// The two erasure functions (spec 0002, Build plan task 9; AC-7). Independently
/// callable and independently timed: contact-details erasure (client "delete my
/// details", or the 90-day retention job) and note erasure (the 7-day job, which
/// fires earlier and on its own schedule). Neither touches status, timestamps,
/// or any related Payment/Refund/EmailLog row — those stay intact for History.

/// Nulls clientName/clientEmail/clientPhone/emailLookupHmac and sets erasedAt.
/// Json columns need Prisma.DbNull (plain `null` is ambiguous for a Json? field).
export async function eraseContactDetails(
  bookingId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  await db.booking.update({
    where: { id: bookingId },
    data: {
      clientName: Prisma.DbNull,
      clientEmail: Prisma.DbNull,
      clientPhone: Prisma.DbNull,
      emailLookupHmac: null,
      erasedAt: new Date(),
    },
  });
}

/// Nulls note only and sets noteErasedAt, independently of eraseContactDetails.
export async function eraseNote(
  bookingId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  await db.booking.update({
    where: { id: bookingId },
    data: {
      note: Prisma.DbNull,
      noteErasedAt: new Date(),
    },
  });
}
