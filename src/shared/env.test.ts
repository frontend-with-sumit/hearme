import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/// Unit tests for the typed env module (spec 0002): validates that a
/// missing/malformed secret fails loudly at boot (AGENTS.md's env rule),
/// and that the keyring lookup keys line up with CURRENT_KEK_VERSION /
/// CURRENT_HMAC_KEY_VERSION.

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
  process.env.KEK_V1 = "a".repeat(44);
  process.env.HMAC_KEY_V1 = "b".repeat(44);
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
    process.env.KEK_V2 = "c".repeat(44);
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
