import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { buildPackagePayload } from "@/lib/packages";
import { Package } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = buildPackagePayload(body, { partial: true });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (Object.keys(result.payload).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("packages")
    .update(result.payload)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    console.error("Package update failed:", error);
    return NextResponse.json({ error: "Could not update the package." }, { status: 500 });
  }
  return NextResponse.json({ package: data as Package });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("packages").delete().eq("id", params.id);
  if (error) {
    console.error("Package delete failed:", error);
    return NextResponse.json({ error: "Could not delete the package." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
