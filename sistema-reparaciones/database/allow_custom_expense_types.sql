-- ============================================
-- PERMITIR TIPOS PERSONALIZADOS DE GASTOS
-- ============================================
-- Este script elimina las constraints que limitan los tipos de gasto
-- y permite tipos personalizados
-- ============================================

-- 1. Eliminar constraint de tipos en small_expenses
ALTER TABLE small_expenses 
DROP CONSTRAINT IF EXISTS small_expenses_tipo_check;

-- 2. Eliminar constraint de tipos en general_expenses
ALTER TABLE general_expenses 
DROP CONSTRAINT IF EXISTS general_expenses_tipo_check;

-- 3. Agregar constraints más flexibles que solo validen que tipo no sea vacío
ALTER TABLE small_expenses 
ADD CONSTRAINT small_expenses_tipo_check 
CHECK (tipo IS NOT NULL AND LENGTH(TRIM(tipo)) > 0);

ALTER TABLE general_expenses 
ADD CONSTRAINT general_expenses_tipo_check 
CHECK (tipo IS NOT NULL AND LENGTH(TRIM(tipo)) > 0);

-- Nota: Ahora se pueden agregar tipos personalizados además de los predefinidos







