-- ============================================
-- Script SIMPLE y DIRECTO para permitir que las sucursales lean encargados
-- ============================================
-- Este script es más agresivo y debería funcionar inmediatamente
-- ============================================

-- 1. Eliminar TODAS las políticas existentes (empezar desde cero)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_select_encargados_for_branches" ON users;
DROP POLICY IF EXISTS "users_select_all_encargados" ON users;
DROP POLICY IF EXISTS "users_select_encargados_all" ON users;
DROP POLICY IF EXISTS "users_select_responsables_anyone" ON users;
DROP POLICY IF EXISTS "users_select_responsables_for_branches" ON users;
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_technicians_same_branch_encargado" ON users;
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;

-- 2. Crear función helper is_admin() si no existe
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

-- 3. Crear políticas (en orden de prioridad - las más permisivas primero)

-- Política 1: CUALQUIERA puede ver responsables (incluye sucursales con auth.uid() = NULL)
-- Esta es la política más importante para que las sucursales funcionen
CREATE POLICY "users_select_responsables_anyone" ON users FOR SELECT
  USING (role = 'responsable');

-- Política 2: Usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (auth.uid() = id);

-- Política 3: Admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin" ON users FOR SELECT
  USING (is_admin());

-- 4. Verificar que las políticas se crearon
SELECT 
  '=== POLÍTICAS CREADAS ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Verificar que funciona (debería mostrar todos los responsables)
SELECT 
  '=== PRUEBA: Responsables disponibles ===' as seccion;

SELECT 
  id, 
  name, 
  email, 
  role, 
  sucursal_id
FROM users 
WHERE role = 'responsable'
ORDER BY name;
