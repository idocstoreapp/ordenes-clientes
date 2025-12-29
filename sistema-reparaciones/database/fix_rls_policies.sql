-- ============================================
-- Script para corregir recursión infinita en políticas RLS
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Eliminar TODAS las políticas existentes para evitar conflictos
-- Políticas de users
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;

-- Políticas de orders
DROP POLICY IF EXISTS "orders_select_own_or_admin" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own_or_admin" ON orders;
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;

-- Políticas de salary_adjustments
DROP POLICY IF EXISTS "salary_adjustments_select_own_or_admin" ON salary_adjustments;
DROP POLICY IF EXISTS "salary_adjustments_select_own" ON salary_adjustments;
DROP POLICY IF EXISTS "salary_adjustments_select_admin" ON salary_adjustments;
DROP POLICY IF EXISTS "salary_adjustments_insert_own" ON salary_adjustments;

-- 2. Crear función helper para verificar si el usuario es admin
-- Esta función usa SECURITY DEFINER para leer la tabla sin pasar por RLS
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

-- 3. Crear políticas corregidas para users
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Los admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (is_admin());

-- Los admins pueden crear usuarios
CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  WITH CHECK (is_admin());

-- Los admins pueden editar cualquier usuario
CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Los admins pueden eliminar usuarios
CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (is_admin());

-- 4. Crear políticas corregidas para orders
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (technician_id = auth.uid());

CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (technician_id = auth.uid());

CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (technician_id = auth.uid());

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Los admins pueden eliminar órdenes
CREATE POLICY "orders_delete_admin"
  ON orders FOR DELETE
  USING (is_admin());

-- Los admins pueden crear órdenes
CREATE POLICY "orders_insert_admin"
  ON orders FOR INSERT
  WITH CHECK (is_admin());

-- 5. Crear políticas corregidas para salary_adjustments
CREATE POLICY "salary_adjustments_select_own"
  ON salary_adjustments FOR SELECT
  USING (technician_id = auth.uid());

CREATE POLICY "salary_adjustments_select_admin"
  ON salary_adjustments FOR SELECT
  USING (is_admin());

CREATE POLICY "salary_adjustments_insert_own"
  ON salary_adjustments FOR INSERT
  WITH CHECK (technician_id = auth.uid());

-- Los admins pueden crear ajustes de sueldo
CREATE POLICY "salary_adjustments_insert_admin"
  ON salary_adjustments FOR INSERT
  WITH CHECK (is_admin());

-- Los admins pueden editar ajustes de sueldo
CREATE POLICY "salary_adjustments_update_admin"
  ON salary_adjustments FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Los admins pueden eliminar ajustes de sueldo
CREATE POLICY "salary_adjustments_delete_admin"
  ON salary_adjustments FOR DELETE
  USING (is_admin());

