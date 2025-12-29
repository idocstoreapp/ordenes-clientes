-- ============================================
-- Script para corregir política de INSERT en orders
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script asegura que los técnicos puedan insertar órdenes

-- 1. Eliminar la política existente si existe (puede tener problemas)
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own_or_admin" ON orders;

-- 2. Crear función helper para verificar si el usuario es admin (si no existe)
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

-- 3. Crear política corregida para INSERT de órdenes
-- Los técnicos pueden insertar órdenes donde technician_id = auth.uid()
CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (technician_id = auth.uid());

-- 4. Los admins también pueden insertar órdenes (por si acaso)
DROP POLICY IF EXISTS "orders_insert_admin" ON orders;
CREATE POLICY "orders_insert_admin"
  ON orders FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que las políticas estén activas:
-- SELECT * FROM pg_policies WHERE tablename = 'orders' AND policyname LIKE '%insert%';







