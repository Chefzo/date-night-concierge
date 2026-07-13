import { getServiceSupabase } from "@/lib/supabase";
import { ConciergeRequest } from "@/lib/types";
import RequestCard from "./RequestCard";

export const dynamic = "force-dynamic";

async function getRequests(): Promise<ConciergeRequest[]> {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load requests:", error);
    return [];
  }
  return (data ?? []) as ConciergeRequest[];
}

export default async function AdminQueue() {
  const requests = await getRequests();
  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">Incoming</h1>
        <span className="text-sm text-white/50">
          {newCount} new · {requests.length} active
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-white/50">
          No active requests yet. New submissions will show up here.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id}>
              <RequestCard request={req} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
