# Configuración de Resend para Envío de Emails

## ¿Qué es Resend?

Resend es un servicio de envío de emails transaccionales que permite enviar emails desde tu aplicación de manera confiable.

## Pasos para Configurar Resend

### 1. Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta (puedes usar tu email o GitHub)
3. Verifica tu email si es necesario

### 2. Obtener API Key

1. Una vez dentro de tu dashboard de Resend
2. Ve a **API Keys** en el menú lateral
3. Haz clic en **"Create API Key"**
4. Dale un nombre (ej: "Sistema de Gestión de Órdenes")
5. Selecciona los permisos necesarios (al menos `Sending access`)
6. Haz clic en **"Add"**
7. **IMPORTANTE**: Copia la API Key que se muestra (solo se muestra una vez, guárdala de forma segura)

### 3. Configurar Dominio (Recomendado)

**IMPORTANTE**: Puedes usar tu dominio con Resend **SIN tener que moverlo a Vercel** o cambiar tu hosting actual. Resend solo necesita que agregues algunos registros DNS en tu proveedor de dominio.

#### Pasos para configurar tu dominio:

1. Ve a **Domains** en el dashboard de Resend
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `idocstore.com`)
4. Resend te mostrará los registros DNS que necesitas agregar:
   - **SPF Record** (TXT)
   - **DKIM Records** (CNAME o TXT)
   - **DMARC Record** (TXT) - Opcional pero recomendado
5. Ve a tu proveedor DNS (donde tienes configurado tu dominio, ej: Cloudflare, Namecheap, GoDaddy, etc.)
6. Agrega los registros DNS que Resend te proporcionó
7. Espera unos minutos para que se propaguen los cambios DNS
8. Vuelve a Resend y haz clic en **"Verify"** para verificar que los registros están correctos
9. Una vez verificado, podrás enviar emails desde cualquier dirección de tu dominio (ej: `noreply@idocstore.com`, `ordenes@idocstore.com`, etc.)

#### ¿Qué significa esto?

- **Tu sitio web puede seguir en su hosting actual** (no necesitas moverlo a Vercel)
- **Vercel solo se encarga de ejecutar el código** que envía los emails
- **Resend usa tu dominio** para enviar los emails, pero no necesita controlar tu dominio completo
- Solo necesitas agregar registros DNS (que no afectan tu sitio web actual)

#### Ejemplo de registros DNS que Resend te pedirá:

```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:resend.com ~all

Tipo: CNAME
Nombre: resend._domainkey
Valor: resend._domainkey.resend.com

Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none;
```

**Nota**: Si no configuras un dominio, puedes usar el dominio de prueba de Resend (`onboarding@resend.dev`), pero esto está limitado y es solo para desarrollo.

### 4. Configurar Variable de Entorno

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega la siguiente línea:

```env
RESEND_API_KEY=tu_api_key_aqui
```

Reemplaza `tu_api_key_aqui` con la API Key que copiaste en el paso 2.

**Ejemplo:**
```env
RESEND_API_KEY=re_abc123xyz789
```

### 5. Configurar en Producción

Si estás usando Vercel u otro servicio de hosting:

1. Ve a la configuración de variables de entorno de tu proyecto
2. Agrega una variable llamada `RESEND_API_KEY`
3. Pega el valor de tu API Key
4. Guarda los cambios
5. Redeploy tu aplicación

## Configuración del Email de Origen

En el archivo `src/pages/api/send-order-email.ts`, el sistema usa:

- **Email de origen**: Si la sucursal tiene un email configurado, se usa ese. Si no, se usa `noreply@idocstore.com`
- **Nombre de origen**: Si hay una sucursal, se usa `{Nombre Sucursal} - iDocStore`, si no, solo `iDocStore`

### Para usar tu propio dominio:

1. **Configura el dominio en Resend** (paso 3 arriba) - esto NO requiere mover tu dominio
2. El código ya está configurado para usar el email de la sucursal si está disponible
3. Si quieres cambiar el email por defecto, modifica `src/pages/api/send-order-email.ts`:

```typescript
const fromEmail = branchEmail || "noreply@tudominio.com";
```

Reemplaza `tudominio.com` con tu dominio real (ej: `idocstore.com`).

## Prueba

Una vez configurado:

1. Crea una orden nueva desde el sistema
2. El sistema automáticamente enviará un email al cliente con el PDF adjunto
3. Revisa el dashboard de Resend para ver el estado de los emails enviados

## Límites de Resend

- **Plan Gratuito**: 100 emails/día, 3,000 emails/mes
- **Plan Pro**: $20/mes - 50,000 emails/mes
- **Plan Enterprise**: Contactar ventas

Para más información: [https://resend.com/pricing](https://resend.com/pricing)

## Solución de Problemas

### Error: "RESEND_API_KEY no configurada"
- Verifica que agregaste la variable `RESEND_API_KEY` en `.env.local`
- Reinicia el servidor de desarrollo después de agregar la variable

### Error: "Domain not verified"
- Si estás usando un dominio personalizado, asegúrate de haber verificado el dominio en Resend
- O usa el dominio de prueba de Resend temporalmente

### Emails no se envían
- Revisa la consola del navegador para ver errores
- Revisa el dashboard de Resend para ver logs de envío
- Verifica que el email del cliente sea válido

