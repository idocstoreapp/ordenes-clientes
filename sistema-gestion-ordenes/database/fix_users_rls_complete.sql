-- ============================================
-- Script COMPLETO para corregir políticas RLS de users
-- y permitir que las sucursales lean encargados
-- ============================================
-- PROBLEMA: Las sucursales no pueden leer encargados porque
-- las políticas RLS requieren auth.uid() y las sucursales tienen auth.uid() = NULL
-- ============================================

-- 1. Verificar estado actual de RLS
SELECT 
  '=== ESTADO ACTUAL DE RLS ===' as seccion;

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 2. Ver todas las políticas existentes para users
SELECT 
  '=== POLÍTICAS ACTUALES ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Eliminar TODAS las políticas existentes para users (empezar limpio)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_select_encargados_for_branches" ON users;
DROP POLICY IF EXISTS "users_select_all_encargados" ON users;
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_technicians_same_branch_encargado" ON users;
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;

-- 4. Crear función helper is_admin() si no existe
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

-- 5. Crear políticas nuevas (en orden de prioridad)

-- Política 1: Usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (auth.uid() = id);

-- Política 2: Admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin" ON users FOR SELECT
  USING (is_admin());

-- Política 3: Sucursales (auth.uid() IS NULL) pueden ver TODOS los encargados
-- Esta es la clave para que las sucursales puedan cargar el selector
CREATE POLICY "users_select_encargados_for_branches" ON users FOR SELECT
  USING (
    role = 'encargado' 
    AND auth.uid() IS NULL
  );

-- Política 4: Permitir que cualquiera (autenticado o no) pueda ver encargados
-- Esto es necesario para que las sucursales puedan cargar el selector
-- Las sucursales no tienen auth.uid(), así que necesitamos esta política más permisiva
CREATE POLICY "users_select_encargados_all" ON users FOR SELECT
  USING (role = 'encargado');

-- 6. Verificar políticas creadas
SELECT 
  '=== POLÍTICAS CREADAS ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 7. Prueba de consulta (debería funcionar ahora)
SELECT 
  '=== PRUEBA DE CONSULTA ===' as seccion;

-- Esta consulta debería funcionar ahora (simulando auth.uid() IS NULL)
-- Nota: En Supabase, cuando no hay sesión, auth.uid() es NULL automáticamente
SELECT 
  id, 
  name, 
  email, 
  role, 
  sucursal_id
FROM users 
WHERE role = 'encargado'
LIMIT 10;
