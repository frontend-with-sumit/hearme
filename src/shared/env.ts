import { z } from "zod";

/// Every env var the app needs, validated once at import time so a
/// missing or malformed secret fails loudly at boot, never mid-request.
/// Per spec 0001 (stack & architecture): one typed env module, no raw
/// `process.env` reads elsewhere.

// Captures the version suffix (e.g. "v1") so the keyring can be looked up
// by the same value CURRENT_KEK_VERSION/CURRENT_HMAC_KEY_VERSION holds.
const kekVersionPattern = /^KEK_(V\d+)$/;
const hmacKeyVersionPattern = /^HMAC_KEY_(V\d+)$/;

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  CURRENT_KEK_VERSION: z.string().min(1),
  CURRENT_HMAC_KEY_VERSION: z.string().min(1),
});

function collectKeyring(
  env: NodeJS.ProcessEnv,
  pattern: RegExp,
): Record<string, string> {
  const keyring: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    const match = pattern.exec(key);
    if (match && typeof value === "string" && value.length > 0) {
      keyring[match[1].toLowerCase()] = value;
    }
  }
  return keyring;
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

let cached: Env | undefined;

/// The one place the app reads process.env; throws at first use if
/// anything required is missing or malformed.
export function getEnv(): Env {
  if (!cached) {
    cached = parseEnv(process.env);
  }
  return cached;
}
