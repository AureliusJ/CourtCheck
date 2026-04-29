import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server client: used in route handlers and server components.
// Uses the service role key so cron/admin routes can bypass RLS.
// Do not expose to the browser.
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Browser client: used in client components that need direct Supabase access.
// Uses the anon key; subject to RLS.
let _browserClient: ReturnType<typeof createClient> | null = null;
export function getBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}
