import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// The confirm flow writes bookings joined to a request (and optionally a
// package); we read those relations back for the schedule.
type BookingRow = {
  id: string;
  date_of: string | null;
  venues_final: string | null;
  est_check: number | null;
  confirmed_at: string | null;
  requests: { name: string; phone: string } | null;
  packages: { name: string } | null;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function getBookings(): Promise<BookingRow[]> {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, date_of, venues_final, est_check, confirmed_at, requests(name, phone), packages(name)"
    )
    .order("date_of", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to load bookings:", error);
    return [];
  }
  // Supabase types nested relations as arrays; normalize to a single row.
  return (data ?? []).map((b: Record<string, unknown>) => ({
    ...(b as object),
    requests: Array.isArray(b.requests) ? b.requests[0] ?? null : b.requests,
    packages: Array.isArray(b.packages) ? b.packages[0] ?? null : b.packages,
  })) as BookingRow[];
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export default async function BookingsPage() {
  const bookings = await getBookings();
  const today = todayKey();

  const upcoming = bookings.filter((b) => b.date_of && b.date_of >= today);
  const undated = bookings.filter((b) => !b.date_of);
  const past = bookings
    .filter((b) => b.date_of && b.date_of < today)
    .reverse(); // most recent first

  const upcomingValue = upcoming.reduce((s, b) => s + (b.est_check ?? 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <span className="text-sm text-white/50">
          {upcoming.length} upcoming
          {upcomingValue > 0 ? ` · ${money(upcomingValue)} booked` : ""}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-white/50">
          No bookings yet. Confirm a request from the queue and it shows up here.
        </p>
      ) : (
        <div className="space-y-8">
          <Section title="Upcoming" rows={upcoming} emptyLabel="Nothing on the calendar yet." />
          {undated.length > 0 && (
            <Section title="No date set" rows={undated} emptyLabel="" />
          )}
          {past.length > 0 && <Section title="Past" rows={past} emptyLabel="" muted />}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  emptyLabel,
  muted,
}: {
  title: string;
  rows: BookingRow[];
  emptyLabel: string;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </h2>
      {rows.length === 0 ? (
        emptyLabel ? <p className="text-sm text-white/40">{emptyLabel}</p> : null
      ) : (
        <ul className="space-y-2.5">
          {rows.map((b) => (
            <li key={b.id}>
              <BookingCard row={b} muted={muted} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BookingCard({ row, muted }: { row: BookingRow; muted?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {row.requests?.name ?? "Unknown couple"}
            </span>
            {row.packages?.name && (
              <span className="rounded-full bg-blush/15 px-2 py-0.5 text-xs text-blush">
                {row.packages.name}
              </span>
            )}
          </div>
          {row.venues_final && (
            <p className="mt-1 text-sm text-white/70">{row.venues_final}</p>
          )}
          {row.requests?.phone && (
            <a
              href={`tel:${row.requests.phone.replace(/[^\d+]/g, "")}`}
              className="mt-0.5 block text-xs text-white/40 underline-offset-2 hover:underline"
            >
              {row.requests.phone}
            </a>
          )}
        </div>
        <div className="text-right">
          <div className="whitespace-nowrap text-sm font-medium">
            {row.date_of ? prettyDate(row.date_of) : "—"}
          </div>
          {typeof row.est_check === "number" && (
            <div className="mt-0.5 text-xs text-white/50">
              ~{money(Math.round(row.est_check))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
