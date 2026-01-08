-- ============================================
-- Corregir política RLS de UPDATE en customers
-- para que las sucursales también puedan actualizar clientes
-- ============================================
-- Similar a la política de INSERT, permitir UPDATE sin verificar auth.uid()

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;

-- Nueva política: Permitir UPDATE a todos (incluyendo sucursales sin auth.uid())
CREATE POLICY "customers_update_all" ON customers FOR UPDATE 
  USING (true)
  WITH CHECK (true);


