"use client";

import { useState } from "react";
import { ConciergeRequest } from "@/lib/types";
import { draftMessage } from "@/lib/message";

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "texted" }
  | { kind: "manual"; warning?: string }
  | { kind: "error"; message: string };

export default function ConfirmComposer({
  request,
  onConfirmed,
}: {
  request: ConciergeRequest;
  onConfirmed: () => void;
}) {
  const [dateOf, setDateOf] = useState("");
  const [venues, setVenues] = useState("");
  const [est, setEst] = useState("");
  const [message, setMessage] = useState(() => draftMessage(request));
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<SendState>({ kind: "idle" });

  function regenerate() {
    setMessage(
      draftMessage(request, {
        date_of: dateOf || null,
        venues_final: venues || null,
        est_check: est ? Number(est) : null,
      })
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  async function send() {
    if (!message.trim()) return;
    setState({ kind: "sending" });
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          date_of: dateOf || null,
          venues_final: venues || null,
          est_check: est ? Number(est) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not confirm.");
      }
      // Booking is saved and status is confirmed regardless of the text.
      onConfirmed();
      if (data.texted) {
        setState({ kind: "texted" });
      } else {
        setState({ kind: "manual", warning: data.warning });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not confirm.",
      });
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blush";
  const sending = state.kind === "sending";

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-night-soft/60 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-xs text-white/50">
          Date
          <input
            type="date"
            value={dateOf}
            onChange={(e) => setDateOf(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50 sm:col-span-2">
          Venues / plan
          <input
            type="text"
            value={venues}
            onChange={(e) => setVenues(e.target.value)}
            placeholder="Dinner at Lilia, drinks at Ides…"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50">
          Est. check ($)
          <input
            type="number"
            min={0}
            value={est}
            onChange={(e) => setEst(e.target.value)}
            placeholder="180"
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={regenerate}
        className="mt-2 text-xs text-blush underline-offset-2 hover:underline"
      >
        Refresh draft from details
      </button>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={7}
        className={`mt-2 resize-y ${inputClass}`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={sending || !message.trim()}
          className="rounded-lg bg-blush px-3 py-1.5 text-sm font-semibold text-night transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Sending…" : "Confirm & text back"}
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/40"
        >
          {copied ? "Copied ✓" : "Copy text"}
        </button>
      </div>

      {state.kind === "texted" && (
        <p className="mt-2 text-sm text-emerald-300">
          Texted the couple and marked it confirmed. 🎉
        </p>
      )}
      {state.kind === "manual" && (
        <p className="mt-2 text-sm text-ember">
          Booking saved & confirmed, but SMS isn&apos;t set up
          {state.warning ? ` (${state.warning})` : ""} — hit “Copy text” and
          send it from your phone.
        </p>
      )}
      {state.kind === "error" && (
        <p className="mt-2 text-sm text-red-300">{state.message}</p>
      )}
    </div>
  );
}
