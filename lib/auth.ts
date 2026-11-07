import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Dead-simple single-operator auth.
 *
 * There are no couple accounts — just you, the concierge. So instead of a
 * full auth provider we gate the admin area behind one shared password
 * (ADMIN_PASSWORD) and a signed session cookie.
 *
 * The cookie value is an HMAC derived from AUTH_SECRET, so it can't be forged
 * without the secret, and it carries no state we have to store server-side.
 */

export const ADMIN_COOKIE = "dnc_admin";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable.");
  }
  return secret;
}

/** The one valid session token, derived from the secret. */
export function sessionToken(): string {
  return createHmac("sha256", getSecret()).update("admin-session").digest("hex");
}

export function checkPassword(candidate: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof candidate !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Length-independent compare to avoid leaking length via timing.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = sessionToken();
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAuthed(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidSession(value);
}

/** Use at the top of any protected server component; redirects if not authed. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthed())) redirect("/login");
}
