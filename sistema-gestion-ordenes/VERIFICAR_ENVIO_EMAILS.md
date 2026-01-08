# Cómo Verificar si se Están Enviando Emails

## Pasos para Diagnosticar

### 1. Verificar en la Consola del Navegador

1. Abre tu aplicación en el navegador
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña **"Console"**
4. Intenta cambiar el estado de una orden a "por entregar"
5. Busca mensajes que empiecen con `[ORDERS TABLE]`

**Qué deberías ver:**
```
[ORDERS TABLE] Estado cambiado a 'por_entregar' para orden: ORD-000001
[ORDERS TABLE] Datos del cliente: { hasCustomer: true, hasEmail: true, email: 'cli***' }
[ORDERS TABLE] Enviando email de notificación para orden: ORD-000001
```

**Si NO ves estos mensajes:**
- El código no se está ejecutando
- Verifica que realmente estás cambiando el estado a "por entregar"
- Verifica que la orden tiene un cliente asociado

**Si ves un warning:**
```
[ORDERS TABLE] No se puede enviar email: el cliente no tiene email configurado
```
- Significa que el cliente en la base de datos no tiene un email válido
- Necesitas agregar el email del cliente en la base de datos

### 2. Verificar en Vercel Logs

1. Ve a Vercel Dashboard → Tu Proyecto
2. Deployments → Último deployment
3. Functions → `/api/send-order-email`
4. Busca mensajes con `[EMAIL API]`

**Qué deberías ver si se está enviando:**
```
[EMAIL API] Iniciando envío de email
[EMAIL API] API Key encontrada
[EMAIL API] Datos recibidos: { to: 'cli***', orderNumber: 'ORD-000001', emailType: 'ready_for_pickup' }
[EMAIL API] Preparando email: { from: 'informacion@app.idocstore.cl', ... }
[EMAIL API] Enviando email a Resend...
[EMAIL API] Email enviado exitosamente: { emailId: 'abc123', ... }
```

**Si NO ves estos logs:**
- La API no se está ejecutando
- El fetch desde el cliente no está llegando al servidor
- Revisa la consola del navegador para ver si hay errores de red

**Si ves un error:**
```
[EMAIL API] ERROR desde Resend: { message: '...', ... }
```
- Copia el mensaje de error completo
- Revisa qué dice el error específico

### 3. Verificar en Resend Dashboard

1. Ve a [Resend Dashboard](https://resend.com/emails)
2. Ve a la pestaña **"Emails"**
3. Deberías ver intentos de envío

**Si NO ves ningún intento:**
- La API no se está ejecutando
- El email no está llegando a Resend
- Revisa los logs en Vercel

**Si ves intentos pero están fallando:**
- Revisa el mensaje de error en Resend
- Los errores más comunes:
  - "Domain not verified" → El dominio no está completamente verificado
  - "Invalid from address" → El email "from" no coincide con el dominio verificado
  - "Rate limit exceeded" → Has alcanzado el límite de envíos

### 4. Verificar que el Cliente Tiene Email

1. En tu aplicación, ve a la orden
2. Verifica que el cliente tenga un email configurado
3. Si no tiene email, agrégalo editando el cliente

**Cómo verificar en la base de datos:**
1. Ve a Supabase Dashboard
2. Ve a la tabla `customers`
3. Busca el cliente de la orden
4. Verifica que el campo `email` tenga un valor válido

### 5. Probar Manualmente

Puedes probar enviar un email manualmente desde Resend:

1. Ve a Resend Dashboard → Emails → "Send Test Email"
2. From: `informacion@app.idocstore.cl`
3. To: Tu email personal
4. Subject: "Test"
5. Body: "Test email"
6. Envía

**Si funciona:**
- Resend está configurado correctamente
- El problema está en el código de la aplicación

**Si NO funciona:**
- Hay un problema con la configuración de Resend
- Revisa que el dominio esté completamente verificado

## Checklist de Verificación

- [ ] El cliente tiene un email válido en la base de datos
- [ ] La consola del navegador muestra `[ORDERS TABLE] Enviando email...`
- [ ] Los logs en Vercel muestran `[EMAIL API] Iniciando envío de email`
- [ ] Resend Dashboard muestra intentos de envío
- [ ] El dominio `app.idocstore.cl` está verificado en Resend
- [ ] El email "from" es `informacion@app.idocstore.cl` (o del dominio verificado)
- [ ] La variable `RESEND_API_KEY` está configurada en Vercel

## Errores Comunes

### "No se puede enviar email: el cliente no tiene email configurado"
**Solución:** Agrega el email del cliente en la base de datos o edita el cliente desde la aplicación.

### "RESEND_API_KEY no configurada"
**Solución:** 
1. Ve a Vercel → Tu Proyecto → Settings → Environment Variables
2. Agrega `RESEND_API_KEY` con tu API key de Resend
3. Haz un nuevo deploy

### "Domain not verified"
**Solución:**
1. Ve a Resend → Domains
2. Verifica que `app.idocstore.cl` esté completamente verificado
3. Todos los registros DNS deben estar en "Verified" (verde)

### "Invalid from address"
**Solución:**
- El email "from" debe ser del dominio verificado
- Si el dominio verificado es `app.idocstore.cl`, el email debe ser `algo@app.idocstore.cl`
- Verifica en el código que `fromEmail` use el dominio correcto










