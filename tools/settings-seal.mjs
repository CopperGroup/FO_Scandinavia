/**
 * The same sealing as lib/secrets.ts, for the plain Node scripts in tools/
 * (they cannot import TypeScript). AES-256-GCM, key = scrypt(secret, salt),
 * format "v1.<iv>.<tag>.<ciphertext>" with base64url parts.
 *
 * lib/__tests__/secrets.test.ts checks that a value sealed here opens in the
 * app and the other way round. Change both files together or not at all.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "v1";
const SALT = "nordiva-settings-v1";

/** The variable the app seals with: the first of these that is set. */
export const SECRET_VARIABLES = ["SETTINGS_SECRET", "ENCRYPTION_KEY", "NEXTAUTH_SECRET"];

export function pickSecret(env) {
  for (const name of SECRET_VARIABLES) {
    if (env[name]) return { name, value: env[name] };
  }
  return null;
}

const keyOf = (secret) => scryptSync(secret, SALT, 32);

export function sealSecret(plain, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [PREFIX, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** The plain value, or null when it is not a sealed value or was sealed with another secret. */
export function openSecret(sealed, secret) {
  if (typeof sealed !== "string") return null;
  const [prefix, iv, tag, body] = sealed.split(".");
  if (prefix !== PREFIX || !iv || !tag || body === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyOf(secret), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Dots and the last four characters: what a log line may show of a secret. */
export function maskSecret(plain) {
  return plain.length > 8 ? `••••${plain.slice(-4)}` : "••••";
}
