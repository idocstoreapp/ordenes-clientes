import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string;

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    if (typeof window !== 'undefined') {
      console.warn('[supabase-admin] Missing service role key. Admin operations will fail.');
    }
    return null;
  }

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

export const supabaseAdmin = getSupabaseAdmin();



