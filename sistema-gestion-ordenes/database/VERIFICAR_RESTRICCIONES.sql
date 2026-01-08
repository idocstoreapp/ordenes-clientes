-- Script para verificar si las restricciones CHECK aún existen
-- Ejecuta esto en Supabase SQL Editor para verificar el estado

-- Verificar restricciones en device_checklist_items
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'device_checklist_items'::regclass
    AND contype = 'c'
    AND conname LIKE '%device_type%';

-- Verificar restricciones en work_orders
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'work_orders'::regclass
    AND contype = 'c'
    AND conname LIKE '%device_type%';

-- Si las consultas anteriores devuelven filas, significa que las restricciones aún existen
-- Ejecuta entonces: database/allow_custom_device_types.sql










