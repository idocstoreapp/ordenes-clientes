-- ============================================================
-- COPIAR/PEGAR COMPLETO EN SUPABASE SQL EDITOR
-- ============================================================
-- IMPORTANTE:
-- 1) Pega SOLO SQL (no pegues rutas de archivo como:
--    sistema-gestion-ordenes/database/fix_work_order_notes_rls_for_roles.sql)
-- 2) Ejecuta este bloque completo en una sola corrida.

BEGIN;

-- ============================================================
-- A) AGREGAR status_options A device_checklist_items
-- ============================================================
ALTER TABLE device_checklist_items
ADD COLUMN IF NOT EXISTS status_options JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'device_checklist_items_status_options_is_array'
  ) THEN
    ALTER TABLE device_checklist_items
    ADD CONSTRAINT device_checklist_items_status_options_is_array
    CHECK (
      status_options IS NULL
      OR jsonb_typeof(status_options) = 'array'
    );
  END IF;
END $$;

COMMENT ON COLUMN device_checklist_items.status_options IS
'Estados permitidos para este item de checklist. Si es NULL, se usan estados por defecto (ok,damaged,replaced,no_probado).';

-- ============================================================
-- B) FIX RLS PARA work_order_notes
-- ============================================================
ALTER TABLE IF EXISTS work_order_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_order_notes_select_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_insert_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_delete_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_select_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_insert_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_update_all" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_delete_all" ON work_order_notes;

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

COMMIT;

-- Verificación rápida opcional:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'work_order_notes' ORDER BY policyname;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'device_checklist_items' AND column_name = 'status_options';
