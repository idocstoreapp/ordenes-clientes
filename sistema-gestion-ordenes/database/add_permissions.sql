-- ============================================
-- Sistema de Permisos para Usuarios
-- ============================================

-- Agregar columna de permisos a la tabla users si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='permissions') THEN
    ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Los permisos se almacenan como JSONB con esta estructura:
-- {
--   "use_admin_panel": false,
--   "use_statistics_panel": false,
--   "modify_orders": true,
--   "edit_product_stock": false,
--   "delete_orders": true,
--   "use_branch_panel": false,
--   "view_all_business_orders": false,
--   "edit_view_cost_price": true,
--   "create_orders": true,
--   "close_day": false
-- }

-- Permisos por defecto para cada rol
-- Los permisos se pueden sobrescribir individualmente por usuario

