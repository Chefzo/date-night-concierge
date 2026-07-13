"use client";

import { useState } from "react";

const VIBES = [
  "Romantic & intimate",
  "Fun & adventurous",
  "Chill & low-key",
  "Fancy night out",
  "Surprise us",
];
const BUDGETS = [
  "$ — under $75",
  "$$ — $75–150",
  "$$$ — $150–300",
  "$$$$ — $300+",
];
const NIGHTS = ["This weekend", "Next weekend", "A weeknight", "We're flexible"];

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-blush">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? "" : opt)}
              aria-pressed={selected}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selected
                  ? "border-blush bg-blush/20 text-white"
                  : "border-white/15 bg-white/5 text-white/80 hover:border-white/40"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vibe, setVibe] = useState("");
  const [budget, setBudget] = useState("");
  const [night, setNight] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 7 &&
    consent &&
    status !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          vibe,
          budget_range: budget,
          preferred_night: night,
          sms_consent: consent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">💌</div>
        <h1 className="mt-4 text-2xl font-semibold">You're on the list.</h1>
        <p className="mt-3 text-white/70">
          We'll text {name.split(" ")[0] || "you"} shortly with a plan for the
          night. Keep your phone close.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-ember">
          Date Night Concierge
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Tell us the vibe.
          <br />
          We plan the whole night.
        </h1>
        <p className="mt-3 text-white/70">
          Two questions and a couple of taps. We'll text you the itinerary —
          no app, no account.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-blush">
            Your name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex & Sam"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 outline-none focus:border-blush"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-blush">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 outline-none focus:border-blush"
          />
          <p className="text-xs text-white/40">This is where we text the plan.</p>
        </div>

        <ChipGroup label="What's the vibe?" options={VIBES} value={vibe} onChange={setVibe} />
        <ChipGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
        <ChipGroup label="When?" options={NIGHTS} value={night} onChange={setNight} />

        <label className="flex items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 accent-blush"
          />
          <span>
            Text me about my date night. I agree to receive text messages at the
            number above about my request. Msg &amp; data rates may apply; reply
            STOP to opt out.
          </span>
        </label>

        {status === "error" && (
          <p className="text-sm text-red-300">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-blush px-4 py-4 text-base font-semibold text-night transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "submitting" ? "Sending…" : "Plan our night →"}
        </button>
        <p className="text-center text-xs text-white/40">
          Takes about 20 seconds. We only use your number to plan this date.
        </p>
      </form>

      <p className="mt-8 text-center text-xs text-white/40">
        <a
          href="/demo.html"
          className="underline-offset-2 transition hover:text-white/70 hover:underline"
        >
          See how it works →
        </a>
      </p>
    </main>
  );
}
