import { createClient } from "@supabase/supabase-js";
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
});
