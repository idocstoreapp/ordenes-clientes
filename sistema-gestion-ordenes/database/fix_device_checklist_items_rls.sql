-- ============================================
-- Corregir políticas RLS para device_checklist_items
-- Permitir que los admins puedan insertar, actualizar y eliminar
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "device_checklist_items_select_all" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_insert_admin" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_update_admin" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_delete_admin" ON device_checklist_items;

-- Política para SELECT: todos pueden leer
CREATE POLICY "device_checklist_items_select_all" ON device_checklist_items 
  FOR SELECT 
  USING (true);

-- Política para INSERT: solo admins pueden insertar
CREATE POLICY "device_checklist_items_insert_admin" ON device_checklist_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Política para UPDATE: solo admins pueden actualizar
CREATE POLICY "device_checklist_items_update_admin" ON device_checklist_items 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Política para DELETE: solo admins pueden eliminar
CREATE POLICY "device_checklist_items_delete_admin" ON device_checklist_items 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'device_checklist_items'
ORDER BY policyname;
