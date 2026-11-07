import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { REQUEST_STATUSES } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
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

  const status = body.status;
  if (typeof status !== "string" || !REQUEST_STATUSES.includes(status as never)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", (await params).id);

  if (error) {
    console.error("Status update failed:", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
