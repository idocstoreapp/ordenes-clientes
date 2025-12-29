-- Agregar campo para guardar la fecha/hora exacta de cuando se marca una orden como devuelta o cancelada
-- Este campo se actualizará automáticamente cuando el status cambie a 'returned' o 'cancelled'

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Comentarios para documentar los campos
COMMENT ON COLUMN orders.returned_at IS 'Fecha y hora exacta en que la orden fue marcada como devuelta. Se usa para mostrar la fecha correcta de devolución.';
COMMENT ON COLUMN orders.cancelled_at IS 'Fecha y hora exacta en que la orden fue marcada como cancelada. Se usa para mostrar la fecha correcta de cancelación.';

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_orders_returned_at ON orders(returned_at);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at);

