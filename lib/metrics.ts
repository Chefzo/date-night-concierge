import { ConciergeRequest, RequestStatus, REQUEST_STATUSES } from "@/lib/types";

/**
 * Pure metrics computation over raw request/booking rows.
 *
 * Kept side-effect free so the numbers are easy to reason about and the
 * page component just renders whatever this returns. "Converted" means a
 * request reached `confirmed` or `done` — i.e. we actually planned a night.
 */

export type BookingRow = {
  est_check: number | null;
  confirmed_at: string | null;
};

export type Tally = { label: string; count: number };

export type DayCount = { key: string; label: string; count: number };

export type Metrics = {
  total: number;
  byStatus: Record<RequestStatus, number>;
  converted: number;
  conversionPct: number;
  bookings: number;
  bookedRevenue: number;
  avgCheck: number | null;
  perDay: DayCount[];
  vibes: Tally[];
  budgets: Tally[];
  nights: Tally[];
};

function dayKey(iso: string): string {
  // yyyy-mm-dd in UTC — stable bucket regardless of server timezone.
  return new Date(iso).toISOString().slice(0, 10);
}

function tally(values: (string | null)[]): Tally[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Build `days` day-buckets ending at `now`, oldest first, back-filling zeros. */
function lastNDays(
  requests: ConciergeRequest[],
  now: Date,
  days: number
): DayCount[] {
  const counts = new Map<string, number>();
  for (const r of requests) {
    const key = dayKey(r.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      key,
      label: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: counts.get(key) ?? 0,
    });
  }
  return out;
}

export function computeMetrics(
  requests: ConciergeRequest[],
  bookings: BookingRow[],
  now: Date,
  days = 14
): Metrics {
  const byStatus = Object.fromEntries(
    REQUEST_STATUSES.map((s) => [s, 0])
  ) as Record<RequestStatus, number>;
  for (const r of requests) byStatus[r.status] += 1;

  const total = requests.length;
  const converted = byStatus.confirmed + byStatus.done;
  const conversionPct = total === 0 ? 0 : Math.round((converted / total) * 100);

  const checks = bookings
    .map((b) => b.est_check)
    .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  const bookedRevenue = checks.reduce((sum, n) => sum + n, 0);
  const avgCheck =
    checks.length === 0 ? null : Math.round(bookedRevenue / checks.length);

  return {
    total,
    byStatus,
    converted,
    conversionPct,
    bookings: bookings.length,
    bookedRevenue,
    avgCheck,
    perDay: lastNDays(requests, now, days),
    vibes: tally(requests.map((r) => r.vibe)),
    budgets: tally(requests.map((r) => r.budget_range)),
    nights: tally(requests.map((r) => r.preferred_night)),
  };
}
