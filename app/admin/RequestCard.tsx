"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConciergeRequest, REQUEST_STATUSES, RequestStatus } from "@/lib/types";
import ConfirmComposer from "./ConfirmComposer";

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  done: "Done",
  archived: "Archived",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  new: "bg-blush/20 text-blush border-blush/40",
  contacted: "bg-ember/20 text-ember border-ember/40",
  confirmed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  done: "bg-white/10 text-white/60 border-white/20",
  archived: "bg-white/5 text-white/40 border-white/10",
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function RequestCard({ request }: { request: ConciergeRequest }) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);

  async function updateStatus(next: RequestStatus) {
    if (next === status) return;
    setBusy(true);
    const prev = status;
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/admin/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(prev); // roll back on failure
    } finally {
      setBusy(false);
    }
  }

  const details = [request.vibe, request.budget_range, request.preferred_night]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{request.name}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          <a
            href={`tel:${request.phone.replace(/[^\d+]/g, "")}`}
            className="mt-0.5 block text-sm text-white/70 underline-offset-2 hover:underline"
          >
            {request.phone}
          </a>
          {details && (
            <p className="mt-1 text-sm text-white/50">{details}</p>
          )}
        </div>
        <span className="whitespace-nowrap text-xs text-white/40">
          {timeAgo(request.created_at)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {REQUEST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => updateStatus(s)}
            className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
              status === s
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setComposing((c) => !c)}
          className="ml-auto rounded-lg border border-blush/40 bg-blush/10 px-2.5 py-1 text-xs text-blush transition hover:bg-blush/20"
        >
          {composing ? "Close" : "Text back"}
        </button>
      </div>

      {composing && (
        <ConfirmComposer
          request={request}
          onConfirmed={() => {
            setStatus("confirmed");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
