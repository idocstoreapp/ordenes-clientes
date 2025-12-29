# 🔑 Instrucciones para Agregar Service Role Key

## ✅ Problema Identificado

El archivo `.env.local` tiene la variable `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=` pero **está vacía** (sin valor después del `=`).

## 🚀 Solución Rápida

### Opción 1: Editar el archivo manualmente

1. **Abre el archivo `.env.local`**:
   ```bash
   nano .env.local
   # o usa VS Code: code .env.local
   ```

2. **Busca esta línea** (línea 5):
   ```
   PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
   ```

3. **Agrega el valor después del `=`**:
   ```
   PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Guarda el archivo** (Ctrl+O en nano, Cmd+S en VS Code)

5. **Reinicia el servidor**:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

### Opción 2: Usar el script (más fácil)

1. **Ejecuta el script**:
   ```bash
   ./agregar-service-role-key.sh
   ```

2. **Pega tu Service Role Key** cuando te lo pida

3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

## 📝 Obtener el Service Role Key

Si no tienes el Service Role Key:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. En la sección **"Project API keys"**, busca **"service_role"**
5. Haz clic en el ícono de **copiar** (📋) para copiar la clave completa

⚠️ **IMPORTANTE:**
- Debe ser la clave **"service_role"** (NO "anon public")
- La clave es muy larga (200+ caracteres)
- Debe empezar con `eyJ`

## ✅ Verificación

Después de agregar el valor y reiniciar:

1. **Abre la consola del navegador** (F12)
2. **Busca**: `[supabase-admin] Debug info:`
3. **Debe mostrar**: `hasServiceRoleKey: true`
4. **Ve al Panel del Administrador** → "🔍 Diagnóstico de Configuración"
5. **Debe mostrar**: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY: ✅ Configurado`

## 🔍 Verificar el Archivo

Para verificar que el valor se agregó correctamente:

```bash
# Ver todas las variables SUPABASE
grep PUBLIC_SUPABASE .env.local

# Debe mostrar:
# PUBLIC_SUPABASE_URL=https://...
# PUBLIC_SUPABASE_ANON_KEY=eyJ...
# PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ... (con valor)
```

## 🆘 Si Aún No Funciona

### Verificar formato

El archivo debe verse así (sin espacios alrededor del `=`):

```
PUBLIC_SUPABASE_URL=https://pjelbnifjwvtwisrmumb.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

❌ **INCORRECTO:**
```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY = eyJ...  (espacios alrededor del =)
PUBLIC_SUPABASE_SERVICE_ROLE_KEY= eyJ...   (espacio después del =)
PUBLIC_SUPABASE_SERVICE_ROLE_KEY =eyJ...   (espacio antes del =)
```

### Verificar que reiniciaste el servidor

⚠️ **IMPORTANTE:** En Astro/Vite, las variables de entorno solo se cargan al iniciar el servidor. Si agregaste el valor mientras el servidor estaba corriendo, **DEBES reiniciarlo**.

## 📞 Si Necesitas Ayuda

Si después de seguir estos pasos aún no funciona:

1. Verifica que el valor se agregó correctamente al archivo
2. Verifica que reiniciaste el servidor
3. Verifica en la consola qué muestra `[supabase-admin] Debug info:`
4. Comparte el output del diagnóstico en el Panel del Administrador

