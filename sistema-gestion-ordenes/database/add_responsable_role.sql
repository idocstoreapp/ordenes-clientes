-- ============================================
-- Agregar rol "responsable" a la restricción CHECK de users.role
-- ============================================
-- Este script actualiza la restricción CHECK para permitir el rol "responsable"
-- ============================================

-- 1. Eliminar la restricción CHECK existente
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Crear nueva restricción CHECK con "responsable" incluido
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'technician', 'encargado', 'recepcionista', 'responsable'));

-- 3. Verificar que la restricción se creó correctamente
SELECT 
  '=== RESTRICCIÓN ACTUALIZADA ===' as seccion;

SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
  AND tc.constraint_name = 'users_role_check';

-- 4. Verificar roles permitidos
SELECT 
  '=== ROLES PERMITIDOS ===' as seccion;

-- Esta consulta mostrará la definición de la restricción
SELECT 
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'users_role_check';
