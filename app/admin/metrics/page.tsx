import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase";
import { ConciergeRequest } from "@/lib/types";
import { BookingRow, computeMetrics, Metrics, Tally } from "@/lib/metrics";

export const dynamic = "force-dynamic";

async function load(): Promise<Metrics | null> {
  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error("Supabase not configured:", err);
    return null;
  }

  const [reqRes, bookRes] = await Promise.all([
    supabase.from("requests").select("*"),
    supabase.from("bookings").select("est_check, confirmed_at"),
  ]);

  if (reqRes.error) {
    console.error("Failed to load requests:", reqRes.error);
    return null;
  }
  if (bookRes.error) {
    console.error("Failed to load bookings:", bookRes.error);
  }

  const requests = (reqRes.data ?? []) as ConciergeRequest[];
  const bookings = (bookRes.data ?? []) as BookingRow[];
  return computeMetrics(requests, bookings, new Date());
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Tally[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold text-white/80">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-white/40">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-white/70">{r.label}</span>
                <span className="text-white/40">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-blush"
                  style={{ width: `${max === 0 ? 0 : (r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MetricsPage() {
  const m = await load();

  if (!m) {
    return (
      <div>
        <Header />
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-white/50">
          Couldn&apos;t load metrics — check the Supabase configuration.
        </p>
      </div>
    );
  }

  const peakDay = m.perDay.reduce((mx, d) => Math.max(mx, d.count), 0);
  const money = (n: number) => `$${n.toLocaleString("en-US")}`;

  return (
    <div>
      <Header />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Requests" value={String(m.total)} />
        <StatTile
          label="Confirmed"
          value={String(m.byStatus.confirmed + m.byStatus.done)}
          sub={`${m.byStatus.new} new`}
        />
        <StatTile label="Conversion" value={`${m.conversionPct}%`} />
        <StatTile label="Bookings" value={String(m.bookings)} />
        <StatTile
          label="Booked revenue"
          value={money(m.bookedRevenue)}
          sub={m.avgCheck != null ? `avg ${money(m.avgCheck)}/night` : undefined}
        />
      </div>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white/80">
          Requests · last {m.perDay.length} days
        </h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {m.perDay.map((d) => (
            <div
              key={d.key}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${d.label}: ${d.count}`}
            >
              <div
                className="w-full rounded-t bg-blush/70 transition group-hover:bg-blush"
                style={{
                  height: `${peakDay === 0 ? 0 : (d.count / peakDay) * 100}%`,
                  minHeight: d.count > 0 ? "3px" : "0",
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/30">
          <span>{m.perDay[0]?.label}</span>
          <span>{m.perDay[m.perDay.length - 1]?.label}</span>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Breakdown title="Vibes" rows={m.vibes} />
        <Breakdown title="Budgets" rows={m.budgets} />
        <Breakdown title="Preferred nights" rows={m.nights} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6 flex items-baseline justify-between">
      <h1 className="text-2xl font-semibold">Metrics</h1>
      <Link
        href="/admin"
        className="text-sm text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
      >
        ← Back to queue
      </Link>
    </div>
  );
}
