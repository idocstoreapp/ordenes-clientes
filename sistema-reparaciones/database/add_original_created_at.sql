-- Script para agregar el campo original_created_at a la tabla orders
-- Este campo almacena la fecha y hora original en que se creó la orden
-- y nunca se actualiza, incluso si created_at cambia

-- Agregar la columna original_created_at
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS original_created_at TIMESTAMP WITH TIME ZONE;

-- Para órdenes existentes, establecer original_created_at = created_at
UPDATE orders
SET original_created_at = created_at
WHERE original_created_at IS NULL;

-- Crear un trigger para establecer original_created_at automáticamente al insertar
-- Solo si no se proporciona un valor
CREATE OR REPLACE FUNCTION set_original_created_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Si original_created_at no se estableció, usar created_at
  IF NEW.original_created_at IS NULL THEN
    NEW.original_created_at = NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger solo si no existe
DROP TRIGGER IF EXISTS trigger_set_original_created_at ON orders;
CREATE TRIGGER trigger_set_original_created_at
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_original_created_at();

