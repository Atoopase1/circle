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
        // This is critical because if the app is suspended in the background and misses
        // a realtime event, it relies on fetch() to get the missing messages. If fetch()
        // returns a stale cache, the messages are invisible until a hard refresh.
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' });
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
