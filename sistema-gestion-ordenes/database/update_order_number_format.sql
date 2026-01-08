-- ============================================
-- ACTUALIZACIÓN: Eliminar prefijo ORD- y empezar desde 24900
-- ============================================
-- CAMBIOS:
-- 1. Eliminar el prefijo "ORD-" del formato de números de orden
-- 2. Inicializar la secuencia desde 24900
-- 3. Actualizar la función para generar solo números sin prefijo
-- ============================================

-- 1. Actualizar la función para generar números sin prefijo ORD-
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_order_number TEXT;
BEGIN
  -- Si ya tiene un order_number, no hacer nada
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener el siguiente número de la secuencia
  next_num := nextval('order_number_seq');
  
  -- Generar el número de orden solo como número (sin prefijo ORD-)
  new_order_number := next_num::TEXT;
  
  -- Verificar que no exista (por si acaso)
  WHILE EXISTS (SELECT 1 FROM work_orders WHERE order_number = new_order_number) LOOP
    next_num := nextval('order_number_seq');
    new_order_number := next_num::TEXT;
  END LOOP;
  
  NEW.order_number := new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Reinicializar la secuencia desde 24900
DO $$ 
DECLARE
  max_order_num INTEGER := 0;
  start_value INTEGER := 24900;
BEGIN
  -- Buscar el número más alto de orden existente (sin importar formato)
  SELECT COALESCE(MAX(
    CASE 
      -- Si tiene formato ORD-XXXX, extraer el número
      WHEN order_number ~ '^ORD-(\d+)$' 
      THEN (regexp_match(order_number, '^ORD-(\d+)$'))[1]::INTEGER
      -- Si es solo un número, usarlo directamente
      WHEN order_number ~ '^\d+$'
      THEN order_number::INTEGER
      ELSE 0
    END
  ), 0) INTO max_order_num
  FROM work_orders;
  
  -- Usar el mayor entre el máximo existente y el valor inicial (24900)
  PERFORM setval('order_number_seq', GREATEST(max_order_num + 1, start_value), false);
  
  RAISE NOTICE 'Secuencia order_number_seq inicializada con valor: %', GREATEST(max_order_num + 1, start_value);
END $$;

-- 3. Verificar el estado actual
SELECT 
  'Secuencia order_number_seq' AS item,
  last_value::TEXT AS valor
FROM order_number_seq
UNION ALL
SELECT 
  'Trigger generate_order_number_trigger' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'generate_order_number_trigger')
    THEN 'Activo'
    ELSE 'No encontrado'
  END AS valor;

-- ============================================
-- NOTAS:
-- 1. La secuencia ahora empezará desde 24900 (o el siguiente número mayor si hay órdenes más altas)
-- 2. Los números de orden se generarán sin el prefijo "ORD-"
-- 3. El formato será simplemente: 24900, 24901, 24902, etc.
-- 4. Las órdenes existentes con formato ORD-XXXX seguirán funcionando normalmente
-- ============================================







