import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that forwards PostgREST requests through a
 * narrowly scoped Supabase Edge Function. The privileged Supabase key stays
 * in Supabase, and the gateway token stays in Vercel server environment vars.
 *
 * Never import this module into a client component.
 */
let cached: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const gatewayKey = process.env.CONCIERGE_GATEWAY_KEY;

  if (!url || !publicKey || !gatewayKey) {
    throw new Error("Missing Supabase gateway configuration.");
  }

  const origin = new URL(url).origin;
  const forward: typeof fetch = async (input, init) => {
    const original = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    );
    const prefix = "/rest/v1/";
    if (original.origin !== origin || !original.pathname.startsWith(prefix)) {
      throw new Error("Unsupported Supabase gateway request.");
    }

    const table = original.pathname.slice(prefix.length);
    if (!["requests", "bookings"].includes(table)) {
      throw new Error("Table not permitted by concierge gateway.");
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.delete("apikey");
    headers.delete("authorization");
    headers.set("x-concierge-gateway-key", gatewayKey);

    return fetch(
      `${origin}/functions/v1/concierge-gateway/${table}${original.search}`,
      { ...init, headers, cache: "no-store" }
    );
  };

  cached = createClient(url, publicKey, {
    global: { fetch: forward },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
