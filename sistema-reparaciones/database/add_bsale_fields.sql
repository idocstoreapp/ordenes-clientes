-- ============================================
-- MIGRACIÓN: Agregar campos de Bsale a la tabla orders
-- ============================================
-- PROBLEMA DETECTADO:
-- El código intenta guardar datos extraídos de Bsale (número, URL, monto total)
-- pero estos campos no existen en la base de datos.
-- 
-- SOLUCIÓN:
-- Agregar campos bsale_number, bsale_url, bsale_total_amount para almacenar
-- información extraída automáticamente de la API de Bsale cuando se valida un recibo.
-- ============================================

-- 1. Agregar nuevos campos a la tabla orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS bsale_number TEXT,
  ADD COLUMN IF NOT EXISTS bsale_url TEXT,
  ADD COLUMN IF NOT EXISTS bsale_total_amount NUMERIC;

-- 2. Crear índice para búsquedas por número de Bsale (opcional, útil para evitar duplicados)
CREATE INDEX IF NOT EXISTS idx_orders_bsale_number ON orders(bsale_number) WHERE bsale_number IS NOT NULL;

-- 3. Comentarios para documentar los campos
COMMENT ON COLUMN orders.bsale_number IS 'Número de documento extraído de Bsale cuando se valida el recibo. Se llena automáticamente al validar con la API de Bsale.';
COMMENT ON COLUMN orders.bsale_url IS 'URL del documento en Bsale. Se genera automáticamente al validar el recibo con la API de Bsale.';
COMMENT ON COLUMN orders.bsale_total_amount IS 'Monto total del documento extraído de Bsale. Se obtiene automáticamente al validar el recibo con la API de Bsale.';








