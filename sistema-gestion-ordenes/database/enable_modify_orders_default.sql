-- ============================================
-- Habilitar permiso modify_orders por defecto
-- para todos los usuarios que no sean admin
-- ============================================

-- Actualizar todos los usuarios técnicos/encargados/recepcionistas
-- para que tengan modify_orders: true si no lo tienen ya
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"modify_orders": true}'::jsonb
WHERE role != 'admin'
  AND (
    permissions IS NULL 
    OR permissions->>'modify_orders' IS NULL 
    OR (permissions->>'modify_orders')::boolean = false
  );

-- Verificar que se aplicó correctamente
SELECT 
  id,
  email,
  role,
  permissions->>'modify_orders' as modify_orders_permission
FROM users
WHERE role != 'admin'
ORDER BY email;
