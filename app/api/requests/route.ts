import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { notifyNewRequest } from "@/lib/notify";

export const runtime = "nodejs";

// Keep the accepted vibe/budget/night values aligned with the form options.
const VIBES = [
  "Romantic & intimate",
  "Fun & adventurous",
  "Chill & low-key",
  "Fancy night out",
  "Surprise us",
];
const BUDGETS = [
  "$ — under $75",
  "$$ — $75–150",
  "$$$ — $150–300",
  "$$$$ — $300+",
];
const NIGHTS = ["This weekend", "Next weekend", "A weeknight", "We're flexible"];

function clean(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const vibe = clean(body.vibe);
  const budget_range = clean(body.budget_range);
  const preferred_night = clean(body.preferred_night);

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required." },
      { status: 400 }
    );
  }

  // Need enough digits to actually text them back.
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return NextResponse.json(
      { error: "Please enter a valid phone number." },
      { status: 400 }
    );
  }

  // We text people, so we require explicit SMS consent before storing anything.
  if (body.sms_consent !== true) {
    return NextResponse.json(
      { error: "Please agree to receive text messages so we can reach you." },
      { status: 400 }
    );
  }

  // Only persist known option values; ignore anything unexpected.
  const safeVibe = VIBES.includes(vibe) ? vibe : null;
  const safeBudget = BUDGETS.includes(budget_range) ? budget_range : null;
  const safeNight = NIGHTS.includes(preferred_night) ? preferred_night : null;

  const payload = {
    name,
    phone,
    vibe: safeVibe,
    budget_range: safeBudget,
    preferred_night: safeNight,
    sms_consent: true,
    sms_consent_at: new Date().toISOString(),
  };

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error("Supabase not configured:", err);
    return NextResponse.json(
      { error: "Server is not configured yet. Please try again shortly." },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("requests").insert(payload);
  if (error) {
    console.error("Insert failed:", error);
    return NextResponse.json(
      { error: "Something went wrong saving your request." },
      { status: 500 }
    );
  }

  // Ping the concierge's phone. Never let a notify failure fail the request.
  await notifyNewRequest(payload);

  return NextResponse.json({ ok: true }, { status: 201 });
}
