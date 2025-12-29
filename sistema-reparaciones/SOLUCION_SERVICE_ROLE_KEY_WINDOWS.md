# 🔑 Solución Rápida: Agregar Service Role Key en Windows

## ⚠️ Problema

No puedes crear usuarios de tipo "encargado" porque falta la variable `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` en tu archivo `.env.local`.

## 🚀 Solución en 3 Pasos

### Paso 1: Obtener el Service Role Key de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. En la sección **"Project API keys"**, busca **"service_role"** (⚠️ es la clave secreta)
5. Haz clic en el ícono de **copiar** (📋) para copiar la clave completa

⚠️ **IMPORTANTE:**
- Debe ser la clave **"service_role"** (NO "anon public")
- La clave es muy larga (200+ caracteres)
- Debe empezar con `eyJ`

### Paso 2: Agregar al archivo .env.local

**Opción A: Desde PowerShell (Recomendado)**

1. Abre PowerShell en la raíz del proyecto
2. Ejecuta este comando (reemplaza `TU_SERVICE_ROLE_KEY_AQUI` con la clave que copiaste):

```powershell
Add-Content -Path .env.local -Value "`nPUBLIC_SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI"
```

**Opción B: Editar manualmente**

1. Abre el archivo `.env.local` con un editor de texto (Notepad, VS Code, etc.)
2. Agrega esta línea al final del archivo (reemplaza `TU_SERVICE_ROLE_KEY_AQUI` con la clave que copiaste):

```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI
```

3. **IMPORTANTE:**
   - ❌ NO dejes espacios alrededor del `=`
   - ❌ NO agregues comillas
   - ✅ Debe ser exactamente: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...`

**Ejemplo de cómo debe verse el archivo completo:**

```
PUBLIC_BSALE_ACCESS_TOKENS=b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZWxibmlmand2dHdpc3JtdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg3MDY1MSwiZXhwIjoyMDc4NDQ2NjUxfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 3: Reiniciar el servidor

1. Si el servidor está corriendo, deténlo presionando **Ctrl+C** en la terminal
2. Espera 2-3 segundos
3. Inicia de nuevo:

```powershell
npm run dev
```

## ✅ Verificación

Después de reiniciar el servidor:

1. Abre tu aplicación en el navegador
2. Inicia sesión como administrador
3. Ve a **Gestión de Usuarios**
4. Intenta crear un usuario con rol "encargado"
5. Si funciona, ¡todo está correcto! ✅

## 🔍 Si Aún No Funciona

### Verificar que la variable se agregó correctamente:

```powershell
Get-Content .env.local | Select-String "SERVICE_ROLE"
```

Debe mostrar algo como:
```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Verificar en la consola del navegador:

1. Abre tu aplicación
2. Presiona **F12** para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Busca mensajes que empiecen con `[supabase-admin]`
5. Debe mostrar: `hasServiceRoleKey: true`

### Errores Comunes:

- **"Service role key no configurado"**: 
  - Verifica que agregaste la variable en `.env.local`
  - Verifica que reiniciaste el servidor completamente

- **"Invalid API key"**:
  - Verifica que copiaste la clave completa (es muy larga)
  - Verifica que no hay espacios alrededor del `=`
  - Verifica que no agregaste comillas

- **La clave no se reconoce**:
  - Verifica que la clave empieza con `eyJ`
  - Verifica que tiene al menos 200 caracteres
  - Verifica que es la clave "service_role" (NO "anon public")

## 📝 Notas Importantes

1. **Formato del archivo `.env.local`**:
   - ❌ NO dejes espacios: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY = eyJ...`
   - ✅ Correcto: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...`
   - ❌ NO uses comillas: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY="eyJ..."`
   - ✅ Correcto: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...`

2. **Reiniciar el servidor**:
   - Las variables de entorno solo se cargan al iniciar el servidor
   - Si agregas o modificas `.env.local`, DEBES reiniciar

3. **Seguridad**:
   - ❌ NUNCA subas `.env.local` a Git (ya está en `.gitignore`)
   - ❌ NUNCA compartas tu `SERVICE_ROLE_KEY` públicamente
   - ⚠️ Esta clave tiene permisos completos en tu base de datos

## 🆘 ¿Necesitas Ayuda?

Si después de seguir estos pasos aún no funciona:

1. Verifica la consola del navegador (F12) para ver errores específicos
2. Verifica que el servidor se reinició después de agregar la variable
3. Verifica que las claves de Supabase son correctas (cópialas de nuevo)
4. Revisa `CONFIGURACION_WINDOWS.md` para más detalles







