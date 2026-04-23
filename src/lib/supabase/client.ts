// ============================================================
// Browser-side Supabase client (singleton)
// ============================================================
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Force Next.js and the browser to never cache Supabase API responses.
        // Using cache: 'no-store' prevents Next.js App Router caching.
        // NOTE: Do NOT append query params like _cb=timestamp — PostgREST
        // interprets ALL query params as column filters and will crash.
        fetch: (url, options) => {
          // Safely merge headers — Supabase passes a Headers instance,
          // not a plain object, so we must convert it first.
          const existingHeaders: Record<string, string> = {};
          if (options?.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                existingHeaders[key] = value;
              });
            } else if (typeof options.headers === 'object') {
              Object.assign(existingHeaders, options.headers);
            }
          }

          return fetch(url, {
            ...options,
            cache: 'no-store',
            headers: {
              ...existingHeaders,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });
        },
      },
      realtime: {
        // Send a heartbeat every 15 seconds to keep the WebSocket alive
        heartbeatIntervalMs: 15_000,
        // Allow up to 10 reconnect attempts on unexpected disconnects
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10_000),
        // Generous timeout before declaring a connection dead
        timeout: 30_000,
      },
    }
  );

  return client;
}
