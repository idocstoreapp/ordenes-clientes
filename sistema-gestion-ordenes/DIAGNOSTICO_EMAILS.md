# Diagnóstico de Problemas con Envío de Emails

## Problemas Comunes y Soluciones

### 1. El email "from" no coincide con el dominio verificado en Resend

**Síntoma**: Los emails no se envían y Resend devuelve un error sobre el dominio.

**Causa**: El email de origen (`fromEmail`) debe ser del dominio que está verificado en Resend.

**Solución**:
1. Verifica qué dominio tienes verificado en Resend:
   - Ve a tu dashboard de Resend
   - Ve a "Domains"
   - Revisa qué dominio está verificado (ej: `idocstore.com`)

2. Asegúrate de que el email de origen use ese dominio:
   - Si tu dominio es `idocstore.com`, el email debe ser `noreply@idocstore.com` o `ordenes@idocstore.com`
   - NO uses `noreply@idocstore.com` si tu dominio verificado es otro (ej: `mydomain.com`)

3. Si usas el email de la sucursal (`branchEmail`), asegúrate de que también sea del dominio verificado.

**Código actual**:
```typescript
const fromEmail = branchEmail || "noreply@idocstore.com";
```

**Si tu dominio es diferente**, modifica `src/pages/api/send-order-email.ts`:
```typescript
const fromEmail = branchEmail || "noreply@TU_DOMINIO.com";
```

### 2. La API Key no está configurada correctamente en Vercel

**Síntoma**: Error "RESEND_API_KEY no configurada"

**Solución**:
1. Ve a tu proyecto en Vercel
2. Ve a Settings → Environment Variables
3. Verifica que existe `RESEND_API_KEY` con el valor correcto
4. Asegúrate de que esté marcada para **Production**, **Preview**, y **Development**
5. Haz un nuevo deploy después de agregar/modificar la variable

### 3. El email del cliente es inválido

**Síntoma**: Error "Email del destinatario inválido"

**Solución**:
- Verifica que el email del cliente en la base de datos sea válido
- El formato debe ser: `usuario@dominio.com`
- No debe tener espacios ni caracteres especiales inválidos

### 4. El dominio no está completamente verificado en Resend

**Síntoma**: Los emails se envían pero no llegan (o llegan a spam)

**Solución**:
1. Ve a Resend → Domains
2. Verifica que todos los registros DNS estén correctos:
   - SPF Record (TXT)
   - DKIM Records (CNAME o TXT)
   - DMARC Record (TXT) - Opcional pero recomendado
3. Espera 24-48 horas después de agregar los registros DNS para que se propaguen
4. Haz clic en "Verify" en Resend para verificar que todo esté correcto

### 5. Límites de Resend alcanzados

**Síntoma**: Error sobre límites de envío

**Solución**:
- Verifica en Resend → Dashboard si has alcanzado el límite de emails
- El plan gratuito tiene límites (100 emails/día)
- Considera actualizar tu plan si necesitas más

## Cómo Diagnosticar el Problema

### Paso 1: Revisar los Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a "Deployments"
3. Haz clic en el último deployment
4. Ve a "Functions" → busca `/api/send-order-email`
5. Revisa los logs cuando se intenta enviar un email

### Paso 2: Revisar la Consola del Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Intenta crear una orden o cambiar el estado
4. Busca mensajes de error relacionados con el email

### Paso 3: Verificar en Resend Dashboard

1. Ve a Resend → Emails
2. Revisa si hay intentos de envío
3. Si hay errores, verás el mensaje de error específico
4. Revisa el estado del email (enviado, fallido, etc.)

### Paso 4: Probar con un Email de Prueba

Puedes probar directamente desde Resend:
1. Ve a Resend → Emails → "Send Test Email"
2. Usa el mismo email "from" que usa tu aplicación
3. Envía a tu propio email
4. Si funciona, el problema puede estar en el código
5. Si no funciona, el problema está en la configuración de Resend

## Mejoras Implementadas

Se han agregado las siguientes mejoras para facilitar el diagnóstico:

1. **Validación del email del destinatario**: Ahora se valida que el email sea válido antes de intentar enviarlo
2. **Logging mejorado**: Se registran más detalles sobre el envío (sin exponer información sensible)
3. **Mensajes de error más descriptivos**: Los errores ahora incluyen más información sobre qué falló
4. **Alertas al usuario**: Si el email falla, el usuario verá un mensaje con los detalles del error

## Verificación Rápida

✅ **Checklist de Verificación**:

- [ ] El dominio está verificado en Resend
- [ ] El email "from" usa el dominio verificado
- [ ] `RESEND_API_KEY` está configurada en Vercel
- [ ] La variable de entorno está marcada para Production
- [ ] Se hizo un nuevo deploy después de agregar la variable
- [ ] Los registros DNS están correctos y verificados
- [ ] El email del cliente es válido
- [ ] No se han alcanzado los límites de Resend

## Contacto

Si después de revisar todo esto el problema persiste:
1. Revisa los logs en Vercel
2. Revisa los logs en Resend Dashboard
3. Comparte los mensajes de error específicos para diagnosticar mejor










