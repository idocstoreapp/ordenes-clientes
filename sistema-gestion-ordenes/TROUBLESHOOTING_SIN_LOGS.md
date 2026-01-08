# Troubleshooting: No Aparecen Logs en Vercel

## Problema
- No aparecen logs de `/api/send-order-email` en Vercel
- Error "Unexpected end of JSON input" en el cliente
- Solo aparecen logs de GET requests a "/"

## Posibles Causas

### 1. La API Route No Se Está Ejecutando

**Síntomas:**
- No hay logs en Vercel
- Error "Unexpected end of JSON input"
- Status 404 o 500 sin detalles

**Solución:**
1. Verifica que el archivo esté en `src/pages/api/send-order-email.ts`
2. Verifica que `output: 'server'` esté en `astro.config.mjs`
3. Haz un nuevo deploy completo

### 2. La API Route Se Ejecuta Pero Falla Antes de Logging

**Síntomas:**
- No hay logs en Vercel
- Error "Unexpected end of JSON input"
- Status 500

**Solución:**
- Agregamos logging inmediato al inicio de la función
- Verifica los logs después del próximo deploy

### 3. Problema con Variables de Entorno

**Síntomas:**
- La función se ejecuta pero falla inmediatamente
- No hay logs visibles

**Solución:**
1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**
2. Verifica que `RESEND_API_KEY` esté configurada
3. Asegúrate de que esté marcada para **Production**
4. Haz un nuevo deploy

### 4. La Ruta No Se Está Llamando Correctamente

**Síntomas:**
- No hay logs en Vercel
- Error en el cliente

**Solución:**
- Verifica en la consola del navegador (F12) si la petición se está haciendo
- Verifica la URL completa en los logs del cliente

## Pasos para Diagnosticar

### Paso 1: Verificar en el Navegador

1. Abre tu aplicación en producción
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña **"Network"** (Red)
4. Intenta cambiar el estado de una orden a "por entregar"
5. Busca una petición a `/api/send-order-email`
6. Haz clic en ella para ver:
   - **Status Code** (200, 404, 500, etc.)
   - **Response** (el contenido de la respuesta)
   - **Headers** (los headers de la petición y respuesta)

### Paso 2: Verificar Logs en Vercel

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. Ve a **"Logs"** (pestaña o menú lateral)
3. Intenta cambiar el estado de una orden
4. Busca cualquier mensaje que aparezca

### Paso 3: Verificar Build Logs

1. Ve a **Deployments** → Último deployment
2. Ve a **"Build Logs"**
3. Busca mensajes sobre:
   - `[@astrojs/vercel] Bundling function`
   - `api/send-order-email`
   - Cualquier error relacionado

### Paso 4: Probar la Ruta Directamente

Puedes probar la ruta directamente usando `curl` o Postman:

```bash
curl -X POST https://app.idocstore.cl/api/send-order-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "customerName": "Test",
    "orderNumber": "ORD-000001",
    "emailType": "ready_for_pickup"
  }'
```

Esto te dirá si la ruta existe y qué error devuelve.

## Qué Buscar en los Logs

Después del próximo deploy, busca en los logs:

1. **`[EMAIL API] ========================================`** - Confirma que la función se ejecuta
2. **`[EMAIL API] FUNCIÓN EJECUTADA`** - Confirma que llegó al inicio
3. **`[EMAIL API] ERROR`** - Cualquier error que ocurra
4. **`[ORDERS TABLE]`** - Logs del cliente antes de hacer la petición

## Si Aún No Aparecen Logs

1. **Verifica que el deploy se completó correctamente**
   - Ve a Deployments → Último deployment
   - Verifica que el status sea "Ready" (verde)

2. **Verifica que estás en el entorno correcto**
   - Asegúrate de estar probando en producción, no en preview

3. **Intenta hacer un deploy manual**
   - Ve a Deployments → "Redeploy"

4. **Verifica la configuración de Vercel**
   - Ve a Settings → General
   - Verifica que el Root Directory sea `sistema-gestion-ordenes`

## Próximos Pasos

1. Haz un nuevo deploy con los cambios de logging
2. Intenta cambiar el estado de una orden
3. Revisa los logs en Vercel
4. Revisa la consola del navegador (F12)
5. Comparte lo que encuentres










