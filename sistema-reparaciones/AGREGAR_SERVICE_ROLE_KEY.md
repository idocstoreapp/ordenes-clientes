# 🔑 Agregar Service Role Key a .env.local

## ✅ Problema Identificado

El archivo `.env.local` **NO tiene** la variable `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

Actualmente solo tiene:
- ✅ `PUBLIC_SUPABASE_URL`
- ✅ `PUBLIC_SUPABASE_ANON_KEY`
- ❌ `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (FALTA)

## 🚀 Solución: Agregar la Variable

### Paso 1: Obtener el Service Role Key

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. En la sección **"Project API keys"**, busca **"service_role"**
5. Haz clic en el ícono de **copiar** (📋) para copiar la clave completa

⚠️ **IMPORTANTE:** 
- Debe ser la clave **"service_role"** (NO "anon public")
- La clave es muy larga (200+ caracteres)
- Debe empezar con `eyJ`

### Paso 2: Agregar al archivo .env.local

1. Abre el archivo `.env.local` en la raíz del proyecto:
   ```bash
   nano .env.local
   # o usa tu editor preferido (VS Code, etc.)
   ```

2. Agrega esta línea al final del archivo (reemplaza `tu_service_role_key_aqui` con la clave que copiaste):
   ```
   PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

3. **IMPORTANTE:** 
   - ❌ NO dejes espacios alrededor del `=`
   - ❌ NO agregues comillas
   - ✅ Debe ser exactamente: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...`

**Ejemplo correcto:**
```
PUBLIC_SUPABASE_URL=https://pjelbnifjwvtwisrmumb.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZWxibmlmand2dHdpc3JtdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MDY1MSwiZXhwIjoyMDc4NDQ2NjUxfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 3: Guardar y Reiniciar

1. **Guarda el archivo** (Ctrl+O en nano, o Cmd+S en VS Code)

2. **Reinicia el servidor de desarrollo COMPLETAMENTE:**
   ```bash
   # 1. Detén el servidor (Ctrl+C o Cmd+C)
   # 2. Espera 2-3 segundos
   # 3. Inicia de nuevo
   npm run dev
   ```

3. **Verifica en el navegador:**
   - Abre la consola (F12)
   - Busca: `[supabase-admin] Debug info:`
   - Debe mostrar: `hasServiceRoleKey: true`

4. **Verifica en el Panel del Administrador:**
   - Ve a "🔍 Diagnóstico de Configuración"
   - Debe mostrar: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY: ✅ Configurado`

## ✅ Verificación Final

Después de agregar la variable y reiniciar:

1. ✅ El archivo `.env.local` tiene 3 líneas (URL, ANON_KEY, SERVICE_ROLE_KEY)
2. ✅ La consola muestra `hasServiceRoleKey: true`
3. ✅ El diagnóstico muestra todo en verde
4. ✅ Puedes crear/editar/eliminar usuarios

## 🆘 Si Aún No Funciona

### Verificar el formato del archivo

```bash
# Ver todas las variables SUPABASE
grep PUBLIC_SUPABASE .env.local

# Debe mostrar 3 líneas:
# PUBLIC_SUPABASE_URL=...
# PUBLIC_SUPABASE_ANON_KEY=...
# PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
```

### Verificar que no hay espacios

```bash
# Verificar si hay espacios alrededor del =
cat .env.local | grep SERVICE_ROLE
```

Si ves algo como `PUBLIC_SUPABASE_SERVICE_ROLE_KEY = ...` (con espacios), elimínalos.

### Verificar la longitud de la clave

La clave debe tener 200+ caracteres. Si es muy corta, probablemente no copiaste la clave completa.

## 📝 Nota para Vercel

Si tu aplicación está en Vercel, también necesitas:

1. Agregar la variable en **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Marcar para **Production**, **Preview** y **Development**
3. **Hacer redeploy** (obligatorio)

Pero primero, resuelve el problema en desarrollo local siguiendo los pasos anteriores.

