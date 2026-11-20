import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { getEnv } from "./env";

/// Per-field envelope encryption (spec 0001, 0002): AES-256-GCM, a per-record
/// Data Encryption Key (DEK) wraps the field, wrapped itself by a versioned
/// Key Encryption Key (KEK). AAD binds each ciphertext to its exact record id
/// and field name, so a ciphertext can never be swapped between records or
/// fields — decryption fails closed instead of silently succeeding.

const ENVELOPE_VERSION = 1;
const DEK_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

export type Envelope = {
  v: number;
  kekVersion: string;
  wrappedDek: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function kekFor(version: string): Buffer {
  const env = getEnv();
  const key = env.kekKeyring[version];
  if (!key) {
    throw new Error(`No KEK configured for version "${version}"`);
  }
  return Buffer.from(key, "base64");
}

function aad(recordId: string, fieldName: string): Buffer {
  return Buffer.from(`${recordId}:${fieldName}`, "utf8");
}

/// Wraps a fresh DEK with the given KEK, AES-256-GCM, 12-byte IV prefix + tag.
function wrapDek(dek: Buffer, kek: Buffer): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", kek, iv);
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, wrapped]).toString("base64");
}

function unwrapDek(wrappedDek: string, kek: Buffer): Buffer {
  const raw = Buffer.from(wrappedDek, "base64");
  const iv = raw.subarray(0, IV_LENGTH_BYTES);
  const tag = raw.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
  const wrapped = raw.subarray(IV_LENGTH_BYTES + 16);
  const decipher = createDecipheriv("aes-256-gcm", kek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(wrapped), decipher.final()]);
}

/// Encrypts one field's plaintext into its envelope, bound to recordId + fieldName.
export function encryptField(
  plaintext: string,
  recordId: string,
  fieldName: string,
): Envelope {
  const env = getEnv();
  const kekVersion = env.currentKekVersion;
  const kek = kekFor(kekVersion);

  const dek = randomBytes(DEK_LENGTH_BYTES);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  cipher.setAAD(aad(recordId, fieldName));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    v: ENVELOPE_VERSION,
    kekVersion,
    wrappedDek: wrapDek(dek, kek),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

/// Decrypts an envelope back to plaintext. Throws if the envelope was issued
/// for a different recordId/fieldName (AAD mismatch) or has been tampered with.
export function decryptField(
  envelope: Envelope,
  recordId: string,
  fieldName: string,
): string {
  const kek = kekFor(envelope.kekVersion);
  const dek = unwrapDek(envelope.wrappedDek, kek);

  const decipher = createDecipheriv(
    "aes-256-gcm",
    dek,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  decipher.setAAD(aad(recordId, fieldName));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/// HMAC(email, HMAC_KEY_Vn) — lets admin search Booking.emailLookupHmac
/// without decrypting every row. Not part of the envelope: a separate,
/// deliberately non-reversible index, keyed by its own secret (never the KEK).
export function hmacEmail(email: string): string {
  const env = getEnv();
  const key = env.hmacKeyring[env.currentHmacKeyVersion];
  if (!key) {
    throw new Error(
      `No HMAC key configured for version "${env.currentHmacKeyVersion}"`,
    );
  }
  return createHmac("sha256", Buffer.from(key, "base64"))
    .update(email.trim().toLowerCase())
    .digest("base64");
}

// "contact" is Razorpay's name for the payer's phone; "notes" is free text the
// client or checkout can fill; "vpa" (UPI id) and "card" identify the payer.
const PERSONAL_FIELD_TOKENS = new Set([
  "name",
  "email",
  "phone",
  "contact",
  "notes",
  "vpa",
  "card",
]);

function isPersonalKey(key: string): boolean {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((token) => PERSONAL_FIELD_TOKENS.has(token));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isPersonalKey(key))
        .map(([key, nested]) => [key, redactValue(nested)]),
    );
  }
  return value;
}

/// Strips client personal fields (name, email, phone/contact, notes, UPI id,
/// card) at every nesting depth before a WebhookEvent.payload write (AC-5).
/// Razorpay nests the payer under payload.payment.entity, so a top level
/// filter alone would leave it in a table that has no erasure path. Keys
/// match by whole word (split on `_`, `-`, camelCase), so "customerName" is
/// stripped but "username" is kept.
export function redactWebhookPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(payload) as Record<string, unknown>;
}
