-- Actualizar el constraint de payment_method para permitir "efectivo/transferencia" en lugar de "otro"
-- Primero eliminar el constraint existente
ALTER TABLE salary_settlements
  DROP CONSTRAINT IF EXISTS salary_settlements_payment_method_check;

-- Agregar el nuevo constraint con "efectivo/transferencia" en lugar de "otro"
ALTER TABLE salary_settlements
  ADD CONSTRAINT salary_settlements_payment_method_check 
  CHECK (payment_method IN ('efectivo', 'transferencia', 'efectivo/transferencia'));

-- Actualizar cualquier registro existente que tenga "otro" a "efectivo/transferencia" (opcional)
-- UPDATE salary_settlements 
-- SET payment_method = 'efectivo/transferencia' 
-- WHERE payment_method = 'otro';

