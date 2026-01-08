-- ============================================
-- Corregir política RLS de system_settings
-- para que las sucursales puedan leer las garantías
-- ============================================
-- Las garantías deben ser visibles para TODOS (incluyendo sucursales sin auth.uid())
-- pero solo el admin puede modificarlas

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "settings_select_authenticated" ON system_settings;
DROP POLICY IF EXISTS "settings_select_admin" ON system_settings;

-- Nueva política: Permitir lectura a todos (incluyendo sucursales sin auth.uid())
-- Esto es seguro porque system_settings solo contiene configuraciones públicas (garantías, logos)
CREATE POLICY "settings_select_all" ON system_settings FOR SELECT 
  USING (true);

-- Las políticas de INSERT y UPDATE se mantienen solo para admin
-- (ya están definidas en create_settings_table.sql, pero las verificamos aquí)
DROP POLICY IF EXISTS "settings_insert_admin" ON system_settings;
DROP POLICY IF EXISTS "settings_update_admin" ON system_settings;

CREATE POLICY "settings_insert_admin" ON system_settings FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "settings_update_admin" ON system_settings FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

