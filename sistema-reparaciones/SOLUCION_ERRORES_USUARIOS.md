# 🔧 Solución de Errores al Gestionar Usuarios

## Problemas Comunes y Soluciones

### ❌ Error 1: "Could not find the 'document_number' column of 'users' in the schema cache"

**Causa:** La tabla `users` no tiene las columnas `last_name`, `document_number`, y `local`.

**Solución:**

1. Ve a tu proyecto en Supabase Dashboard
2. Abre el **SQL Editor**
3. Ejecuta el script `database/fix_users_table_columns.sql`:

```sql
-- Agregar columnas nuevas a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS local TEXT;
```

4. Verifica que las columnas se agregaron:

```sql
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users' 
  AND column_name IN ('last_name', 'document_number', 'local');
```

5. **Reinicia tu servidor de desarrollo** para que el schema cache se actualice:
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   npm run dev
   ```

---

### ❌ Error 2: "Service role key no configurado" o "role key faltante"

**Causa:** No está configurada la variable de entorno `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

**⚠️ IMPORTANTE:** Si tu aplicación está en Vercel, esta variable **DEBE** estar configurada en las variables de entorno de Vercel, no solo en `.env.local`.

**Solución:**

#### Paso 1: Obtener el Service Role Key

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** (⚙️) → **API**
3. En la sección **"Project API keys"**, busca **"service_role"** (⚠️ es secreta)
4. Haz clic en el ícono de **copiar** para copiar la clave completa

#### Paso 2: Configurar en Desarrollo Local

1. Abre o crea el archivo `.env.local` en la raíz del proyecto:

```bash
cd /Users/idocstore/Documents/app
nano .env.local  # o usa tu editor preferido
```

2. Agrega la variable (reemplaza `tu_service_role_key_aqui` con la clave que copiaste):

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

3. **Reinicia el servidor de desarrollo**:

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

#### Paso 3: Configurar en Producción (Vercel) ⚠️ OBLIGATORIO

**IMPORTANTE:** Si tu aplicación está desplegada en Vercel, **DEBES** configurar esta variable en Vercel, no solo en `.env.local`.

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Navega a **Settings** → **Environment Variables**
3. Haz clic en **Add New** o **Add**
4. Agrega la variable:
   - **Name:** `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (pega tu service_role key completo - debe empezar con `eyJ...`)
   - **Environment:** Marca todas las opciones:
     - ✅ **Production** (obligatorio para producción)
     - ✅ **Preview** (recomendado para previews)
     - ✅ **Development** (opcional)
5. Haz clic en **Save**
6. **Redeploy** tu aplicación (OBLIGATORIO):
   - Ve a **Deployments**
   - Haz clic en los tres puntos (⋯) del último deployment
   - Selecciona **Redeploy**
   - O simplemente haz un nuevo push al repositorio

**⚠️ Nota:** Las variables de entorno solo se aplican después de un redeploy. Si agregas la variable pero no haces redeploy, seguirá sin funcionar.

---

## ✅ Verificación

Después de aplicar ambas soluciones, deberías poder:

- ✅ **Crear usuarios** sin errores
- ✅ **Editar usuarios** (incluyendo campos como document_number, last_name, local)
- ✅ **Eliminar usuarios** sin errores
- ✅ **Cambiar contraseñas** de usuarios

## 🔍 Verificación Rápida

### Verificar columnas en la tabla users:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;
```

Deberías ver:
- `id` (uuid)
- `role` (text)
- `name` (text)
- `email` (text)
- `avatar_url` (text)
- `created_at` (timestamp)
- `last_name` (text) ✅
- `document_number` (text) ✅
- `local` (text) ✅

### Verificar variable de entorno (en desarrollo):

En la consola del navegador (F12), ejecuta:

```javascript
console.log(import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? "✅ Configurado" : "❌ No configurado");
```

Si muestra "❌ No configurado", verifica que:
1. El archivo `.env.local` existe y tiene la variable
2. Has reiniciado el servidor de desarrollo
3. El nombre de la variable es exactamente `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

---

## 🆘 Si Aún Tienes Problemas

### Problema: Las columnas se agregaron pero sigue el error

**Solución:** El schema cache de Supabase puede estar desactualizado. Intenta:

1. Espera 1-2 minutos después de ejecutar el script SQL
2. Reinicia tu servidor de desarrollo
3. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Si persiste, verifica que las columnas realmente existen:

```sql
SELECT * FROM users LIMIT 1;
```

Si esta consulta funciona, las columnas existen. El problema es solo el cache.

### Problema: El service_role key no funciona

**Verifica:**

1. ¿Copiaste la clave completa? (debe empezar con `eyJ...` y ser muy larga)
2. ¿No hay espacios extra al inicio o final?
3. ¿Reiniciaste el servidor después de agregar la variable?
4. ¿El archivo `.env.local` está en la raíz del proyecto?

**Nota de Seguridad:** ⚠️ El service_role key tiene permisos completos. Nunca lo compartas públicamente ni lo subas a repositorios públicos.

---

## 📝 Resumen de Archivos Necesarios

1. **`database/fix_users_table_columns.sql`** - Script para agregar columnas faltantes
2. **`.env.local`** - Archivo con las variables de entorno (incluyendo `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`)

---

## 🔗 Referencias

- [Documentación de Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin)
- [Variables de Entorno en Vite](https://vitejs.dev/guide/env-and-mode.html)

