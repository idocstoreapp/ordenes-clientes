-- ============================================
-- Corregir acceso a políticas de garantía
-- ============================================
-- Las garantías deben ser visibles para todos los usuarios autenticados
-- pero solo el admin puede modificarlas

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "settings_select_admin" ON system_settings;

-- Nueva política: Todos los usuarios autenticados pueden leer
CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Las políticas de INSERT y UPDATE se mantienen solo para admin
-- (ya están definidas en create_settings_table.sql)






