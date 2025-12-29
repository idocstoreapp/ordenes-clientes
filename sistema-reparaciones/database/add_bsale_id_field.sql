-- ============================================
-- Agregar campo bsale_id a la tabla orders
-- ============================================
-- Este campo almacena el ID del documento en Bsale
-- Necesario para construir la URL del PDF del documento
-- ============================================

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS bsale_id INTEGER;

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_orders_bsale_id ON orders(bsale_id) WHERE bsale_id IS NOT NULL;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Este campo almacena el ID numérico del documento en Bsale
-- 2. Se usa junto con el token de acceso para construir la URL del PDF:
--    https://api.bsale.cl/v1/documents/{bsale_id}.pdf?access_token={token}
-- 3. Las órdenes existentes que ya tienen bsale_url pero no bsale_id
--    necesitarán ser re-validadas para obtener el bsale_id








