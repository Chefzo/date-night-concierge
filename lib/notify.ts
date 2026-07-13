/**
 * Fire-and-forget notifications for a new intake request.
 *
 * The whole point of phase 1: a couple submits the form and you get pinged
 * on your phone within seconds, then you fulfill by hand. Both channels are
 * optional and gated on env vars — configure either, both, or neither.
 *
 * Failures here must never break the intake submission, so every send is
 * wrapped and errors are logged, not thrown.
 */

export type NewRequest = {
  name: string;
  phone: string;
  email?: string | null;
  vibe?: string | null;
  budget_range?: string | null;
  preferred_night?: string | null;
};

function formatMessage(req: NewRequest): string {
  const lines = [
    "🌙 New Date Night request",
    `Name:   ${req.name}`,
    `Phone:  ${req.phone}`,
  ];
  if (req.email) lines.push(`Email:  ${req.email}`);
  if (req.vibe) lines.push(`Vibe:   ${req.vibe}`);
  if (req.budget_range) lines.push(`Budget: ${req.budget_range}`);
  if (req.preferred_night) lines.push(`Night:  ${req.preferred_night}`);
  return lines.join("\n");
}

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) {
      console.error("Telegram notify failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Telegram notify error:", err);
  }
}

async function sendEmail(message: string, req: NewRequest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !to || !from) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New Date Night request — ${req.name}`,
        text: message,
      }),
    });
    if (!res.ok) {
      console.error("Email notify failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Email notify error:", err);
  }
}

export async function notifyNewRequest(req: NewRequest): Promise<void> {
  const message = formatMessage(req);
  await Promise.all([sendTelegram(message), sendEmail(message, req)]);
}
