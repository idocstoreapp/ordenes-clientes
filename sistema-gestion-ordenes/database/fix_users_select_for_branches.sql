-- ============================================
-- Script para permitir que las sucursales puedan leer encargados
-- ============================================
-- PROBLEMA: Las sucursales no tienen auth.uid() (es NULL), por lo que
-- las políticas RLS que requieren auth.uid() bloquean la consulta de encargados.
--
-- SOLUCIÓN: Agregar una política que permita leer usuarios con rol "encargado"
-- cuando auth.uid() es NULL (sucursales).
-- ============================================

-- Verificar si RLS está habilitado en users
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Eliminar política existente si existe (para evitar conflictos)
DROP POLICY IF EXISTS "users_select_encargados_for_branches" ON users;
DROP POLICY IF EXISTS "users_select_all_encargados" ON users;

-- Crear política que permita leer encargados cuando auth.uid() es NULL (sucursales)
-- Esta política permite que las sucursales puedan ver todos los encargados
-- para poder seleccionarlos al crear órdenes
CREATE POLICY "users_select_encargados_for_branches" ON users FOR SELECT
  USING (
    -- Permitir leer usuarios con rol "encargado" cuando auth.uid() es NULL (sucursales)
    role = 'encargado' 
    AND auth.uid() IS NULL
  );

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que la política esté activa:
SELECT 
  '=== POLÍTICAS PARA USERS ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Verificar que la política se creó correctamente
SELECT 
  '=== POLÍTICA CREADA ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'users_select_encargados_for_branches';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Esta política permite que las sucursales (auth.uid() IS NULL) puedan leer
--    usuarios con rol "encargado"
-- 2. Las sucursales NO pueden ver otros tipos de usuarios (solo encargados)
-- 3. Si necesitas que las sucursales vean otros usuarios, agrega políticas adicionales
