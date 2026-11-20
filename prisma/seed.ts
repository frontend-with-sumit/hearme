import { join } from "node:path";
import { config } from "dotenv";

// Resolve relative to this file, not process.cwd(): the Prisma CLI may
// spawn the seed command from a different working directory.
config({ path: join(__dirname, "../.env.local") });
config({ path: join(__dirname, "../.env") });

import { getDb } from "../src/shared/db";

/// Seeds the three singleton/default rows later features need from day one
/// (spec 0002, Build plan task 6): a default SessionType, AvailabilitySettings,
/// and the CancellationPolicy in force as of now. Idempotent: safe to re-run.

async function main() {
  const db = getDb();

  const sessionTypeCount = await db.sessionType.count();
  if (sessionTypeCount === 0) {
    await db.sessionType.create({
      data: {
        name: "30 minute session",
        durationMinutes: 30,
        priceInPaise: 150000,
        gstRatePercent: 18,
        isBookable: true,
        sortOrder: 0,
      },
    });
  }

  const availabilityCount = await db.availabilitySettings.count();
  if (availabilityCount === 0) {
    await db.availabilitySettings.create({
      data: {
        weeklyHours: {},
        blockedDates: [],
        bufferMinutes: 15,
        minNoticeMinutes: 60,
        bookingWindowDays: 30,
        maxPerDay: 4,
        holdLengthMinutes: 10,
        busyCalendarIds: [],
      },
    });
  }

  const policyCount = await db.cancellationPolicy.count();
  if (policyCount === 0) {
    await db.cancellationPolicy.create({
      data: {
        effectiveFrom: new Date(),
        rules: {},
      },
    });
  }
}

main()
  .then(() => {
    console.log("Seed complete.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
