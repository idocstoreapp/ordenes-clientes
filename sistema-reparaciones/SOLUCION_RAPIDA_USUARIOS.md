# ⚡ Solución Rápida: Usuarios No Detectados

## 🔍 Diagnóstico Rápido

Si hay usuarios en Supabase pero no se detectan, el problema más común es **políticas RLS bloqueando el acceso**.

## ✅ Solución en 3 Pasos

### Paso 1: Ejecutar Script de Diagnóstico

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `database/diagnostico_rls_usuarios.sql`
3. Copia y pega el contenido completo
4. Haz clic en **"Run"**
5. Revisa los resultados para ver qué está mal

### Paso 2: Verificar Coincidencia de IDs

El problema más común es que el **ID en Authentication no coincide con el ID en la tabla `users`**.

**Ejecuta esto en SQL Editor:**

```sql
-- Ver usuarios que no coinciden
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  CASE 
    WHEN au.id = u.id THEN '✅ OK'
    WHEN u.id IS NULL THEN '❌ FALTA EN TABLA USERS'
    ELSE '⚠️ IDs DIFERENTES'
  END as problema
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL OR au.id != u.id;
```

**Si ves "FALTA EN TABLA USERS":**
```sql
-- Insertar usuarios faltantes (reemplaza con tus datos reales)
INSERT INTO users (id, role, name, email, local)
SELECT 
  au.id,
  'technician',  -- o 'admin' según corresponda
  COALESCE(au.raw_user_meta_data->>'name', 'Usuario'),
  au.email,
  'Sucursal Principal'
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;
```

### Paso 3: Corregir Políticas RLS

Si las políticas están bloqueando, ejecuta esto:

```sql
-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;

-- Crear función helper
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política: usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Política: admins pueden ver todos
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (is_admin());
```

## 🧪 Probar

1. **Reinicia el servidor:** `npm run dev`
2. **Intenta iniciar sesión** con un usuario que existe
3. **Abre la consola del navegador** (F12) y busca errores

## 📋 Errores Comunes

### Error: "new row violates row-level security policy"
→ **Solución:** Ejecuta el Paso 3 (corregir políticas RLS)

### Error: "No encontramos tu perfil en la tabla `users`"
→ **Solución:** Ejecuta el Paso 2 (verificar coincidencia de IDs)

### Error: "Invalid login credentials"
→ **Solución:** El usuario no existe en Authentication o la contraseña es incorrecta

## 🔧 Verificar en el Navegador

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Intenta iniciar sesión
4. Busca errores en rojo
5. Copia los errores exactos

Los errores te dirán exactamente qué está mal.

## 📝 Script Completo (Todo en Uno)

Si prefieres ejecutar todo de una vez:

```sql
-- 1. Verificar problema
SELECT 
  au.id as auth_id,
  au.email,
  u.id as user_id,
  CASE 
    WHEN au.id = u.id THEN '✅ OK'
    WHEN u.id IS NULL THEN '❌ FALTA EN TABLA'
    ELSE '⚠️ DIFERENTE'
  END as estado
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
LIMIT 10;

-- 2. Corregir políticas
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (is_admin());
```








