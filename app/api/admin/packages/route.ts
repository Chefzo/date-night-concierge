import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { buildPackagePayload } from "@/lib/packages";
import { Package } from "@/lib/types";

export const runtime = "nodejs";

/** List packages. `?active=1` returns only active ones (for the composer). */
export async function GET(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const activeOnly = new URL(request.url).searchParams.get("active") === "1";
  const supabase = getServiceSupabase();
  let query = supabase.from("packages").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load packages:", error);
    return NextResponse.json({ error: "Could not load packages." }, { status: 500 });
  }
  return NextResponse.json({ packages: (data ?? []) as Package[] });
}

export async function POST(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = buildPackagePayload(body, { partial: false });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("packages")
    .insert(result.payload)
    .select("*")
    .single();

  if (error) {
    console.error("Package insert failed:", error);
    return NextResponse.json({ error: "Could not save the package." }, { status: 500 });
  }
  return NextResponse.json({ package: data as Package }, { status: 201 });
}
