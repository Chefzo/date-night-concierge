/**
 * Shared parsing/validation for package input, used by the create and update
 * API routes so the two stay in lock-step.
 */

export type PackageInput = {
  name?: string;
  description?: string | null;
  venues?: string | null;
  est_total?: number | null;
  vibe_tags?: string[] | null;
  active?: boolean;
};

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Accept either a real array or a comma-separated string of tags. */
export function parseTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];
  return raw
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12);
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/**
 * Build a DB payload from a raw request body. `partial` controls whether an
 * absent field is omitted (PATCH) or coerced to its empty value (POST).
 * Returns `{ error }` when validation fails.
 */
export function buildPackagePayload(
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): { error: string } | { payload: Record<string, unknown> } {
  const payload: Record<string, unknown> = {};

  if (!partial || "name" in body) {
    const name = str(body.name, 120);
    if (!name) return { error: "A package name is required." };
    payload.name = name;
  }
  if (!partial || "description" in body) {
    payload.description = str(body.description, 600) || null;
  }
  if (!partial || "venues" in body) {
    payload.venues = str(body.venues, 500) || null;
  }
  if (!partial || "est_total" in body) {
    payload.est_total = num(body.est_total);
  }
  if (!partial || "vibe_tags" in body) {
    const tags = parseTags(body.vibe_tags);
    payload.vibe_tags = tags.length ? tags : null;
  }
  if ("active" in body) {
    payload.active = body.active !== false;
  }

  return { payload };
}
