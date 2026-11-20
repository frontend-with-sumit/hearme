-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'CAPTURED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CLIENT_CANCELLED', 'ADMIN_CANCELLED', 'AUTO_EXPIRED_SLOT', 'HELP_RESOURCES_SENT');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('RAZORPAY', 'GOOGLE');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('CONFIRMATION', 'REMINDER_1H', 'REMINDER_24H', 'MOVED', 'CANCELLED', 'HELP_RESOURCES');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'NOTE_REVEALED', 'PHONE_REVEALED', 'REFUND_ISSUED', 'SESSION_TYPE_CHANGED', 'POLICY_CHANGED', 'AVAILABILITY_CHANGED', 'EXPORT', 'GOOGLE_CONNECTED', 'GOOGLE_DISCONNECTED', 'SIGN_OUT_ALL', 'BOOKING_ERASED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'CLIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "GoogleConnectionStatus" AS ENUM ('CONNECTED', 'NEEDS_RECONNECT', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CLIENT', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BookingOutcome" AS ENUM ('ATTENDED', 'CLIENT_NO_SHOW', 'ENDED_EARLY_SAFETY');

-- CreateTable
CREATE TABLE "SessionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "gstRatePercent" INTEGER NOT NULL,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySettings" (
    "id" TEXT NOT NULL,
    "weeklyHours" JSONB NOT NULL,
    "blockedDates" JSONB NOT NULL,
    "bufferMinutes" INTEGER NOT NULL,
    "minNoticeMinutes" INTEGER NOT NULL,
    "bookingWindowDays" INTEGER NOT NULL,
    "maxPerDay" INTEGER NOT NULL,
    "holdLengthMinutes" INTEGER NOT NULL,
    "busyCalendarIds" TEXT[],
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AvailabilitySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMPTZ NOT NULL,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL,
    "refreshToken" JSONB NOT NULL,
    "scopes" TEXT[],
    "calendarId" TEXT NOT NULL,
    "status" "GoogleConnectionStatus" NOT NULL,
    "lastSyncedAt" TIMESTAMPTZ,
    "lastErrorAt" TIMESTAMPTZ,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "totpSecret" JSONB,
    "totpLastUsedStep" INTEGER,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "lastSeenAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasskeyCredential" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signCount" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "lastUsedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "timeRange" tstzrange NOT NULL,
    "blockedRange" tstzrange NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "cancellationPolicyId" TEXT NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "gstRatePercent" INTEGER NOT NULL,
    "clientName" JSONB,
    "clientEmail" JSONB,
    "clientPhone" JSONB,
    "note" JSONB,
    "emailLookupHmac" TEXT,
    "timeZone" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "joinToken" TEXT NOT NULL,
    "manageTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "calendarEventId" TEXT,
    "meetLink" TEXT,
    "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "calendarSyncError" TEXT,
    "lastSyncAttemptAt" TIMESTAMPTZ,
    "holdExpiresAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "cancelledAt" TIMESTAMPTZ,
    "cancelledBy" "CancelledBy",
    "outcome" "BookingOutcome",
    "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "previousTimeRange" tstzrange,
    "erasedAt" TIMESTAMPTZ,
    "noteErasedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "razorpayRefundId" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL,
    "processedAt" TIMESTAMPTZ,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMPTZ,
    "providerMessageId" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "actorType" "AuditActorType" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON "PasskeyCredential"("credentialId");

-- CreateIndex
CREATE INDEX "PasskeyCredential_adminUserId_idx" ON "PasskeyCredential"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_joinToken_key" ON "Booking"("joinToken");

-- CreateIndex
CREATE INDEX "Booking_emailLookupHmac_idx" ON "Booking"("emailLookupHmac");

-- CreateIndex
CREATE INDEX "Booking_sessionTypeId_idx" ON "Booking"("sessionTypeId");

-- CreateIndex
CREATE INDEX "Booking_cancellationPolicyId_idx" ON "Booking"("cancellationPolicyId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailLog_bookingId_idx" ON "EmailLog"("bookingId");

-- CreateIndex
CREATE INDEX "AuditLog_actorAdminUserId_idx" ON "AuditLog"("actorAdminUserId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "CancellationPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAdminUserId_fkey" FOREIGN KEY ("actorAdminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Manual addition (not generated by `prisma migrate diff`): the no-double-booking
-- exclusion constraint and the AuditLog hardening. See spec 0002, AC-2 and AC-14.

-- btree_gist is required for EXCLUDE USING gist over a range type combined
-- with an equality column (status).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Reject any new HELD/CONFIRMED booking whose buffer-padded blockedRange
-- overlaps an existing HELD/CONFIRMED booking's blockedRange. Scoped to those
-- two statuses only: a CANCELLED/COMPLETED/EXPIRED booking never blocks a slot.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_blocked_range_excl"
  EXCLUDE USING gist (
    "blockedRange" WITH &&
  ) WHERE (status IN ('HELD', 'CONFIRMED'));

-- Harden AuditLog at the database role level: even an app bug cannot alter or
-- remove an audit row. hearme_app is this project's application connection
-- role (distinct from the migration/owner role running this script); it must
-- already exist, or this statement is a no-op rather than a migration failure
-- (see the Follow-up note this build leaves for the engineer in spec 0002).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hearme_app') THEN
    REVOKE UPDATE, DELETE ON "AuditLog" FROM hearme_app;
  END IF;
END
$$;
