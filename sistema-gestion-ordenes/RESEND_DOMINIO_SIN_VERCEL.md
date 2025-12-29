# Usar Tu Dominio con Resend (Sin Mover el Dominio a Vercel)

## ¿Es posible usar tu dominio sin moverlo a Vercel?

**¡SÍ!** Resend permite verificar tu dominio sin necesidad de moverlo a ninguna plataforma. Solo necesitas agregar algunos registros DNS.

## Cómo funciona

```
┌─────────────────┐         ┌──────────┐         ┌──────────────┐
│   Tu Sitio Web  │         │  Vercel  │         │    Resend    │
│  (Hosting       │         │ (Código  │         │ (Envío de    │
│   Actual)       │         │  de la   │         │  Emails)     │
│                 │         │  App)    │         │              │
└─────────────────┘         └──────────┘         └──────────────┘
      │                           │                      │
      │                           │                      │
      │      Tu dominio          │                      │
      │      (DNS aquí)          │                      │
      └──────────────────────────┴──────────────────────┘
                   Registros DNS compartidos
```

- **Tu sitio web**: Sigue en su hosting actual (cualquiera que sea)
- **Vercel**: Solo ejecuta el código de la aplicación (no necesita controlar el dominio)
- **Resend**: Solo necesita registros DNS para verificar que puedes enviar emails desde tu dominio
- **Tu dominio**: Solo necesita tener algunos registros DNS adicionales (no afecta tu sitio web)

## Pasos Detallados

### Paso 1: Verificar tu dominio en Resend

1. Ve a [Resend Dashboard](https://resend.com/domains)
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `idocstore.com`)
4. Resend te mostrará los registros DNS necesarios

### Paso 2: Agregar Registros DNS

Ve a tu proveedor DNS (donde está configurado tu dominio). Algunos ejemplos:

- **Cloudflare**
- **Namecheap**
- **GoDaddy**
- **Google Domains**
- **Cualquier otro proveedor DNS**

Agrega los registros que Resend te proporciona. Típicamente serán:

#### Registro SPF (TXT)
```
Tipo: TXT
Nombre: @  (o tu dominio completo)
Valor: v=spf1 include:resend.com ~all
```

#### Registros DKIM (CNAME)
Resend te dará varios registros CNAME como:
```
Tipo: CNAME
Nombre: resend._domainkey
Valor: resend._domainkey.resend.com
```

#### Registro DMARC (TXT) - Opcional pero recomendado
```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none;
```

### Paso 3: Verificar en Resend

1. Espera 5-15 minutos para que se propaguen los cambios DNS
2. Vuelve a Resend Dashboard → Domains
3. Haz clic en **"Verify"** en tu dominio
4. Si todos los registros están correctos, verás un check verde ✅

### Paso 4: Configurar el Email en el Código

El código ya está configurado para usar el email de la sucursal si está disponible. Si quieres usar un email específico por defecto:

1. Abre `src/pages/api/send-order-email.ts`
2. Busca la línea:
```typescript
const fromEmail = branchEmail || "noreply@idocstore.com";
```
3. Cambia `noreply@idocstore.com` por tu email verificado (ej: `ordenes@tudominio.com`)

### Paso 5: Usar el Email en las Sucursales

Para que cada sucursal use su propio email:

1. Ve a la página de **Sucursales** en tu aplicación
2. Edita cada sucursal
3. Agrega el campo **Email** (ej: `manquehue@idocstore.com`)
4. El sistema automáticamente usará ese email para enviar las órdenes

## Preguntas Frecuentes

### ¿Esto afecta mi sitio web actual?

**No.** Los registros DNS que agregas (SPF, DKIM, DMARC) son solo para verificación de emails. No afectan el funcionamiento de tu sitio web.

### ¿Necesito cambiar mi DNS a Vercel?

**No.** Tu dominio puede seguir apuntando a tu hosting actual. Solo necesitas agregar algunos registros adicionales.

### ¿Puedo usar múltiples emails?

**Sí.** Una vez verificado el dominio, puedes usar cualquier dirección de email de ese dominio:
- `noreply@tudominio.com`
- `ordenes@tudominio.com`
- `manquehue@tudominio.com`
- `contacto@tudominio.com`
- etc.

### ¿Qué pasa si ya tengo registros SPF/DKIM/DMARC?

Si ya tienes registros SPF para otro servicio de email, necesitas combinarlos. Por ejemplo:

**SPF existente:**
```
v=spf1 include:_spf.google.com ~all
```

**SPF combinado (incluye Google y Resend):**
```
v=spf1 include:_spf.google.com include:resend.com ~all
```

Para DKIM, puedes tener múltiples registros CNAME con nombres diferentes.

### ¿Cuánto tiempo tarda en verificarse?

Normalmente 5-15 minutos después de agregar los registros DNS. A veces puede tardar hasta 24 horas si hay caché DNS.

## Ejemplo Completo

Supongamos que tu dominio es `idocstore.com` y está en Cloudflare:

1. **En Resend**: Agrega el dominio `idocstore.com`
2. **En Cloudflare**: Agrega los registros DNS que Resend te da
3. **Espera 10 minutos**
4. **En Resend**: Haz clic en "Verify"
5. **Listo**: Ahora puedes enviar emails desde cualquier dirección `@idocstore.com`

Tu sitio web `www.idocstore.com` sigue funcionando normalmente en su hosting actual, y Vercel solo ejecuta el código de la aplicación.

