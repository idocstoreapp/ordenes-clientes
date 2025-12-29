/**
 * Cliente Admin de Supabase para operaciones que requieren permisos elevados
 * 
 * IMPORTANTE: Este archivo usa el service_role key que solo debe estar en el servidor.
 * En producción, deberías usar Edge Functions en lugar de exponer esto en el frontend.
 * 
 * Para desarrollo, puedes configurar:
 * PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
 * 
 * ⚠️ NUNCA expongas el service_role key en código público o repositorios.
 */

import { createClient } from "@supabase/supabase-js";

// Función helper para obtener variables de entorno de forma más robusta
function getEnvVar(key: string): string | undefined {
  // Intentar diferentes formas de acceder a la variable
  const value = 
    import.meta.env[key] ||
    import.meta.env[`VITE_${key}`] ||
    (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) ||
    undefined;
  
  // Limpiar espacios en blanco si existe
  return value?.trim() || undefined;
}

const url = getEnvVar('PUBLIC_SUPABASE_URL') || '';
const serviceRoleKey = getEnvVar('PUBLIC_SUPABASE_SERVICE_ROLE_KEY') || '';

// Validación más estricta: la clave debe tener al menos 100 caracteres (las service_role keys son muy largas)
const isValidServiceRoleKey = serviceRoleKey && serviceRoleKey.length >= 100 && serviceRoleKey.startsWith('eyJ');

// Solo crear el cliente admin si tenemos tanto la URL como el service_role key válido
export const supabaseAdmin = (url && isValidServiceRoleKey)
  ? createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

