# Explicación: Functions en Vercel con Astro

## ¿Por qué solo veo `/_render`?

En Astro con Vercel, cuando usas `output: 'server'`, **todas las rutas** (incluyendo las API routes) se manejan a través de una **única función serverless** llamada `/_render`.

Esto significa que:
- ✅ Tu API route `/api/send-order-email` **SÍ existe** y funciona
- ✅ Se maneja dentro de la función `/_render`
- ✅ No aparece como una función separada en la lista de Functions

## Cómo Verificar que Funciona

### Método 1: Ver Logs (Recomendado)

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. Ve a **"Logs"** (pestaña o menú lateral)
3. Intenta cambiar el estado de una orden a "por entregar"
4. Busca mensajes con `[EMAIL API]` en los logs

### Método 2: Probar la Ruta Directamente

1. Ve a tu aplicación en producción: `https://app.idocstore.cl`
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña **"Network"** (Red)
4. Intenta cambiar el estado de una orden a "por entregar"
5. Busca una petición a `/api/send-order-email`
6. Haz clic en ella para ver los detalles

### Método 3: Ver Logs del Deployment

1. Ve a **Deployments** → Último deployment
2. Ve a la pestaña **"Logs"**
3. Intenta cambiar el estado de una orden
4. Los logs aparecerán aquí en tiempo real

## El Error 500

El error 500 que estás viendo significa que:
- ✅ La ruta `/api/send-order-email` **SÍ se está encontrando**
- ❌ Hay un error interno en el servidor al ejecutarla

Para ver el error específico:
1. Ve a **Vercel Dashboard** → Tu Proyecto → **"Logs"**
2. Intenta cambiar el estado de una orden
3. Busca mensajes con `[EMAIL API] ERROR` o `[EMAIL API] ERROR EXCEPCIÓN`
4. El mensaje te dirá exactamente qué está fallando

## Posibles Causas del Error 500

1. **RESEND_API_KEY no configurada en Vercel**
   - Ve a Settings → Environment Variables
   - Verifica que `RESEND_API_KEY` esté configurada
   - Asegúrate de que esté marcada para **Production**

2. **Error al crear el cliente Resend**
   - Revisa los logs para ver el error específico

3. **Error al parsear el body de la request**
   - Revisa los logs para ver el error específico

4. **Error al enviar el email a Resend**
   - Revisa los logs para ver el mensaje de error de Resend

## Próximos Pasos

1. **Ve a los Logs en Vercel** (la forma más fácil)
2. **Intenta cambiar el estado de una orden**
3. **Busca el mensaje de error específico** con `[EMAIL API]`
4. **Comparte el error** para poder solucionarlo

Los logs te dirán exactamente qué está fallando.










