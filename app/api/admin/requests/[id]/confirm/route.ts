import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { ConciergeRequest } from "@/lib/types";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Confirm a request: record a booking, text the itinerary to the couple,
 * and move the request to `confirmed`. The SMS is best-effort — if Twilio
 * isn't configured (or the send fails) we still record the booking and
 * report back so the concierge can send the drafted text by hand.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = clean(body.message, 1200);
  if (!message) {
    return NextResponse.json(
      { error: "A message is required." },
      { status: 400 }
    );
  }

  const dateOf = clean(body.date_of, 20) || null;
  const venuesFinal = clean(body.venues_final, 500) || null;
  const estRaw = body.est_check;
  const estCheck =
    typeof estRaw === "number" && Number.isFinite(estRaw) && estRaw >= 0
      ? estRaw
      : null;

  const supabase = getServiceSupabase();

  // Load the request so we have the phone number and consent flag.
  const { data: reqRow, error: loadErr } = await supabase
    .from("requests")
    .select("*")
    .eq("id", (await params).id)
    .single();

  if (loadErr || !reqRow) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const req = reqRow as ConciergeRequest;
  if (!req.sms_consent) {
    return NextResponse.json(
      { error: "This couple did not consent to texts. Reach out another way." },
      { status: 400 }
    );
  }

  // Record the booking first so we never lose the plan even if the text fails.
  const { error: bookingErr } = await supabase.from("bookings").insert({
    request_id: req.id,
    date_of: dateOf,
    venues_final: venuesFinal,
    est_check: estCheck,
    confirmed_at: new Date().toISOString(),
  });

  if (bookingErr) {
    console.error("Booking insert failed:", bookingErr);
    return NextResponse.json(
      { error: "Could not save the booking." },
      { status: 500 }
    );
  }

  // Move the request forward regardless of SMS outcome.
  const { error: statusErr } = await supabase
    .from("requests")
    .update({ status: "confirmed" })
    .eq("id", req.id);
  if (statusErr) {
    console.error("Status update failed after booking:", statusErr);
  }

  // Send the text back to the couple.
  const sms = await sendSms(req.phone, message);

  if (sms.ok) {
    return NextResponse.json({ ok: true, texted: true });
  }
  if (!sms.configured) {
    // No SMS provider wired up — tell the UI to fall back to manual send.
    return NextResponse.json({ ok: true, texted: false, manual: true });
  }
  // Configured but the send failed.
  return NextResponse.json({
    ok: true,
    texted: false,
    manual: true,
    warning: sms.error,
  });
}
