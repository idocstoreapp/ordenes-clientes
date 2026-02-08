-- ============================================
-- Cambiar campo responsible_user_id a responsible_user_name (TEXT)
-- ============================================
-- En lugar de almacenar el ID de un usuario encargado,
-- ahora almacenamos el nombre del encargado como texto libre
-- ============================================

-- 1. Eliminar la columna responsible_user_id si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'responsible_user_id'
  ) THEN
    -- Eliminar índice si existe
    DROP INDEX IF EXISTS idx_work_orders_responsible_user;
    
    -- Eliminar la columna
    ALTER TABLE work_orders 
    DROP COLUMN responsible_user_id;
    
    RAISE NOTICE 'Columna responsible_user_id eliminada';
  ELSE
    RAISE NOTICE 'La columna responsible_user_id no existe';
  END IF;
END $$;

-- 2. Agregar columna responsible_user_name si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'responsible_user_name'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN responsible_user_name TEXT;
    
    COMMENT ON COLUMN work_orders.responsible_user_name IS 'Nombre del encargado responsable de recibir el equipo. Campo de texto libre, obligatorio cuando la orden es creada desde una sucursal.';
    
    RAISE NOTICE 'Columna responsible_user_name agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna responsible_user_name ya existe';
  END IF;
END $$;

-- 3. Verificar que la columna existe
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name = 'responsible_user_name';
