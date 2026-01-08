-- Script para permitir tipos de dispositivos personalizados
-- Elimina las restricciones CHECK que limitan device_type a solo 4 valores

-- 1. Eliminar restricción CHECK de device_checklist_items
ALTER TABLE device_checklist_items 
DROP CONSTRAINT IF EXISTS device_checklist_items_device_type_check;

-- 2. Eliminar restricción CHECK de work_orders
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_device_type_check;

-- Nota: Ahora device_type puede ser cualquier texto, permitiendo tipos personalizados como 'parlante', 'auriculares', etc.










