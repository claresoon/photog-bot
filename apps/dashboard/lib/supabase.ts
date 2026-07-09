import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import type { Database } from "@photog-bot/shared";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

// Service-role client, used only from server components / route handlers
// / server actions. The key never reaches the browser — see SPEC.md §7-8.
export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false },
  // supabase-js constructs a RealtimeClient eagerly even though we never
  // use realtime features, and on Node < 22 (no global WebSocket) that
  // constructor throws. Supplying an implementation avoids the crash
  // regardless of host Node version.
  realtime: {
    transport: WebSocket as any,
  },
});
