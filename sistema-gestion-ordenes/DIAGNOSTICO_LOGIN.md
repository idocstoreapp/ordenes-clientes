# 🔍 Diagnóstico de Problemas de Login

## Problema: Usuario existe pero no puede iniciar sesión

### Paso 1: Verificar Variables de Entorno

1. **Verifica que el archivo `.env.local` existe** en la raíz del proyecto:
   ```
   sistema-gestion-ordenes/
   └── .env.local
   ```

2. **Verifica que contiene estas variables:**
   ```env
   PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Reinicia el servidor de desarrollo** después de crear/modificar `.env.local`:
   ```powershell
   # Detén el servidor (Ctrl+C)
   # Luego inícialo de nuevo
   npm run dev
   ```

### Paso 2: Verificar que el Usuario Existe en Supabase

#### A. Verificar en Authentication

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Users**
4. Busca el email del usuario
5. Verifica que:
   - ✅ El usuario existe
   - ✅ El email está confirmado (debe tener un check verde)
   - ✅ El usuario está activo (no está baneado)

#### B. Verificar en la Tabla `users`

1. Ve a **SQL Editor** en Supabase
2. Ejecuta esta consulta (reemplaza con el email del usuario):
   ```sql
   SELECT * FROM users WHERE email = 'email-del-usuario@ejemplo.com';
   ```
3. Verifica que:
   - ✅ El usuario existe en la tabla
   - ✅ El `id` coincide con el `id` en `auth.users`
   - ✅ El `role` está configurado correctamente

### Paso 3: Verificar Coincidencia de IDs

**IMPORTANTE**: El `id` en la tabla `users` DEBE ser exactamente el mismo que el `id` en `auth.users`.

1. En **Authentication** → **Users**, copia el **User UID**
2. En **SQL Editor**, ejecuta:
   ```sql
   SELECT * FROM users WHERE id = 'uid-copiado-aqui';
   ```
3. Si no hay resultados, el usuario no está en la tabla `users` → **Solución en Paso 4**

### Paso 4: Crear/Corregir Usuario en la Tabla `users`

Si el usuario existe en `auth.users` pero NO en la tabla `users`:

1. Ve a **SQL Editor**
2. Ejecuta este SQL (reemplaza con los datos reales):
   ```sql
   INSERT INTO users (id, role, name, email)
   VALUES (
     'uid-del-usuario-en-auth-users',  -- El User UID de Authentication
     'admin',  -- o 'technician', 'encargado', 'recepcionista'
     'Nombre del Usuario',
     'email-del-usuario@ejemplo.com'
   );
   ```

### Paso 5: Verificar Errores en la Consola del Navegador

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Intenta iniciar sesión
4. Busca errores en rojo
5. Errores comunes:
   - `Missing Supabase environment variables` → Variables de entorno no configuradas
   - `Invalid login credentials` → Email o contraseña incorrectos
   - `Email not confirmed` → El email no está confirmado en Supabase

### Paso 6: Verificar Configuración de Supabase

1. Ve a **Settings** → **API** en Supabase
2. Verifica que:
   - ✅ **Project URL** está correcto
   - ✅ **anon public** key está correcto
3. Copia estos valores y compáralos con tu `.env.local`

### Paso 7: Probar Login Directamente en Supabase

1. Ve a **Authentication** → **Users**
2. Haz clic en el usuario
3. Haz clic en **"Send password reset email"** o **"Reset password"**
4. Esto verifica que el usuario puede recibir emails y que la autenticación funciona

## Soluciones Comunes

### Error: "Invalid login credentials"

**Causas posibles:**
- Email o contraseña incorrectos
- El usuario no existe en `auth.users`
- El email no está confirmado

**Solución:**
1. Verifica el email y contraseña
2. Si el email no está confirmado, confírmalo desde Supabase Dashboard
3. Si olvidaste la contraseña, usa "Reset password" en Supabase

### Error: "Missing Supabase environment variables"

**Causa:** Las variables de entorno no están configuradas o el servidor no se reinició.

**Solución:**
1. Crea/verifica `.env.local` con las variables correctas
2. Reinicia el servidor de desarrollo (`npm run dev`)

### Error: Usuario existe pero no puede iniciar sesión

**Causa:** El usuario existe en `auth.users` pero NO en la tabla `users`.

**Solución:**
1. Ejecuta el SQL del Paso 4 para crear el usuario en la tabla `users`
2. Asegúrate de que el `id` coincida exactamente

### Error: "Email not confirmed"

**Causa:** El email del usuario no está confirmado en Supabase.

**Solución:**
1. Ve a **Authentication** → **Users**
2. Haz clic en el usuario
3. Haz clic en **"Confirm email"** o marca **"Auto Confirm User"** al crear

## Verificación Final

Después de seguir estos pasos, verifica:

1. ✅ `.env.local` existe y tiene las variables correctas
2. ✅ El servidor se reinició después de crear `.env.local`
3. ✅ El usuario existe en `auth.users` con email confirmado
4. ✅ El usuario existe en la tabla `users` con el mismo `id`
5. ✅ No hay errores en la consola del navegador
6. ✅ Las credenciales de Supabase son correctas

Si después de todo esto aún no funciona, comparte:
- El error exacto que aparece en la consola
- Si el usuario existe en `auth.users`
- Si el usuario existe en la tabla `users`
- Las primeras letras de tu `PUBLIC_SUPABASE_URL` (para verificar formato)



