/**
 * Outbound SMS to the couple — the "text back" half of the concierge loop.
 *
 * Uses Twilio if it's configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 * TWILIO_FROM_NUMBER). If it isn't, sending is a no-op and we report back
 * `configured: false` so the admin UI can fall back to copy-paste-and-send
 * manually. Either way the concierge stays in control.
 *
 * We only ever text people who ticked the SMS-consent box at intake; the
 * caller is responsible for enforcing that before calling send().
 */

export type SmsResult =
  | { ok: true; configured: true }
  | { ok: false; configured: false }
  | { ok: false; configured: true; error: string };

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

/** Normalize to E.164-ish: keep a leading +, strip everything else non-digit. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    return { ok: false, configured: false };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizePhone(to),
          From: from,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("Twilio send failed:", res.status, detail);
      return { ok: false, configured: true, error: `Twilio ${res.status}` };
    }
    return { ok: true, configured: true };
  } catch (err) {
    console.error("Twilio send error:", err);
    return { ok: false, configured: true, error: "Network error" };
  }
}
