import { useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Componente de diagnóstico para verificar la configuración del Service Role Key
 * Solo visible para administradores
 */
export default function AdminDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<{
    hasServiceRoleKey: boolean;
    hasUrl: boolean;
    serviceRoleKeyLength: number;
    serviceRoleKeyPrefix: string;
    supabaseAdminExists: boolean;
    envVars: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    // Usar la información de debug del módulo
    const url = import.meta.env.PUBLIC_SUPABASE_URL as string;
    const serviceRoleKey = import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string;
    
    // Verificar todas las formas posibles de acceso
    const allEnvKeys = Object.keys(import.meta.env).filter(k => 
      k.includes('SUPABASE') || k.includes('SERVICE')
    );

    setDiagnostics({
      hasServiceRoleKey: !!serviceRoleKey && serviceRoleKey.length > 0,
      hasUrl: !!url && url.length > 0,
      serviceRoleKeyLength: serviceRoleKey?.length || 0,
      serviceRoleKeyPrefix: serviceRoleKey?.substring(0, 30) || 'missing',
      supabaseAdminExists: !!supabaseAdmin,
      envVars: {
        PUBLIC_SUPABASE_URL: url ? '✅ Configurado' : '❌ No configurado',
        PUBLIC_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? '✅ Configurado' : '❌ No configurado',
        'Debug - hasUrl': import.meta.env.PUBLIC_SUPABASE_URL ? '✅' : '❌',
        'Debug - hasServiceRoleKey': import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌',
        'Todas las keys SUPABASE': allEnvKeys.join(', ') || 'Ninguna encontrada',
      },
    });
  }, []);

  if (!diagnostics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-slate-500">Cargando diagnóstico...</div>
      </div>
    );
  }

  const allGood = diagnostics.hasServiceRoleKey && diagnostics.hasUrl && diagnostics.supabaseAdminExists;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        🔍 Diagnóstico de Configuración
      </h3>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${allGood ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="font-semibold mb-2">
            {allGood ? '✅ Todo configurado correctamente' : '⚠️ Problemas detectados'}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>PUBLIC_SUPABASE_URL:</span>
              <span className={diagnostics.hasUrl ? 'text-emerald-700' : 'text-red-700'}>
                {diagnostics.envVars.PUBLIC_SUPABASE_URL}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>PUBLIC_SUPABASE_SERVICE_ROLE_KEY:</span>
              <span className={diagnostics.hasServiceRoleKey ? 'text-emerald-700' : 'text-red-700'}>
                {diagnostics.envVars.PUBLIC_SUPABASE_SERVICE_ROLE_KEY}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Cliente supabaseAdmin:</span>
              <span className={diagnostics.supabaseAdminExists ? 'text-emerald-700' : 'text-red-700'}>
                {diagnostics.supabaseAdminExists ? '✅ Creado' : '❌ No creado'}
              </span>
            </div>
          </div>
        </div>

        {diagnostics.hasServiceRoleKey && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm font-semibold mb-2">Detalles del Service Role Key:</div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Longitud: {diagnostics.serviceRoleKeyLength} caracteres</div>
              <div>Prefijo: {diagnostics.serviceRoleKeyPrefix}...</div>
              <div className="text-slate-500 mt-2">
                {diagnostics.serviceRoleKeyLength < 100 
                  ? '⚠️ La clave parece muy corta. Verifica que copiaste la clave completa.'
                  : diagnostics.serviceRoleKeyLength > 500
                  ? '⚠️ La clave parece muy larga. Verifica que no hay espacios extra.'
                  : diagnostics.serviceRoleKeyLength >= 100 && diagnostics.serviceRoleKeyLength <= 500
                  ? '✅ La longitud parece correcta'
                  : '⚠️ Longitud inesperada'}
              </div>
              {diagnostics.serviceRoleKeyPrefix && !diagnostics.serviceRoleKeyPrefix.startsWith('eyJ') && (
                <div className="text-red-600 mt-2">
                  ⚠️ El prefijo no es correcto. Debe empezar con "eyJ"
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-900 mb-2">🔍 Información de Debug:</div>
          <div className="text-xs text-blue-700 space-y-1">
            {Object.entries(diagnostics.envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-mono text-xs">{key}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {!diagnostics.hasServiceRoleKey && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="font-semibold text-red-900 mb-2">❌ Service Role Key no encontrado</div>
            <div className="text-sm text-red-700 space-y-2">
              <p><strong>Para desarrollo local:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Crea o edita el archivo <code className="bg-red-100 px-1 rounded">.env.local</code> en la raíz del proyecto</li>
                <li>Agrega: <code className="bg-red-100 px-1 rounded">PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui</code></li>
                <li>Reinicia el servidor de desarrollo</li>
              </ol>
              
              <p className="mt-3"><strong>Para Vercel (producción):</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a Vercel Dashboard → Settings → Environment Variables</li>
                <li>Agrega <code className="bg-red-100 px-1 rounded">PUBLIC_SUPABASE_SERVICE_ROLE_KEY</code> con el valor del service_role key</li>
                <li>Marca Production, Preview y Development</li>
                <li>Haz redeploy del proyecto</li>
              </ol>
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-900 mb-2">💡 Información</div>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• El Service Role Key se obtiene en: Supabase Dashboard → Settings → API → service_role key</p>
            <p>• La clave debe empezar con <code className="bg-blue-100 px-1 rounded">eyJ</code> y ser muy larga (200+ caracteres)</p>
            <p>• En Vercel, las variables de entorno solo se aplican después de un redeploy</p>
            <p>• Verifica que no hay espacios al inicio o final de la clave</p>
          </div>
        </div>
      </div>
    </div>
  );
}

