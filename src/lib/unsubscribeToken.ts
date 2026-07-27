import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return secret;
}

/** Signed token for a user's unsubscribe link — HMAC-SHA256(userId, UNSUBSCRIBE_SECRET), base64url. */
export function generateUnsubscribeToken(userId: string): string {
  return createHmac("sha256", getSecret()).update(userId).digest("base64url");
}

/** Recomputes the expected token for userId and compares in constant time. */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  let expected: Buffer;
  try {
    expected = Buffer.from(generateUnsubscribeToken(userId));
  } catch {
    return false;
  }
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
