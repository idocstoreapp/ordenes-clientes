-- ============================================
-- Script para agregar políticas RLS faltantes para administradores
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script agrega las políticas necesarias para que los administradores
-- puedan crear, editar y eliminar usuarios, órdenes y reportes administrativos

-- ============================================
-- 1. Asegurar que la función is_admin() existe
-- ============================================
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
-- 2. Políticas para la tabla USERS
-- ============================================

-- INSERT: Los admins pueden crear usuarios
DROP POLICY IF EXISTS "users_insert_admin" ON users;
CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  WITH CHECK (is_admin());

-- UPDATE: Los admins pueden editar cualquier usuario
DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Los admins pueden eliminar usuarios
DROP POLICY IF EXISTS "users_delete_admin" ON users;
CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (is_admin());

-- ============================================
-- 3. Políticas para la tabla ORDERS
-- ============================================

-- DELETE: Los admins pueden eliminar órdenes
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin"
  ON orders FOR DELETE
  USING (is_admin());

-- INSERT: Los admins pueden crear órdenes (útil para reportes administrativos)
DROP POLICY IF EXISTS "orders_insert_admin" ON orders;
CREATE POLICY "orders_insert_admin"
  ON orders FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- 4. Políticas para la tabla ORDER_NOTES (si existe)
-- ============================================
-- Nota: Si la tabla order_notes no existe, estas políticas fallarán silenciosamente
-- pero no afectarán el resto del script

-- SELECT: Los admins pueden ver todas las notas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_notes') THEN
    DROP POLICY IF EXISTS "order_notes_select_admin" ON order_notes;
    EXECUTE 'CREATE POLICY "order_notes_select_admin"
      ON order_notes FOR SELECT
      USING (is_admin())';
  END IF;
END $$;

-- INSERT: Los admins pueden crear notas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_notes') THEN
    DROP POLICY IF EXISTS "order_notes_insert_admin" ON order_notes;
    EXECUTE 'CREATE POLICY "order_notes_insert_admin"
      ON order_notes FOR INSERT
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- UPDATE: Los admins pueden editar notas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_notes') THEN
    DROP POLICY IF EXISTS "order_notes_update_admin" ON order_notes;
    EXECUTE 'CREATE POLICY "order_notes_update_admin"
      ON order_notes FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- DELETE: Los admins pueden eliminar notas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_notes') THEN
    DROP POLICY IF EXISTS "order_notes_delete_admin" ON order_notes;
    EXECUTE 'CREATE POLICY "order_notes_delete_admin"
      ON order_notes FOR DELETE
      USING (is_admin())';
  END IF;
END $$;

-- ============================================
-- 5. Políticas para la tabla SALARY_ADJUSTMENTS
-- ============================================

-- INSERT: Los admins pueden crear ajustes de sueldo
DROP POLICY IF EXISTS "salary_adjustments_insert_admin" ON salary_adjustments;
CREATE POLICY "salary_adjustments_insert_admin"
  ON salary_adjustments FOR INSERT
  WITH CHECK (is_admin());

-- UPDATE: Los admins pueden editar ajustes de sueldo
DROP POLICY IF EXISTS "salary_adjustments_update_admin" ON salary_adjustments;
CREATE POLICY "salary_adjustments_update_admin"
  ON salary_adjustments FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Los admins pueden eliminar ajustes de sueldo
DROP POLICY IF EXISTS "salary_adjustments_delete_admin" ON salary_adjustments;
CREATE POLICY "salary_adjustments_delete_admin"
  ON salary_adjustments FOR DELETE
  USING (is_admin());

-- ============================================
-- 6. Verificación de políticas creadas
-- ============================================
-- Ejecuta esta consulta para verificar que todas las políticas fueron creadas:
-- 
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('users', 'orders', 'order_notes', 'salary_adjustments')
-- ORDER BY tablename, policyname;

