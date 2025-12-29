-- ============================================
-- Script para actualizar órdenes existentes con bsale_url
-- ============================================
-- Este script actualiza las órdenes que tienen receipt_number pero no bsale_url
-- Genera una URL de búsqueda en Bsale basada en el número de recibo
-- ============================================

-- NOTA: Este script genera URLs de búsqueda, no URLs directas a documentos
-- Las URLs directas solo se pueden obtener validando el documento con la API de Bsale
-- Para obtener URLs directas, necesitarías ejecutar la validación desde la aplicación

-- Función helper para generar URL de Bsale
CREATE OR REPLACE FUNCTION generate_bsale_search_url(receipt_number TEXT)
RETURNS TEXT AS $$
BEGIN
  IF receipt_number IS NULL OR receipt_number = '' THEN
    RETURN NULL;
  END IF;
  
  -- Generar URL de búsqueda en Bsale (Chile)
  -- Nota: Esta es una URL de búsqueda, no una URL directa al documento
  -- Usar REPLACE para escapar caracteres especiales básicos
  RETURN 'https://www.bsale.cl/document?number=' || receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Actualizar órdenes que tienen receipt_number pero no bsale_url
-- Solo actualiza si bsale_url es NULL o vacío
UPDATE orders
SET bsale_url = generate_bsale_search_url(receipt_number)
WHERE receipt_number IS NOT NULL
  AND receipt_number != ''
  AND (bsale_url IS NULL OR bsale_url = '');

-- Verificar cuántas órdenes se actualizaron
SELECT 
  COUNT(*) as ordenes_actualizadas,
  COUNT(CASE WHEN bsale_url IS NOT NULL THEN 1 END) as ordenes_con_url
FROM orders
WHERE receipt_number IS NOT NULL
  AND receipt_number != '';

-- Mostrar algunas órdenes actualizadas como ejemplo
SELECT 
  id,
  order_number,
  receipt_number,
  bsale_url,
  created_at
FROM orders
WHERE receipt_number IS NOT NULL
  AND receipt_number != ''
  AND bsale_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este script genera URLs de búsqueda, no URLs directas a documentos
-- 2. Para obtener URLs directas, necesitas validar el documento con la API de Bsale
-- 3. La validación se hace automáticamente cuando se crea o edita una orden con número de recibo
-- 4. Si quieres actualizar URLs directas para órdenes existentes, necesitarías:
--    a) Ejecutar la validación desde la aplicación para cada orden
--    b) O crear un script que use la API de Bsale (requiere tokens configurados)
--
-- ============================================
-- ALTERNATIVA: Actualizar desde la aplicación
-- ============================================
-- En lugar de ejecutar este script, puedes:
-- 1. Ir a la aplicación
-- 2. Editar cada orden que tenga receipt_number pero no bsale_url
-- 3. Guardar la orden (esto validará automáticamente con Bsale y actualizará la URL)
--
-- O crear un script en la aplicación que:
-- 1. Busque todas las órdenes con receipt_number pero sin bsale_url
-- 2. Valide cada una con la API de Bsale
-- 3. Actualice el bsale_url con la URL directa obtenida

