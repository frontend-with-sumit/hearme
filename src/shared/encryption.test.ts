import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  decryptField,
  encryptField,
  hmacEmail,
  redactWebhookPayload,
} from "./encryption";

/// Unit tests for the per-field envelope encryption helper (spec 0002,
/// AC-3, AC-4, AC-5): roundtrip correctness, AAD binding (a ciphertext
/// can never be swapped between records or fields), HMAC lookup
/// determinism, and the webhook payload redaction rule.

const KEK_V1 = randomBytes(32).toString("base64");
const HMAC_KEY_V1 = randomBytes(32).toString("base64");

vi.mock("./env", () => ({
  getEnv: () => ({
    currentKekVersion: "v1",
    currentHmacKeyVersion: "v1",
    kekKeyring: { v1: KEK_V1 },
    hmacKeyring: { v1: HMAC_KEY_V1 },
  }),
}));

describe("encryptField / decryptField", () => {
  it("decrypts back to the original plaintext for the same recordId and fieldName", () => {
    const envelope = encryptField("Jane Doe", "booking-1", "clientName");

    expect(decryptField(envelope, "booking-1", "clientName")).toBe("Jane Doe");
  });

  it("round-trips unicode and empty-string plaintext", () => {
    const unicode = encryptField("naïve café 日本語", "booking-1", "note");
    expect(decryptField(unicode, "booking-1", "note")).toBe(
      "naïve café 日本語",
    );

    const empty = encryptField("", "booking-1", "note");
    expect(decryptField(empty, "booking-1", "note")).toBe("");
  });

  it("stores the envelope in the documented shape", () => {
    const envelope = encryptField("secret", "booking-1", "clientEmail");

    expect(envelope).toMatchObject({
      v: 1,
      kekVersion: "v1",
    });
    expect(typeof envelope.wrappedDek).toBe("string");
    expect(typeof envelope.iv).toBe("string");
    expect(typeof envelope.authTag).toBe("string");
    expect(typeof envelope.ciphertext).toBe("string");
  });

  it("throws when decrypting with a different recordId (AAD mismatch)", () => {
    const envelope = encryptField("Jane Doe", "booking-1", "clientName");

    expect(() => decryptField(envelope, "booking-2", "clientName")).toThrow();
  });

  it("throws when decrypting with a different fieldName (AAD mismatch)", () => {
    const envelope = encryptField("Jane Doe", "booking-1", "clientName");

    expect(() => decryptField(envelope, "booking-1", "clientEmail")).toThrow();
  });

  it("throws when the ciphertext has been tampered with", () => {
    const envelope = encryptField("Jane Doe", "booking-1", "clientName");
    const tampered = {
      ...envelope,
      ciphertext: Buffer.from("tampered-ciphertext-bytes").toString("base64"),
    };

    expect(() => decryptField(tampered, "booking-1", "clientName")).toThrow();
  });

  it("throws with a clear message when the envelope names a KEK version that isn't configured", () => {
    const envelope = encryptField("Jane Doe", "booking-1", "clientName");
    const withUnknownKek = { ...envelope, kekVersion: "v99" };

    expect(() =>
      decryptField(withUnknownKek, "booking-1", "clientName"),
    ).toThrow(/No KEK configured for version "v99"/);
  });
});

describe("hmacEmail", () => {
  it("returns the same digest for the same email regardless of case or surrounding whitespace", () => {
    const a = hmacEmail("  Test.User@Example.com  ");
    const b = hmacEmail("test.user@example.com");

    expect(a).toBe(b);
  });

  it("returns a different digest for a different email", () => {
    const a = hmacEmail("alice@example.com");
    const b = hmacEmail("bob@example.com");

    expect(a).not.toBe(b);
  });

  it("is deterministic across repeated calls", () => {
    expect(hmacEmail("alice@example.com")).toBe(hmacEmail("alice@example.com"));
  });
});

describe("redactWebhookPayload", () => {
  it("strips keys containing name, email, or phone, case-insensitively", () => {
    const redacted = redactWebhookPayload({
      orderId: "o1",
      customerName: "Jane",
      CustomerEmail: "jane@example.com",
      phone_number: "9999999999",
      amount: 15000,
      status: "captured",
    });

    expect(redacted).toEqual({
      orderId: "o1",
      amount: 15000,
      status: "captured",
    });
  });

  it("returns an empty object unchanged", () => {
    expect(redactWebhookPayload({})).toEqual({});
  });

  it("keeps a payload with no personal fields untouched", () => {
    const payload = { orderId: "o1", amount: 15000 };
    expect(redactWebhookPayload(payload)).toEqual(payload);
  });
});
