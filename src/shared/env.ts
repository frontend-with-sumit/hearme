import { z } from "zod";

/// Every env var the app needs, validated on the first getEnv() call (made at
/// server start by src/instrumentation.ts) so a missing or malformed secret
/// fails loudly at boot, never mid-request. Per spec 0001 (stack &
/// architecture): one typed env module, no raw `process.env` reads elsewhere.

// Captures the version suffix (e.g. "v1") so the keyring can be looked up
// by the same value CURRENT_KEK_VERSION/CURRENT_HMAC_KEY_VERSION holds.
const kekVersionPattern = /^KEK_(V\d+)$/;
const hmacKeyVersionPattern = /^HMAC_KEY_(V\d+)$/;

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  // Keyring ids are lowercased below, so normalize the selectors the same way.
  CURRENT_KEK_VERSION: z
    .string()
    .min(1)
    .transform((v) => v.toLowerCase()),
  CURRENT_HMAC_KEY_VERSION: z
    .string()
    .min(1)
    .transform((v) => v.toLowerCase()),
});

const KEY_LENGTH_BYTES = 32;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function assertKeyMaterial(name: string, value: string): void {
  if (
    !BASE64.test(value) ||
    Buffer.from(value, "base64").length !== KEY_LENGTH_BYTES
  ) {
    throw new Error(`${name} must be base64 that decodes to 32 bytes`);
  }
}

function collectKeyring(
  env: NodeJS.ProcessEnv,
  pattern: RegExp,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([name, value]) => {
      const match = pattern.exec(name);
      if (!match || typeof value !== "string" || value.length === 0) {
        return [];
      }
      assertKeyMaterial(name, value);
      return [[match[1].toLowerCase(), value] as const];
    }),
  );
}

function parseEnv(env: NodeJS.ProcessEnv) {
  const base = baseSchema.parse(env);

  const kekKeyring = collectKeyring(env, kekVersionPattern);
  const hmacKeyring = collectKeyring(env, hmacKeyVersionPattern);

  if (!(base.CURRENT_KEK_VERSION in kekKeyring)) {
    throw new Error(
      `CURRENT_KEK_VERSION "${base.CURRENT_KEK_VERSION}" has no matching KEK_${base.CURRENT_KEK_VERSION.toUpperCase()} env var`,
    );
  }
  if (!(base.CURRENT_HMAC_KEY_VERSION in hmacKeyring)) {
    throw new Error(
      `CURRENT_HMAC_KEY_VERSION "${base.CURRENT_HMAC_KEY_VERSION}" has no matching HMAC_KEY_${base.CURRENT_HMAC_KEY_VERSION.toUpperCase()} env var`,
    );
  }

  return {
    databaseUrl: base.DATABASE_URL,
    directUrl: base.DIRECT_URL,
    currentKekVersion: base.CURRENT_KEK_VERSION,
    currentHmacKeyVersion: base.CURRENT_HMAC_KEY_VERSION,
    kekKeyring,
    hmacKeyring,
  };
}

export type Env = ReturnType<typeof parseEnv>;

// Parsed once and reused: process.env cannot change after boot, and re-parsing
// on every encrypt/decrypt would re-run the key checks per field.
let cached: Env | undefined;

/// The one place the app reads process.env; throws at first use if
/// anything required is missing or malformed.
export function getEnv(): Env {
  if (!cached) {
    cached = parseEnv(process.env);
  }
  return cached;
}
