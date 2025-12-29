-- ============================================
-- Agregar campo device_unlock_pattern a work_orders
-- ============================================
-- Este script agrega la columna para almacenar patrones de desbloqueo
-- Ejecutar en Supabase SQL Editor si la tabla work_orders ya existe

-- Agregar columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'device_unlock_pattern'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN device_unlock_pattern JSONB;
    
    COMMENT ON COLUMN work_orders.device_unlock_pattern IS 'Patrón de desbloqueo como array de números del 1 al 9, ejemplo: [1,2,5,8,9]';
    
    RAISE NOTICE 'Columna device_unlock_pattern agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna device_unlock_pattern ya existe';
  END IF;
END $$;
