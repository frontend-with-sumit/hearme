import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/// Unit tests for the typed env module (spec 0002): validates that a
/// missing/malformed secret fails loudly at boot (AGENTS.md's env rule),
/// and that the keyring lookup keys line up with CURRENT_KEK_VERSION /
/// CURRENT_HMAC_KEY_VERSION.

const KEY_A = Buffer.alloc(32, 1).toString("base64");
const KEY_B = Buffer.alloc(32, 2).toString("base64");
const KEY_C = Buffer.alloc(32, 3).toString("base64");

const ORIGINAL_ENV = { ...process.env };
const TRACKED_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "CURRENT_KEK_VERSION",
  "CURRENT_HMAC_KEY_VERSION",
];

function clearTrackedEnv() {
  for (const key of TRACKED_KEYS) {
    delete process.env[key];
  }
  for (const key of Object.keys(process.env)) {
    if (/^KEK_V\d+$/.test(key) || /^HMAC_KEY_V\d+$/.test(key)) {
      delete process.env[key];
    }
  }
}

function setValidEnv() {
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  process.env.DIRECT_URL = "postgres://user:pass@localhost:5432/db";
  process.env.CURRENT_KEK_VERSION = "v1";
  process.env.CURRENT_HMAC_KEY_VERSION = "v1";
  process.env.KEK_V1 = KEY_A;
  process.env.HMAC_KEY_V1 = KEY_B;
}

async function importFreshEnv() {
  vi.resetModules();
  return import("./env");
}

describe("getEnv", () => {
  beforeEach(() => {
    clearTrackedEnv();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("parses a valid env and builds keyrings keyed by lowercase version", async () => {
    setValidEnv();
    const { getEnv } = await importFreshEnv();

    const env = getEnv();

    expect(env.databaseUrl).toBe(process.env.DATABASE_URL);
    expect(env.directUrl).toBe(process.env.DIRECT_URL);
    expect(env.currentKekVersion).toBe("v1");
    expect(env.currentHmacKeyVersion).toBe("v1");
    expect(env.kekKeyring.v1).toBe(process.env.KEK_V1);
    expect(env.hmacKeyring.v1).toBe(process.env.HMAC_KEY_V1);
  });

  it("rejects a KEK that does not decode to 32 bytes, naming the variable but not the value", async () => {
    setValidEnv();
    process.env.KEK_V1 = Buffer.alloc(16, 1).toString("base64");
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow(
      /KEK_V1 must be base64 that decodes to 32 bytes/,
    );
    expect(() => getEnv()).not.toThrow(new RegExp(process.env.KEK_V1 ?? "x"));
  });

  it("rejects an HMAC key that is not base64", async () => {
    setValidEnv();
    process.env.HMAC_KEY_V1 = "not base64 !!";
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow(/HMAC_KEY_V1 must be base64/);
  });

  it("accepts an uppercase CURRENT_KEK_VERSION and matches it to the lowercase keyring", async () => {
    setValidEnv();
    process.env.CURRENT_KEK_VERSION = "V1";
    const { getEnv } = await importFreshEnv();

    expect(getEnv().currentKekVersion).toBe("v1");
  });

  it("throws when DATABASE_URL is missing", async () => {
    setValidEnv();
    delete process.env.DATABASE_URL;
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow();
  });

  it("throws when DIRECT_URL is empty", async () => {
    setValidEnv();
    process.env.DIRECT_URL = "";
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow();
  });

  it("throws when CURRENT_KEK_VERSION has no matching KEK_<V> env var", async () => {
    setValidEnv();
    delete process.env.KEK_V1;
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow(/CURRENT_KEK_VERSION.*KEK_V1/);
  });

  it("throws when CURRENT_HMAC_KEY_VERSION has no matching HMAC_KEY_<V> env var", async () => {
    setValidEnv();
    delete process.env.HMAC_KEY_V1;
    const { getEnv } = await importFreshEnv();

    expect(() => getEnv()).toThrow(/CURRENT_HMAC_KEY_VERSION.*HMAC_KEY_V1/);
  });

  it("collects multiple KEK versions into one keyring, each keyed by its own lowercase version", async () => {
    setValidEnv();
    process.env.KEK_V2 = KEY_C;
    const { getEnv } = await importFreshEnv();

    const env = getEnv();

    expect(env.kekKeyring.v1).toBe(process.env.KEK_V1);
    expect(env.kekKeyring.v2).toBe(process.env.KEK_V2);
  });

  it("caches the parsed env: a later process.env change is not picked up by a second call", async () => {
    setValidEnv();
    const { getEnv } = await importFreshEnv();

    const first = getEnv();
    delete process.env.KEK_V1; // would make a fresh parse throw
    const second = getEnv();

    expect(second).toBe(first);
  });
});
