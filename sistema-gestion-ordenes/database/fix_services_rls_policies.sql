-- ============================================
-- Script para corregir políticas RLS de la tabla services
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script corrige el error: "new row violates row-level security policy for table 'services'"
--
-- PROBLEMA: 
-- 1. La política INSERT puede tener problemas de recursión al consultar la tabla users
-- 2. Faltan políticas UPDATE y DELETE para la tabla services
-- 3. Las sucursales no pueden crear servicios porque no tienen auth.uid()
--
-- SOLUCIÓN: 
-- 1. Crear función is_admin() con SECURITY DEFINER para evitar recursión
-- 2. Actualizar política INSERT para permitir admins Y sucursales (auth.uid() IS NULL)
-- 3. Agregar políticas UPDATE y DELETE faltantes

-- ============================================
-- 1. Crear función helper is_admin()
-- ============================================
-- Esta función usa SECURITY DEFINER para leer la tabla users sin pasar por RLS
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

-- ============================================
-- 2. Eliminar políticas existentes
-- ============================================
DROP POLICY IF EXISTS "services_insert_admin" ON services;
DROP POLICY IF EXISTS "services_insert_admin_or_branch" ON services;
DROP POLICY IF EXISTS "services_update_admin" ON services;
DROP POLICY IF EXISTS "services_delete_admin" ON services;

-- ============================================
-- 3. Crear nuevas políticas
-- ============================================

-- Política INSERT: Admins y sucursales pueden crear servicios
-- - Admins: usando is_admin()
-- - Sucursales: cuando auth.uid() IS NULL (no usan auth.users)
CREATE POLICY "services_insert_admin_or_branch" ON services FOR INSERT 
  WITH CHECK (
    is_admin() 
    OR auth.uid() IS NULL  -- Permitir a sucursales (no tienen auth.uid())
  );

-- Política UPDATE: Solo admins pueden actualizar servicios
CREATE POLICY "services_update_admin" ON services FOR UPDATE 
  USING (is_admin())
  WITH CHECK (is_admin());

-- Política DELETE: Solo admins pueden eliminar servicios
CREATE POLICY "services_delete_admin" ON services FOR DELETE 
  USING (is_admin());

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que las políticas estén activas:
-- SELECT * FROM pg_policies WHERE tablename = 'services';
--
-- Deberías ver 4 políticas:
-- 1. services_select_all (SELECT - todos pueden leer)
-- 2. services_insert_admin_or_branch (INSERT - admins y sucursales)
-- 3. services_update_admin (UPDATE - solo admins)
-- 4. services_delete_admin (DELETE - solo admins)
