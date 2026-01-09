-- ============================================
-- Agregar campo devices_data a work_orders
-- ============================================
-- Este campo almacena equipos adicionales en formato JSONB
-- cuando una orden contiene múltiples equipos
-- ============================================

-- Agregar columna devices_data si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'devices_data'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN devices_data JSONB;
    
    COMMENT ON COLUMN work_orders.devices_data IS 'Equipos adicionales en formato JSONB. Array de objetos con: device_type, device_model, device_serial_number, device_unlock_code, device_unlock_pattern, problem_description, checklist_data, replacement_cost, labor_cost, selected_services';
    
    RAISE NOTICE 'Columna devices_data agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna devices_data ya existe';
  END IF;
END $$;

-- Verificar que la columna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'devices_data';
