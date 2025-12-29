# 🔐 Variables de Entorno para Vercel

Esta es la lista completa de variables de entorno que necesitas configurar en Vercel para el deploy del proyecto.

## 📋 Variables Obligatorias

Estas variables **DEBEN** estar configuradas para que la aplicación funcione:

### 1. `PUBLIC_SUPABASE_URL`
- **Descripción**: URL de tu proyecto de Supabase
- **Dónde obtenerla**: Supabase Dashboard → Settings → API → Project URL
- **Formato**: `https://xxxxxxxxxxxxx.supabase.co`
- **Ejemplo**: `https://abcdefghijklmnop.supabase.co`

### 2. `PUBLIC_SUPABASE_ANON_KEY`
- **Descripción**: Clave pública anónima de Supabase (segura para frontend)
- **Dónde obtenerla**: Supabase Dashboard → Settings → API → anon public key
- **Formato**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔧 Variables Opcionales

Estas variables son opcionales pero habilitan funcionalidades adicionales:

### 3. `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` ⚠️ REQUERIDA PARA GESTIÓN DE USUARIOS
- **Descripción**: Clave de servicio de Supabase (para crear, editar y eliminar usuarios desde el dashboard admin)
- **Dónde obtenerla**: Supabase Dashboard → Settings → API → service_role key
- **⚠️ IMPORTANTE**: 
  - Esta clave tiene permisos completos. Solo úsala si necesitas la funcionalidad de gestionar usuarios desde el dashboard.
  - **DEBE estar configurada en Vercel** si tu aplicación está desplegada allí.
  - Sin esta variable, los administradores NO podrán crear, editar o eliminar usuarios.
- **Formato**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Nota**: En producción, considera usar Edge Functions en lugar de exponer esta clave en el frontend, pero para la mayoría de casos, configurarla en Vercel es suficiente.

### 4. `PUBLIC_BSALE_ACCESS_TOKEN` (Token único - Opcional)
- **Descripción**: Token de acceso único para la API de Bsale (validación de boletas)
- **Dónde obtenerla**: 
  - **Sandbox**: Crea una cuenta en https://www.bsale.cl
  - **Producción**: Envía correo a [email protected] desde cuenta de administrador
- **Formato**: String alfanumérico
- **Ejemplo**: `e4f3c1cfb632f5b8f3521489863d4a9ccd6a7cd5`
- **Nota**: Usa esta opción si solo necesitas validar con una empresa. Para múltiples empresas, usa `PUBLIC_BSALE_ACCESS_TOKENS` en su lugar.

### 4b. `PUBLIC_BSALE_ACCESS_TOKENS` (Múltiples tokens - Recomendado)
- **Descripción**: Múltiples tokens de acceso para la API de Bsale, separados por coma. Permite validar facturas de varias empresas.
- **Formato**: String con tokens separados por coma (sin espacios o con espacios que se eliminarán automáticamente)
- **Ejemplo**: `token1,token2,token3`
- **Ejemplo real**: `b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79`
- **Nota**: Si se configura esta variable, el sistema intentará validar con todos los tokens hasta encontrar la factura. Si no se encuentra en ninguno, bloqueará el guardado.
- **Ver**: `CONFIGURACION_BSALE_TOKENS.md` para más detalles sobre la configuración de múltiples empresas.

### 5. `PUBLIC_BSALE_API_URL`
- **Descripción**: URL base de la API de Bsale (opcional, tiene valor por defecto)
- **Valor por defecto**: `https://api.bsale.cl`
- **Opciones**:
  - Chile: `https://api.bsale.cl`
  - Perú: `https://api.bsale.pe` (verificar)
  - México: `https://api.bsale.mx` (verificar)
- **Nota**: Solo configúrala si necesitas usar una URL diferente a la por defecto.

---

## 🚀 Cómo Configurar en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **Settings** → **Environment Variables**
3. Agrega cada variable:
   - **Name**: El nombre de la variable (ej: `PUBLIC_SUPABASE_URL`)
   - **Value**: El valor de la variable
   - **Environment**: Selecciona:
     - ✅ **Production** (para producción)
     - ✅ **Preview** (para previews)
     - ✅ **Development** (opcional, para desarrollo local)
4. Click en **Save**
5. Repite para cada variable

### Opción 2: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login en Vercel
vercel login

# Agregar variables de entorno
vercel env add PUBLIC_SUPABASE_URL production
vercel env add PUBLIC_SUPABASE_ANON_KEY production
vercel env add PUBLIC_SUPABASE_SERVICE_ROLE_KEY production
vercel env add PUBLIC_BSALE_ACCESS_TOKENS production
# O si solo usas un token:
# vercel env add PUBLIC_BSALE_ACCESS_TOKEN production
vercel env add PUBLIC_BSALE_API_URL production
```

---

## ✅ Checklist de Configuración

Antes de hacer deploy, verifica que tengas:

- [ ] `PUBLIC_SUPABASE_URL` configurada (OBLIGATORIA)
- [ ] `PUBLIC_SUPABASE_ANON_KEY` configurada (OBLIGATORIA)
- [ ] `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` configurada (OBLIGATORIA si necesitas gestionar usuarios - crear, editar, eliminar)
- [ ] `PUBLIC_BSALE_ACCESS_TOKENS` configurada (opcional - para validar boletas de múltiples empresas)
  - O `PUBLIC_BSALE_ACCESS_TOKEN` si solo necesitas una empresa
- [ ] `PUBLIC_BSALE_API_URL` configurada (opcional - solo si es diferente a la por defecto)

**⚠️ Recordatorio:** Si agregas o modificas variables de entorno en Vercel, **debes hacer redeploy** para que los cambios surtan efecto.

---

## 🔄 Después de Agregar Variables

1. **Redeploy el proyecto**:
   - Ve a Vercel Dashboard → Deployments
   - Click en los tres puntos (⋯) del último deployment
   - Selecciona **Redeploy**
   - O simplemente haz un nuevo push al repositorio

2. **Verificar que funcionan**:
   - Abre tu aplicación en producción
   - Verifica que puedas iniciar sesión
   - Si configuraste Bsale, prueba crear una orden con número de boleta

---

## 🛡️ Seguridad

### ✅ Variables Seguras para Frontend (PUBLIC_*)
- `PUBLIC_SUPABASE_URL` - Es pública, no contiene información sensible
- `PUBLIC_SUPABASE_ANON_KEY` - Es pública, tiene restricciones de RLS
- `PUBLIC_BSALE_ACCESS_TOKEN` / `PUBLIC_BSALE_ACCESS_TOKENS` - Es pública pero limita el acceso a tu cuenta de Bsale
- `PUBLIC_BSALE_API_URL` - Es pública

### ⚠️ Variable Sensible
- `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` - Tiene permisos completos. Considera usar Edge Functions en producción.

---

## 📝 Ejemplo de Configuración Completa

```
PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
PUBLIC_BSALE_ACCESS_TOKENS=b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79
PUBLIC_BSALE_API_URL=https://api.bsale.cl
```

---

## 🆘 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` estén configuradas
- Asegúrate de haber hecho redeploy después de agregar las variables

### Error: "Service role key no configurado"
- Si necesitas crear usuarios, agrega `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- O simplemente ignora este error si no necesitas esa funcionalidad

### Error: "Token de Bsale no configurado" o "Tokens de Bsale no configurados"
- Si no necesitas validar boletas, puedes ignorar este error
- Si lo necesitas, agrega `PUBLIC_BSALE_ACCESS_TOKENS` (múltiples empresas) o `PUBLIC_BSALE_ACCESS_TOKEN` (una empresa)
- Ver `CONFIGURACION_BSALE_TOKENS.md` para más detalles sobre la configuración de múltiples tokens

---

## 📚 Referencias

- [Documentación de Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Bsale API](https://docs.bsale.dev)

