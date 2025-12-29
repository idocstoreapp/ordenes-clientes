# 👤 Guía Rápida: Crear Usuarios para Desarrollo

## ⚠️ Problema

No puedes iniciar sesión porque **no hay usuarios creados** en Supabase. Necesitas crear al menos un usuario administrador para poder acceder al sistema.

## 🚀 Solución: Crear Usuario Administrador

### Opción 1: Crear desde Supabase Dashboard (Más Fácil)

1. **Ve a tu proyecto en Supabase:**
   - Abre https://app.supabase.com
   - Selecciona tu proyecto: `pjelbnifjwvtwisrmumb`

2. **Crear usuario en Authentication:**
   - Ve a **Authentication** → **Users** (en el menú lateral)
   - Haz clic en **"Add user"** → **"Create new user"**
   - Completa:
     - **Email**: `admin@test.com` (o el que prefieras)
     - **Password**: `admin123` (o la que prefieras, mínimo 6 caracteres)
     - **Auto Confirm User**: ✅ **Márcalo** (importante)
   - Haz clic en **"Create user"**
   - **Copia el User UID** que aparece (lo necesitarás en el siguiente paso)

3. **Insertar usuario en la tabla `users`:**
   - Ve a **SQL Editor** en Supabase
   - Haz clic en **"New query"**
   - Ejecuta este SQL (reemplaza `TU_USER_UID_AQUI` con el UID que copiaste):

```sql
-- Crear usuario administrador
INSERT INTO users (id, role, name, email, local)
VALUES (
  'TU_USER_UID_AQUI',  -- Reemplaza con el UID real del paso anterior
  'admin',
  'Administrador',
  'admin@test.com',  -- El mismo email que usaste arriba
  'Sucursal Principal'  -- Puedes cambiar esto
);
```

4. **Verificar que se creó:**
   - Ve a **Table Editor** → **users**
   - Deberías ver tu usuario con rol `admin`

5. **Iniciar sesión:**
   - Abre http://localhost:4321 (o el puerto que use tu servidor)
   - Email: `admin@test.com`
   - Password: `admin123` (o la que configuraste)

### Opción 2: Crear Usuario Técnico (Opcional)

Si también quieres crear un técnico para probar:

1. **Crear en Authentication** (igual que arriba):
   - Email: `tecnico@test.com`
   - Password: `tecnico123`
   - Auto Confirm: ✅

2. **Insertar en la tabla `users`:**

```sql
-- Primero necesitas obtener el ID de una sucursal
SELECT id, name FROM branches LIMIT 1;

-- Luego insertar el técnico (reemplaza TU_USER_UID y SUCURSAL_ID)
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'TU_USER_UID_TECNICO',  -- UID del usuario en Authentication
  'technician',
  'Técnico de Prueba',
  'tecnico@test.com',
  'Sucursal Principal',
  'SUCURSAL_ID_AQUI'  -- ID de una sucursal (de la consulta anterior)
);
```

### Opción 3: Crear Usuario Encargado (Opcional)

Si quieres probar el nuevo rol de encargado:

1. **Crear en Authentication:**
   - Email: `encargado@test.com`
   - Password: `encargado123`
   - Auto Confirm: ✅

2. **Insertar en la tabla `users`:**

```sql
-- Obtener ID de una sucursal
SELECT id, name FROM branches LIMIT 1;

-- Insertar encargado
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'TU_USER_UID_ENCARGADO',  -- UID del usuario en Authentication
  'encargado',
  'Encargado de Prueba',
  'encargado@test.com',
  'Sucursal Principal',
  'SUCURSAL_ID_AQUI'  -- ID de una sucursal
);
```

## ✅ Verificación Rápida

Después de crear el usuario, verifica:

1. **En Authentication → Users:**
   - ✅ Deberías ver el usuario creado
   - ✅ El email debe estar confirmado (verde)

2. **En Table Editor → users:**
   - ✅ Deberías ver el registro con el mismo ID
   - ✅ El campo `role` debe ser `admin`, `technician` o `encargado`

3. **En la aplicación:**
   - ✅ Deberías poder iniciar sesión con el email y password

## 🔧 Si Aún No Funciona

### Error: "Invalid login credentials"
- Verifica que el email y password sean correctos
- Verifica que el usuario existe en Authentication
- Verifica que el usuario tiene `Auto Confirm User` marcado

### Error: "User not found" o redirige a login
- Verifica que insertaste el usuario en la tabla `users` con el mismo ID
- El ID debe ser **exactamente igual** al UID de Authentication
- Verifica que el campo `role` tiene un valor válido: `admin`, `technician` o `encargado`

### Error: "Missing Supabase environment variables"
- Verifica que el archivo se llama `.env.local` (no `.en.local`)
- Verifica que tiene `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
- Reinicia el servidor después de crear/editar `.env.local`

## 📝 Script SQL Completo (Todo en Uno)

Si prefieres ejecutar todo de una vez, aquí tienes un script que crea usuarios de ejemplo:

```sql
-- IMPORTANTE: Primero debes crear los usuarios en Authentication
-- Luego reemplaza los UIDs aquí con los reales

-- 1. Obtener IDs de sucursales
SELECT id, name FROM branches ORDER BY name LIMIT 7;

-- 2. Crear admin (reemplaza 'ADMIN_UID' con el UID real)
INSERT INTO users (id, role, name, email, local)
VALUES (
  'ADMIN_UID',  -- Reemplaza con UID real de Authentication
  'admin',
  'Administrador',
  'admin@test.com',
  'Sucursal Principal'
);

-- 3. Crear técnico (reemplaza 'TECNICO_UID' y 'SUCURSAL_ID')
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'TECNICO_UID',  -- Reemplaza con UID real
  'technician',
  'Técnico de Prueba',
  'tecnico@test.com',
  'Sucursal Principal',
  (SELECT id FROM branches ORDER BY name LIMIT 1)  -- Primera sucursal
);

-- 4. Crear encargado (reemplaza 'ENCARGADO_UID')
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'ENCARGADO_UID',  -- Reemplaza con UID real
  'encargado',
  'Encargado de Prueba',
  'encargado@test.com',
  'Sucursal Principal',
  (SELECT id FROM branches ORDER BY name LIMIT 1)  -- Primera sucursal
);
```

## 🎯 Credenciales de Prueba Sugeridas

Para desarrollo, puedes usar:

**Administrador:**
- Email: `admin@test.com`
- Password: `admin123`

**Técnico:**
- Email: `tecnico@test.com`
- Password: `tecnico123`

**Encargado:**
- Email: `encargado@test.com`
- Password: `encargado123`

⚠️ **IMPORTANTE**: Estas son solo para desarrollo. En producción usa contraseñas seguras.








