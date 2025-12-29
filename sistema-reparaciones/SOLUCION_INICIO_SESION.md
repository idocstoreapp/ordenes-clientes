# 🔐 Solución: No Puedo Iniciar Sesión en Desarrollo

## ⚠️ Problema

No puedes iniciar sesión porque **no hay usuarios creados** en Supabase Authentication.

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno

Tu archivo `.env.local` debe tener:
```
PUBLIC_SUPABASE_URL=https://pjelbnifjwvtwisrmumb.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Ya las tienes configuradas** - Perfecto.

### Paso 2: Crear Usuario en Supabase Authentication

1. **Abre Supabase Dashboard:**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto: `pjelbnifjwvtwisrmumb`

2. **Crear usuario administrador:**
   - Ve a **Authentication** → **Users** (menú lateral izquierdo)
   - Haz clic en **"Add user"** → **"Create new user"**
   - Completa:
     - **Email**: `admin@test.com`
     - **Password**: `admin123` (o la que prefieras, mínimo 6 caracteres)
     - **Auto Confirm User**: ✅ **Márcalo** (MUY IMPORTANTE)
   - Haz clic en **"Create user"**
   - **Copia el User UID** que aparece (algo como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Paso 3: Insertar Usuario en la Tabla `users`

1. **Ve a SQL Editor** en Supabase
2. **Haz clic en "New query"**
3. **Copia y pega este SQL** (reemplaza `TU_USER_UID_AQUI` con el UID que copiaste):

```sql
INSERT INTO users (id, role, name, email, local)
VALUES (
  'TU_USER_UID_AQUI',  -- ⚠️ REEMPLAZA con el UID real que copiaste
  'admin',
  'Administrador',
  'admin@test.com',
  'Sucursal Principal'
);
```

4. **Haz clic en "Run"** (o presiona F5)

### Paso 4: Verificar

1. **En Table Editor → users:**
   - Deberías ver tu usuario con `role = 'admin'`

2. **En la aplicación:**
   - Abre http://localhost:4321
   - Email: `admin@test.com`
   - Password: `admin123`
   - Deberías poder iniciar sesión ✅

## 🚀 Script Rápido (Todo en Uno)

Si prefieres usar el script completo, ejecuta `database/crear_usuarios_desarrollo.sql` en Supabase SQL Editor, pero **recuerda reemplazar los UIDs** con los reales de Authentication.

## 📝 Credenciales de Prueba

**Administrador:**
- Email: `admin@test.com`
- Password: `admin123`

**Técnico (opcional):**
- Email: `tecnico@test.com`
- Password: `tecnico123`

**Encargado (opcional):**
- Email: `encargado@test.com`
- Password: `encargado123`

## ⚠️ Errores Comunes

### "Invalid login credentials"
- ✅ Verifica que el email y password sean correctos
- ✅ Verifica que marcaste "Auto Confirm User" al crear el usuario
- ✅ Verifica que el usuario existe en Authentication → Users

### "User not found" o redirige a login
- ✅ Verifica que insertaste el usuario en la tabla `users`
- ✅ El ID debe ser **exactamente igual** al UID de Authentication
- ✅ Verifica que el campo `role` tiene valor `admin`, `technician` o `encargado`

### "Missing Supabase environment variables"
- ✅ Verifica que el archivo se llama `.env.local` (no `.en.local`)
- ✅ Reinicia el servidor: `npm run dev`

## 🎯 Resumen

**Lo que necesitas hacer:**
1. ✅ Variables de entorno → Ya las tienes
2. ❌ Crear usuario en Authentication → **Hazlo ahora**
3. ❌ Insertar usuario en tabla `users` → **Hazlo ahora**
4. ✅ Iniciar sesión → Debería funcionar después de los pasos 2 y 3








