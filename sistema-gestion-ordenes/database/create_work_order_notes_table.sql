-- ============================================
-- Crear tabla de notas específica para work_orders
-- ============================================
-- Motivo:
-- En entornos donde sistema-reparaciones y sistema-gestion-ordenes
-- comparten base de datos, la tabla `order_notes` puede apuntar a `orders`
-- (sistema-reparaciones) y no a `work_orders`.
--
-- Este script crea `work_order_notes` para evitar conflicto de FK.

CREATE TABLE IF NOT EXISTS work_order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'interno' CHECK (note_type IN ('interno', 'publico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_notes_order ON work_order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_notes_created_at ON work_order_notes(created_at DESC);

ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_order_notes_select_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_insert_authenticated" ON work_order_notes;
DROP POLICY IF EXISTS "work_order_notes_delete_authenticated" ON work_order_notes;

CREATE POLICY "work_order_notes_select_authenticated" ON work_order_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "work_order_notes_insert_authenticated" ON work_order_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "work_order_notes_delete_authenticated" ON work_order_notes FOR DELETE
  USING (auth.uid() IS NOT NULL);
