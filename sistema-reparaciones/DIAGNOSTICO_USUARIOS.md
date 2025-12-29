# 🔍 Diagnóstico: Usuarios No Detectados

## Problema

Hay usuarios en Supabase pero el sistema no los detecta al iniciar sesión.

## Posibles Causas

### 1. ❌ El ID de Authentication no coincide con el ID en la tabla `users`

**Síntoma:** El usuario puede autenticarse pero no se carga el perfil.

**Solución:**
```sql
-- En Supabase SQL Editor, ejecuta esto para ver los IDs:
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_table_id,
  u.email as user_table_email,
  u.role,
  u.name
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'tu-email@ejemplo.com';
```

Si `auth_id` es diferente de `user_table_id`, ese es el problema.

**Fix:**
```sql
-- Actualizar el ID en la tabla users para que coincida con Authentication
UPDATE users 
SET id = 'NUEVO_ID_DE_AUTHENTICATION'
WHERE email = 'tu-email@ejemplo.com';
```

### 2. ❌ Políticas RLS bloqueando el acceso

**Síntoma:** Error en consola: "new row violates row-level security policy"

**Verificar políticas:**
```sql
-- Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
```

**Solución temporal (solo para diagnóstico):**
```sql
-- Deshabilitar RLS temporalmente para diagnosticar (NO en producción)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Luego verifica si funciona. Si funciona, el problema son las políticas.**

### 3. ❌ Variables de entorno no se cargan correctamente

**Síntoma:** Error: "Missing Supabase environment variables"

**Verificar:**
1. El archivo debe llamarse `.env.local` (no `.en.local`)
2. Las variables deben empezar con `PUBLIC_`
3. Reinicia el servidor después de cambiar `.env.local`

**Verificar en consola del navegador:**
```javascript
// Abre la consola del navegador (F12) y ejecuta:
console.log('URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('Key:', import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
```

### 4. ❌ Usuario existe en Authentication pero NO en la tabla `users`

**Síntoma:** Puede autenticarse pero ve el mensaje "No encontramos tu perfil en la tabla `users`"

**Verificar:**
```sql
-- Ver usuarios en Authentication que NO tienen registro en users
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;
```

**Solución:**
```sql
-- Insertar usuario faltante (reemplaza con datos reales)
INSERT INTO users (id, role, name, email, local)
SELECT 
  au.id,
  'technician',  -- o 'admin' según corresponda
  COALESCE(au.raw_user_meta_data->>'name', 'Usuario'),
  au.email,
  'Sucursal Principal'
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
AND au.email = 'tu-email@ejemplo.com';
```

## 🔧 Script de Diagnóstico Completo

Ejecuta esto en Supabase SQL Editor para diagnosticar:

```sql
-- 1. Ver todos los usuarios en Authentication
SELECT 
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Ver todos los usuarios en la tabla users
SELECT 
  id,
  email,
  role,
  name,
  local,
  sucursal_id
FROM users
ORDER BY created_at DESC;

-- 3. Ver usuarios que están en Authentication pero NO en users
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.confirmed_at,
  'FALTA EN TABLA USERS' as problema
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- 4. Ver usuarios que están en users pero NO en Authentication
SELECT 
  u.id as user_id,
  u.email as user_email,
  u.role,
  'FALTA EN AUTHENTICATION' as problema
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- 5. Verificar políticas RLS
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

## 🚀 Solución Rápida

Si quieres una solución rápida para probar:

1. **Deshabilitar RLS temporalmente** (solo para desarrollo):
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

2. **Verificar que funciona**

3. **Si funciona, el problema son las políticas. Revisa:**
```sql
-- Ver políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Política que debería existir (para que usuarios vean su propio perfil):
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

## 📝 Verificar en el Navegador

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Intenta iniciar sesión
4. Busca errores en rojo
5. Copia los errores y compártelos

Los errores más comunes:
- `"new row violates row-level security policy"` → Problema de RLS
- `"Missing Supabase environment variables"` → Variables no cargadas
- `"relation does not exist"` → Tabla no existe
- `"Invalid API key"` → Clave incorrecta








