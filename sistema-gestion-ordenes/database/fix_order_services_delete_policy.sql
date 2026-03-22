-- ============================================
-- Permitir DELETE en order_services para usuarios autenticados
-- ============================================
-- Sin esta política, al editar una orden y reescribir servicios,
-- el DELETE falla por RLS y luego los INSERT generan duplicados.

ALTER TABLE order_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_services_delete_authenticated" ON order_services;

CREATE POLICY "order_services_delete_authenticated" ON order_services FOR DELETE
  USING (auth.uid() IS NOT NULL);
