-- ============================================
-- SOLUCIÓN: Generación automática de números de orden únicos
-- ============================================
-- PROBLEMA:
-- Cuando múltiples usuarios crean órdenes simultáneamente, pueden obtener
-- el mismo número de orden, causando error "duplicate key value violates unique constraint"
--
-- SOLUCIÓN:
-- Crear una función y trigger que genere automáticamente el número de orden
-- si no se proporciona, usando una secuencia para garantizar unicidad
-- ============================================

-- 1. Crear secuencia para números de orden (si no existe)
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- 2. Inicializar la secuencia con el último número de orden existente + 1
DO $$ 
DECLARE
  max_order_num INTEGER := 0;
BEGIN
  -- Buscar el número más alto de orden existente
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number ~ '^ORD-(\d+)$' 
      THEN (regexp_match(order_number, '^ORD-(\d+)$'))[1]::INTEGER
      ELSE 0
    END
  ), 0) INTO max_order_num
  FROM work_orders
  WHERE order_number ~ '^ORD-(\d+)$';
  
  -- Establecer el siguiente valor de la secuencia
  PERFORM setval('order_number_seq', GREATEST(max_order_num, 0) + 1, false);
  
  RAISE NOTICE 'Secuencia order_number_seq inicializada con valor: %', max_order_num + 1;
END $$;

-- 3. Crear función para generar número de orden automáticamente
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
  
  -- Generar el número de orden en formato ORD-000001
  new_order_number := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  
  -- Verificar que no exista (por si acaso)
  WHILE EXISTS (SELECT 1 FROM work_orders WHERE order_number = new_order_number) LOOP
    next_num := nextval('order_number_seq');
    new_order_number := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  END LOOP;
  
  NEW.order_number := new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS generate_order_number_trigger ON work_orders;

-- 5. Crear trigger que se ejecuta ANTES de insertar
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- 6. Verificar que el trigger se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'generate_order_number_trigger'
  ) THEN
    RAISE NOTICE 'Trigger generate_order_number_trigger creado exitosamente';
  ELSE
    RAISE WARNING 'No se pudo crear el trigger generate_order_number_trigger';
  END IF;
END $$;

-- ============================================
-- NOTAS:
-- 1. El trigger solo se ejecuta si order_number es NULL o vacío
-- 2. Si proporcionas un order_number manualmente, se respetará
-- 3. La secuencia garantiza números únicos incluso con concurrencia alta
-- 4. Si por alguna razón el número generado ya existe, se incrementa automáticamente
-- ============================================

-- Verificar el estado actual
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
