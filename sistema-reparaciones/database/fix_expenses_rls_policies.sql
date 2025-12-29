-- ============================================
-- FIX: Políticas RLS para small_expenses y general_expenses
-- ============================================
-- Este script corrige las políticas RLS para permitir que:
-- 1. Admins puedan crear y gestionar ambos tipos de gastos
-- 2. Encargados puedan crear gastos hormiga en su sucursal
-- 3. Evita recursión usando funciones helper con SECURITY DEFINER
-- ============================================

-- 1. Eliminar TODAS las políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "small_expenses_select_encargado_or_admin" ON small_expenses;
DROP POLICY IF EXISTS "small_expenses_insert_encargado" ON small_expenses;
DROP POLICY IF EXISTS "small_expenses_update_encargado_or_admin" ON small_expenses;
DROP POLICY IF EXISTS "small_expenses_delete_admin" ON small_expenses;

DROP POLICY IF EXISTS "general_expenses_select_admin" ON general_expenses;
DROP POLICY IF EXISTS "general_expenses_insert_admin" ON general_expenses;
DROP POLICY IF EXISTS "general_expenses_modify_admin" ON general_expenses;

-- 2. Crear funciones helper con SECURITY DEFINER para evitar recursión
-- Función para verificar si el usuario es admin
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

-- Función para verificar si el usuario es encargado
CREATE OR REPLACE FUNCTION is_encargado()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role = 'encargado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la sucursal del usuario actual (si es encargado)
CREATE OR REPLACE FUNCTION get_current_user_sucursal_id()
RETURNS UUID AS $$
DECLARE
  user_sucursal_id UUID;
BEGIN
  SELECT sucursal_id INTO user_sucursal_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'encargado';
  
  RETURN user_sucursal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Políticas RLS para small_expenses (gastos hormiga)

-- SELECT: Admins pueden ver todos, encargados solo los de su sucursal
CREATE POLICY "small_expenses_select_admin_or_encargado"
  ON small_expenses FOR SELECT
  USING (
    is_admin()
    OR (
      is_encargado()
      AND get_current_user_sucursal_id() IS NOT NULL
      AND small_expenses.sucursal_id = get_current_user_sucursal_id()
    )
  );

-- INSERT: Admins pueden crear en cualquier sucursal, encargados solo en su sucursal
CREATE POLICY "small_expenses_insert_admin_or_encargado"
  ON small_expenses FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      is_encargado()
      AND get_current_user_sucursal_id() IS NOT NULL
      AND small_expenses.sucursal_id = get_current_user_sucursal_id()
    )
  );

-- UPDATE: Admins pueden actualizar todos, encargados solo los de su sucursal
CREATE POLICY "small_expenses_update_admin_or_encargado"
  ON small_expenses FOR UPDATE
  USING (
    is_admin()
    OR (
      is_encargado()
      AND get_current_user_sucursal_id() IS NOT NULL
      AND small_expenses.sucursal_id = get_current_user_sucursal_id()
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      is_encargado()
      AND get_current_user_sucursal_id() IS NOT NULL
      AND small_expenses.sucursal_id = get_current_user_sucursal_id()
    )
  );

-- DELETE: Solo admins pueden eliminar
CREATE POLICY "small_expenses_delete_admin"
  ON small_expenses FOR DELETE
  USING (is_admin());

-- 4. Políticas RLS para general_expenses (gastos generales)

-- SELECT: Solo admins pueden ver
CREATE POLICY "general_expenses_select_admin"
  ON general_expenses FOR SELECT
  USING (is_admin());

-- INSERT: Solo admins pueden crear
CREATE POLICY "general_expenses_insert_admin"
  ON general_expenses FOR INSERT
  WITH CHECK (is_admin());

-- UPDATE: Solo admins pueden actualizar
CREATE POLICY "general_expenses_update_admin"
  ON general_expenses FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Solo admins pueden eliminar
CREATE POLICY "general_expenses_delete_admin"
  ON general_expenses FOR DELETE
  USING (is_admin());

-- 5. Verificar que las políticas se crearon correctamente
SELECT 
  '=== POLÍTICAS CREADAS PARA SMALL_EXPENSES ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'small_expenses'
ORDER BY policyname;

SELECT 
  '=== POLÍTICAS CREADAS PARA GENERAL_EXPENSES ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'general_expenses'
ORDER BY policyname;

-- 6. Verificar funciones creadas
SELECT 
  '=== FUNCIONES CREADAS ===' as seccion;

SELECT 
  proname as function_name
FROM pg_proc
WHERE proname IN ('is_admin', 'is_encargado', 'get_current_user_sucursal_id')
ORDER BY proname;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Las funciones helper usan SECURITY DEFINER para evitar recursión en RLS
-- 2. Los admins pueden crear y gestionar ambos tipos de gastos
-- 3. Los encargados solo pueden crear gastos hormiga en su sucursal asignada
-- 4. Si un encargado no tiene sucursal_id asignado, no podrá crear gastos hormiga
-- 5. Los admins pueden crear gastos hormiga en cualquier sucursal







