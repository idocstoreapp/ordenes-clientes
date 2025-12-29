# Cómo Ver Logs en Vercel

## Pasos para Ver los Logs

### 1. Acceder a los Logs del Deployment

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a la pestaña **"Deployments"**
4. Haz clic en el **último deployment** (el más reciente)

### 2. Ver Logs de Functions (API Routes)

**Opción A: Desde la pestaña "Functions"**
1. En la página del deployment, busca la pestaña **"Functions"** (junto a "Deployment", "Logs", "Resources")
2. Si la ves, haz clic en ella
3. Busca la función `/api/send-order-email`
4. Haz clic en ella para ver los logs

**Opción B: Desde "Resources"**
1. En la página del deployment, haz clic en la pestaña **"Resources"**
2. Busca una sección de **"Functions"** o **"Serverless Functions"**
3. Busca `/api/send-order-email` y haz clic

**Opción C: Si no encuentras Functions (usar Logs directamente)**
1. Ve directamente a la pestaña **"Logs"** del deployment
2. O ve a **Vercel Dashboard → Tu Proyecto → Logs** (menú lateral)
3. Los logs de las Functions aparecerán aquí cuando se ejecuten
4. Filtra por `[EMAIL API]` para ver solo los logs de emails

### 3. Ver Logs en Tiempo Real

1. En la página del deployment, haz clic en **"View Function Logs"** o **"Logs"**
2. O ve directamente a: **Deployments → [Tu Deployment] → Functions → [Función] → Logs**

### 4. Ver Logs Generales del Proyecto

1. En el dashboard del proyecto, ve a **"Logs"** en el menú lateral
2. Aquí verás todos los logs del proyecto en tiempo real

## Qué Buscar en los Logs

Ahora los logs tienen prefijos para facilitar la búsqueda:

- `[EMAIL API]` - Logs de la API de envío de emails
- `[ORDERS TABLE]` - Logs cuando se cambia el estado de una orden
- `[ORDER FORM]` - Logs cuando se crea una nueva orden

### Ejemplos de Logs que Verás:

**Cuando se envía un email exitosamente:**
```
[EMAIL API] Iniciando envío de email
[EMAIL API] API Key encontrada
[EMAIL API] Datos recibidos: { to: 'cli***', orderNumber: 'ORD-000001', ... }
[EMAIL API] Preparando email: { from: 'informacion@app.idocstore.cl', ... }
[EMAIL API] Enviando email a Resend...
[EMAIL API] Email enviado exitosamente: { emailId: 'abc123', ... }
```

**Si hay un error:**
```
[EMAIL API] ERROR desde Resend: { message: '...', ... }
```

**Cuando se cambia el estado a "por entregar":**
```
[ORDERS TABLE] Enviando email de notificación para orden: ORD-000001
[EMAIL API] Iniciando envío de email
...
```

## Si No Ves Logs

### Posibles Razones:

1. **La función no se está ejecutando**
   - Verifica que realmente estás cambiando el estado o creando una orden
   - Revisa la consola del navegador (F12) para ver si hay errores del lado del cliente

2. **Los logs tardan en aparecer**
   - Espera unos segundos después de la acción
   - Refresca la página de logs

3. **El deployment no está activo**
   - Asegúrate de estar viendo el deployment más reciente
   - Verifica que el deployment esté en estado "Ready"

4. **Los logs están en otro lugar**
   - Revisa también la consola del navegador (F12 → Console)
   - Los logs del cliente aparecen ahí con los prefijos `[ORDERS TABLE]` y `[ORDER FORM]`

## Debugging

### Paso 1: Verificar que la función se ejecuta

1. Abre la consola del navegador (F12)
2. Intenta crear una orden o cambiar el estado
3. Busca mensajes con `[ORDERS TABLE]` o `[ORDER FORM]`
4. Si no aparecen, la función no se está llamando

### Paso 2: Verificar logs en Vercel

1. Ve a Vercel → Tu Proyecto → Deployments → Último Deployment
2. Ve a Functions → `/api/send-order-email`
3. Busca mensajes con `[EMAIL API]`
4. Si no aparecen, la API no se está ejecutando

### Paso 3: Verificar errores

1. Si ves `[EMAIL API] ERROR`, copia el mensaje completo
2. Revisa el mensaje de error para identificar el problema
3. Los errores más comunes:
   - `RESEND_API_KEY no configurada` → Falta la variable de entorno
   - Error de dominio → El email "from" no coincide con el dominio verificado
   - Error de validación → El email del destinatario es inválido

## Consejos

- Los logs en Vercel pueden tardar unos segundos en aparecer
- Usa los prefijos `[EMAIL API]`, `[ORDERS TABLE]`, `[ORDER FORM]` para filtrar
- Los logs del cliente (navegador) aparecen inmediatamente
- Los logs del servidor (Vercel) pueden tardar un poco más

