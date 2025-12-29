import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL as string;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

// Crear cliente solo si tenemos las variables, sino crear uno dummy que fallará en runtime
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!url || !anon) {
    if (typeof window !== 'undefined') {
      // Solo en el navegador, mostrar error claro
      console.error('[supabase] Missing environment variables:', {
        hasUrl: !!url,
        hasAnonKey: !!anon,
      });
      throw new Error("Missing Supabase environment variables. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY");
    }
    // Durante build, crear un cliente dummy que no se usará
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

