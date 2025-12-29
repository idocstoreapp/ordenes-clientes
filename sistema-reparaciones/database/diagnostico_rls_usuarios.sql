-- ============================================
-- Script de Diagnóstico: Problema con Usuarios
-- ============================================
-- Ejecuta este script en Supabase SQL Editor para diagnosticar el problema
-- ============================================

-- 1. Verificar usuarios en Authentication vs tabla users
SELECT 
  '=== USUARIOS EN AUTHENTICATION ===' as seccion;

SELECT 
  id as auth_id,
  email as auth_email,
  confirmed_at,
  email_confirmed_at,
  created_at as auth_created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar usuarios en tabla users
SELECT 
  '=== USUARIOS EN TABLA USERS ===' as seccion;

SELECT 
  id as user_id,
  email as user_email,
  role,
  name,
  local,
  sucursal_id,
  created_at as user_created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar coincidencias de IDs
SELECT 
  '=== COINCIDENCIAS DE IDs ===' as seccion;

SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.role,
  CASE 
    WHEN au.id = u.id THEN '✅ COINCIDE'
    WHEN u.id IS NULL THEN '❌ FALTA EN TABLA USERS'
    WHEN au.id IS NULL THEN '❌ FALTA EN AUTHENTICATION'
    ELSE '⚠️ IDs DIFERENTES'
  END as estado
FROM auth.users au
FULL OUTER JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC
LIMIT 20;

-- 4. Verificar políticas RLS actuales
SELECT 
  '=== POLÍTICAS RLS PARA TABLA USERS ===' as seccion;

SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Verificar si RLS está habilitado
SELECT 
  '=== ESTADO DE RLS ===' as seccion;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'users';

-- 6. Probar consulta como usuario autenticado (reemplaza con tu user_id)
-- SELECT 
--   '=== PRUEBA DE CONSULTA ===' as seccion;
-- 
-- -- Reemplaza 'TU_USER_ID_AQUI' con un ID real de Authentication
-- SET LOCAL role = 'authenticated';
-- SET LOCAL request.jwt.claim.sub = 'TU_USER_ID_AQUI';
-- 
-- SELECT * FROM users WHERE id = 'TU_USER_ID_AQUI';

-- ============================================
-- SOLUCIÓN: Corregir políticas RLS
-- ============================================
-- Si el problema son las políticas, ejecuta esto:

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;

-- Crear función helper (si no existe)
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

-- Política simple: usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Política: admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (is_admin());

-- Verificar que se crearon
SELECT 
  '=== POLÍTICAS CREADAS ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;








