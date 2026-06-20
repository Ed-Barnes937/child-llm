import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Hashes a secret (a child's PIN or password) with scrypt and a random
 * per-secret salt. Returns a "<saltHex>:<hashHex>" string suitable for storing
 * in the existing `text` password/PIN columns.
 */
export const hashSecret = (plain: string): string => {
  if (typeof plain !== "string") {
    throw new TypeError("hashSecret: secret must be a string");
  }
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
};

/**
 * Verifies a plaintext secret against a stored "<saltHex>:<hashHex>" value
 * using a constant-time comparison. Returns false for any malformed stored
 * value (e.g. legacy plaintext rows from before hashing was introduced).
 */
export const verifySecret = (plain: string, stored: string): boolean => {
  // Guard non-string input (e.g. a JSON body sending a number/undefined for the
  // PIN) — scryptSync throws on non-string/Buffer, which would otherwise surface
  // as a 500 on an unauthenticated login endpoint instead of a clean failure.
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(plain, salt, KEY_LENGTH);
  return timingSafeEqual(expected, actual);
};
