-- ============================================
-- Actualizar restricción de estado en orders
-- ============================================
-- Este script actualiza la restricción CHECK para permitir
-- los nuevos estados 'returned' y 'cancelled'
-- Ejecutar en el SQL Editor de Supabase

-- Primero, eliminar la restricción antigua
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Crear la nueva restricción con los estados adicionales
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'paid', 'returned', 'cancelled'));

-- Verificar que la restricción se aplicó correctamente
-- Puedes ejecutar esto para verificar:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'orders'::regclass 
-- AND conname = 'orders_status_check';

