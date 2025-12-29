-- Script para actualizar la orden de Oscar Torres
-- Orden: 23568 del 18/11/2025
-- Este script actualiza la fecha de la orden a la semana actual
-- para que cuente como trabajo de esta semana y no de la semana pasada

-- Buscar la orden de Oscar Torres con número 23568
-- Primero, encontrar el ID del técnico Oscar Torres
-- Luego actualizar la orden

-- Paso 1: Verificar la orden actual (descomentar para ver)
-- SELECT 
--   o.id,
--   o.order_number,
--   o.created_at,
--   o.status,
--   o.receipt_number,
--   u.name as technician_name
-- FROM orders o
-- JOIN users u ON o.technician_id = u.id
-- WHERE o.order_number = '23568'
--   AND u.name ILIKE '%oscar%torres%';

-- IMPORTANTE: Este script actualiza la orden 23568 de Oscar Torres
-- a la semana actual porque el recibo se agregó hoy (22/11/2025)

-- Paso 1: Verificar la orden actual y guardar la fecha original
UPDATE orders
SET 
  original_created_at = COALESCE(original_created_at, created_at)
WHERE order_number = '23568'
  AND technician_id IN (
    SELECT id FROM users WHERE name ILIKE '%oscar%torres%'
  )
  AND original_created_at IS NULL;

-- Paso 2: Actualizar la fecha de la orden a la fecha/hora actual
-- Esto moverá la orden a la semana actual para que cuente en esta semana
UPDATE orders
SET 
  created_at = NOW(),  -- Actualizar a fecha/hora actual
  -- Los campos week_start, month, year se actualizan automáticamente por el trigger
  -- Pero los actualizamos manualmente para asegurar
  week_start = DATE_TRUNC('week', NOW())::DATE,
  month = EXTRACT(MONTH FROM NOW())::INTEGER,
  year = EXTRACT(YEAR FROM NOW())::INTEGER
WHERE order_number = '23568'
  AND technician_id IN (
    SELECT id FROM users WHERE name ILIKE '%oscar%torres%'
  )
  AND receipt_number IS NOT NULL  -- Solo si ya tiene recibo
  AND status = 'paid';  -- Solo si está pagada

-- Verificar que se actualizó correctamente
SELECT 
  o.id,
  o.order_number,
  o.created_at,
  o.status,
  o.receipt_number,
  o.commission_amount,
  u.name as technician_name
FROM orders o
JOIN users u ON o.technician_id = u.id
WHERE o.order_number = '23568'
  AND u.name ILIKE '%oscar%torres%';

