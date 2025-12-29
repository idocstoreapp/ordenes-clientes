-- ============================================
-- Agregar campo receipt_url a la tabla orders
-- ============================================
-- Este script agrega el campo receipt_url para almacenar
-- la URL del recibo ingresada manualmente por el técnico
-- ============================================

-- Agregar columna receipt_url
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Agregar comentario
COMMENT ON COLUMN orders.receipt_url IS 'URL del recibo ingresada manualmente por el técnico. Se muestra como hipervínculo al hacer clic en el número de recibo.';

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'receipt_url';







