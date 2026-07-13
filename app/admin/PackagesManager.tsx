"use client";

import { useState } from "react";
import { Package } from "@/lib/types";

type Draft = {
  name: string;
  venues: string;
  est_total: string;
  vibe_tags: string;
  description: string;
};

const EMPTY: Draft = {
  name: "",
  venues: "",
  est_total: "",
  vibe_tags: "",
  description: "",
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blush";

function toDraft(p: Package): Draft {
  return {
    name: p.name,
    venues: p.venues ?? "",
    est_total: p.est_total != null ? String(p.est_total) : "",
    vibe_tags: (p.vibe_tags ?? []).join(", "),
    description: p.description ?? "",
  };
}

function draftToBody(d: Draft) {
  return {
    name: d.name.trim(),
    venues: d.venues.trim() || null,
    est_total: d.est_total.trim() === "" ? null : Number(d.est_total),
    vibe_tags: d.vibe_tags,
    description: d.description.trim() || null,
  };
}

export default function PackagesManager({ initial }: { initial: Package[] }) {
  const [packages, setPackages] = useState<Package[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function upsert(p: Package) {
    setPackages((list) => {
      const i = list.findIndex((x) => x.id === p.id);
      const next = i === -1 ? [...list, p] : list.map((x) => (x.id === p.id ? p : x));
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function toggleActive(p: Package) {
    // optimistic
    const next = { ...p, active: !p.active };
    upsert(next);
    const res = await fetch(`/api/admin/packages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next.active }),
    });
    if (!res.ok) upsert(p); // roll back
  }

  async function remove(p: Package) {
    if (!confirm(`Delete “${p.name}”? This can't be undone.`)) return;
    const prev = packages;
    setPackages((list) => list.filter((x) => x.id !== p.id));
    const res = await fetch(`/api/admin/packages/${p.id}`, { method: "DELETE" });
    if (!res.ok) setPackages(prev); // roll back
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Packages</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-blush px-3 py-1.5 text-sm font-semibold text-night transition hover:opacity-90"
          >
            + New package
          </button>
        )}
      </div>

      <p className="mb-5 text-sm text-white/50">
        Curated nights you can drop straight into a confirmation. Only{" "}
        <span className="text-white/70">active</span> packages show up in the
        composer.
      </p>

      {adding && (
        <PackageForm
          initial={EMPTY}
          submitLabel="Save package"
          onCancel={() => setAdding(false)}
          onSubmit={async (draft) => {
            const res = await fetch("/api/admin/packages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(draftToBody(draft)),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not save.");
            upsert(data.package as Package);
            setAdding(false);
          }}
        />
      )}

      {packages.length === 0 && !adding ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-white/50">
          No packages yet. Add your go-to date nights so you can send them in a
          tap.
        </p>
      ) : (
        <ul className="space-y-3">
          {packages.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <PackageForm
                  initial={toDraft(p)}
                  submitLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (draft) => {
                    const res = await fetch(`/api/admin/packages/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(draftToBody(draft)),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Could not save.");
                    upsert(data.package as Package);
                    setEditingId(null);
                  }}
                />
              </li>
            ) : (
              <li key={p.id}>
                <PackageCard
                  pkg={p}
                  onEdit={() => setEditingId(p.id)}
                  onToggle={() => toggleActive(p)}
                  onDelete={() => remove(p)}
                />
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  onEdit,
  onToggle,
  onDelete,
}: {
  pkg: Package;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        pkg.active
          ? "border-white/10 bg-white/5"
          : "border-white/5 bg-white/[0.02] opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{pkg.name}</span>
            {pkg.est_total != null && (
              <span className="text-sm text-white/50">
                ~${Math.round(pkg.est_total)}
              </span>
            )}
            {!pkg.active && (
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/40">
                Inactive
              </span>
            )}
          </div>
          {pkg.venues && (
            <p className="mt-0.5 text-sm text-white/70">{pkg.venues}</p>
          )}
          {pkg.description && (
            <p className="mt-1 text-sm text-white/50">{pkg.description}</p>
          )}
          {pkg.vibe_tags && pkg.vibe_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pkg.vibe_tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-ember/15 px-2 py-0.5 text-xs text-ember"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <button
          onClick={onEdit}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-white/60 transition hover:border-white/30 hover:text-white"
        >
          {pkg.active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={onDelete}
          className="ml-auto rounded-lg border border-red-400/30 px-2.5 py-1 text-red-300/80 transition hover:border-red-400/60 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function PackageForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    if (!draft.name.trim()) {
      setError("Give the package a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-blush/30 bg-white/5 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/50 sm:col-span-2">
          Name
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Cozy Italian & a nightcap"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50 sm:col-span-2">
          Venues / plan
          <input
            value={draft.venues}
            onChange={(e) => set("venues", e.target.value)}
            placeholder="Dinner at Lilia, drinks at Ides"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50">
          Est. total ($)
          <input
            type="number"
            min={0}
            value={draft.est_total}
            onChange={(e) => set("est_total", e.target.value)}
            placeholder="180"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50">
          Vibe tags (comma-separated)
          <input
            value={draft.vibe_tags}
            onChange={(e) => set("vibe_tags", e.target.value)}
            placeholder="romantic, cozy"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-white/50 sm:col-span-2">
          Notes (optional)
          <textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Ask for the corner booth; dessert is on the house if you mention us."
            className={`mt-1 resize-y ${inputClass}`}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-blush px-3 py-1.5 text-sm font-semibold text-night transition disabled:opacity-40"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
