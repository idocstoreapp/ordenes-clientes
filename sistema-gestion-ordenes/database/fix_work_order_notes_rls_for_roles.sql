-- ============================================
-- Corregir RLS de work_order_notes para Admin + Sucursales + Usuarios
-- ============================================
-- Problema reportado:
-- - Admin puede crear notas, pero sucursales no pueden insertar
-- - Sucursales no ven notas creadas por otros roles en sus órdenes
-- - Error: "new row violates row level security policy for table work_order_notes"
--
-- Objetivo:
-- - Permitir ver notas de órdenes accesibles (misma lógica que work_orders)
-- - Permitir insertar notas en órdenes accesibles
-- - Mantener tabla aislada: SOLO work_order_notes (no toca order_notes)
--   para no afectar otras apps que comparten la misma base
-- ============================================

ALTER TABLE IF EXISTS work_order_notes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas viejas (incluye nombres usados en distintos scripts)
DROP POLICY IF EXISTS "work_order_notes_select_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_insert_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_delete_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_select_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_insert_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_update_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_delete_all" ON work_order_notes;

-- SELECT: puede ver notas si puede ver la orden
CREATE POLICY "work_order_notes_select_all" ON work_order_notes
FOR SELECT
USING (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM work_orders wo
      WHERE wo.id = work_order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT u.sucursal_id FROM users u WHERE u.id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
      )
    )
  )
  OR (auth.uid() IS NULL)
);

-- INSERT: puede agregar nota si puede acceder a la orden destino
CREATE POLICY "work_order_notes_insert_all" ON work_order_notes
FOR INSERT
WITH CHECK (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM work_orders wo
      WHERE wo.id = work_order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT u.sucursal_id FROM users u WHERE u.id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
      )
    )
  )
  OR (auth.uid() IS NULL)
);

-- UPDATE: mismo alcance que SELECT/INSERT
CREATE POLICY "work_order_notes_update_all" ON work_order_notes
FOR UPDATE
USING (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM work_orders wo
      WHERE wo.id = work_order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT u.sucursal_id FROM users u WHERE u.id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
      )
    )
  )
  OR (auth.uid() IS NULL)
)
WITH CHECK (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM work_orders wo
      WHERE wo.id = work_order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT u.sucursal_id FROM users u WHERE u.id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
      )
    )
  )
  OR (auth.uid() IS NULL)
);

-- DELETE: mismo alcance que SELECT/INSERT
CREATE POLICY "work_order_notes_delete_all" ON work_order_notes
FOR DELETE
USING (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM work_orders wo
      WHERE wo.id = work_order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT u.sucursal_id FROM users u WHERE u.id = auth.uid())
        OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
      )
    )
  )
  OR (auth.uid() IS NULL)
);

-- Verificación rápida (ejecutar manualmente si deseas confirmar)
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'work_order_notes'
-- ORDER BY policyname;
