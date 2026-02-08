-- ============================================
-- Agregar campo responsible_user_id a work_orders
-- ============================================
-- Este campo almacena el ID del encargado responsable de recibir el equipo
-- cuando la orden es creada desde una sucursal
-- ============================================

-- Agregar columna responsible_user_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'responsible_user_id'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    
    -- Agregar índice para mejorar rendimiento
    CREATE INDEX IF NOT EXISTS idx_work_orders_responsible_user ON work_orders(responsible_user_id);
    
    COMMENT ON COLUMN work_orders.responsible_user_id IS 'ID del encargado responsable de recibir el equipo. Obligatorio cuando la orden es creada desde una sucursal.';
    
    RAISE NOTICE 'Columna responsible_user_id agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna responsible_user_id ya existe';
  END IF;
END $$;

-- Verificar que la columna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name = 'responsible_user_id';
