-- ============================================
-- Script COMPLETO para corregir TODAS las políticas RLS
-- que bloquean a las sucursales
-- ============================================
-- PROBLEMA: Las sucursales no usan auth.users, por lo que auth.uid() 
-- es NULL. Todas las políticas que requieren auth.uid() bloquean a las sucursales.
--
-- SOLUCIÓN: Modificar todas las políticas para permitir operaciones
-- sin verificar auth.uid(), ya que las sucursales se identifican por
-- sucursal_id directamente en las tablas.
--
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA work_orders
-- ============================================

-- Eliminar políticas existentes (eliminar TODAS las posibles políticas)
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_admin" ON work_orders;

-- Política SELECT: Permitir ver órdenes si:
-- - Eres el técnico asignado (technician_id = auth.uid())
-- - La orden pertenece a tu sucursal (sucursal_id en tu sucursal_id de users)
-- - Eres admin
-- - O si no hay auth.uid() (sucursal), permitir ver todas las órdenes de su sucursal
--   (esto se manejará en el frontend filtrando por sucursal_id)
CREATE POLICY "work_orders_select_all" ON work_orders FOR SELECT
  USING (
    -- Usuarios autenticados: pueden ver sus órdenes, órdenes de su sucursal, o todas si son admin
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    -- Si no hay auth.uid() (sucursal), permitir SELECT (el frontend filtrará por sucursal_id)
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
-- Las validaciones de sucursal_id y technician_id se hacen en el frontend
CREATE POLICY "work_orders_insert_all" ON work_orders FOR INSERT 
  WITH CHECK (true);

-- Política UPDATE: Similar a SELECT
CREATE POLICY "work_orders_update_all" ON work_orders FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    (auth.uid() IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    (auth.uid() IS NULL)
  );

-- Política DELETE: Solo admins pueden eliminar
CREATE POLICY "work_orders_delete_admin" ON work_orders FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. POLÍTICAS PARA order_services
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "order_services_select_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_select_all" ON order_services;
DROP POLICY IF EXISTS "order_services_insert_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_insert_all" ON order_services;
DROP POLICY IF EXISTS "order_services_update_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_update_all" ON order_services;

-- Política SELECT: Permitir ver servicios de órdenes que puedes ver
CREATE POLICY "order_services_select_all" ON order_services FOR SELECT
  USING (
    -- Si hay auth.uid(), verificar que la orden pertenezca al usuario/sucursal/admin
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    -- Si no hay auth.uid() (sucursal), permitir SELECT
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
CREATE POLICY "order_services_insert_all" ON order_services FOR INSERT 
  WITH CHECK (true);

-- Política UPDATE: Similar a SELECT
CREATE POLICY "order_services_update_all" ON order_services FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  );

-- ============================================
-- 3. POLÍTICAS PARA order_notes
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "order_notes_select_authenticated" ON order_notes;
DROP POLICY IF EXISTS "order_notes_select_all" ON order_notes;
DROP POLICY IF EXISTS "order_notes_insert_authenticated" ON order_notes;
DROP POLICY IF EXISTS "order_notes_insert_all" ON order_notes;

-- Política SELECT: Similar a order_services
CREATE POLICY "order_notes_select_all" ON order_notes FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
CREATE POLICY "order_notes_insert_all" ON order_notes FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 4. POLÍTICAS PARA customers (ya deberían estar corregidas, pero verificamos)
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_insert_all" ON customers;

-- Crear política que permita INSERT sin verificar auth.uid()
CREATE POLICY "customers_insert_all" ON customers FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar este script, verifica las políticas:

-- Ver políticas de work_orders
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'work_orders'
-- ORDER BY policyname;

-- Ver políticas de order_services
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'order_services'
-- ORDER BY policyname;

-- Ver políticas de order_notes
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'order_notes'
-- ORDER BY policyname;

-- Ver políticas de customers
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'customers'
-- ORDER BY policyname;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Las políticas SELECT para sucursales (auth.uid() IS NULL) permiten
--    ver todas las órdenes. El frontend DEBE filtrar por sucursal_id
--    para mostrar solo las órdenes de la sucursal actual.
--
-- 2. Las políticas INSERT permiten crear registros sin verificar auth.uid(),
--    pero el frontend DEBE validar y establecer correctamente sucursal_id
--    y technician_id según el tipo de usuario.
--
-- 3. Si necesitas más seguridad, puedes agregar triggers que validen
--    que las sucursales solo puedan crear/modificar órdenes con su propio
--    sucursal_id, pero esto requiere identificar la sucursal desde el
--    contexto de la aplicación (no desde auth.uid()).

