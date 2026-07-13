import { ConciergeRequest } from "@/lib/types";

/**
 * Build a friendly starter draft for the "text back" message.
 *
 * This is just a first pass the concierge edits before sending — it stitches
 * together whatever plan details have been filled in (date, venues, estimated
 * check) with a warm opener addressed to the couple by first name. Anything
 * missing is simply left out rather than shown as a blank.
 */

export type PlanDetails = {
  date_of?: string | null;
  venues_final?: string | null;
  est_check?: number | null;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

function prettyDate(iso: string): string {
  // iso is a yyyy-mm-dd from a date input; render without timezone drift.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function draftMessage(
  request: ConciergeRequest,
  plan: PlanDetails = {}
): string {
  const lines: string[] = [
    `Hi ${firstName(request.name)}! It's your Date Night Concierge 🌙`,
    "",
    "I've put together a plan for your night out:",
  ];

  if (plan.date_of) lines.push(`📅 ${prettyDate(plan.date_of)}`);
  if (plan.venues_final) lines.push(`📍 ${plan.venues_final.trim()}`);
  if (typeof plan.est_check === "number" && !Number.isNaN(plan.est_check)) {
    lines.push(`💸 Estimated around $${Math.round(plan.est_check)}`);
  }

  lines.push("", "Want me to lock it in? Just reply YES and it's yours. 💕");

  return lines.join("\n");
}
