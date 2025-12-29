-- ============================================
-- FIX: Permitir a encargados ver técnicos de su sucursal
-- ============================================
-- Este script agrega una política RLS que permite a los encargados
-- ver los técnicos que pertenecen a su misma sucursal.
-- ============================================

-- 1. Eliminar política si existe (para evitar duplicados)
DROP POLICY IF EXISTS "users_select_technicians_same_branch_encargado" ON users;

-- 2. Crear política para que encargados puedan ver técnicos de su sucursal
CREATE POLICY "users_select_technicians_same_branch_encargado"
  ON users FOR SELECT
  USING (
    -- Permitir si el usuario actual es un encargado
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'encargado'
      AND u.sucursal_id IS NOT NULL
      -- Y el usuario que se está consultando es un técnico de la misma sucursal
      AND users.role = 'technician'
      AND users.sucursal_id = u.sucursal_id
    )
  );

-- 3. Verificar que la política se creó correctamente
SELECT 
  '=== POLÍTICA CREADA ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
  AND policyname = 'users_select_technicians_same_branch_encargado';

-- 4. Verificar usuarios encargados y sus sucursales
SELECT 
  '=== ENCARGADOS Y SUS SUCURSALES ===' as seccion;

SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.sucursal_id,
  b.name as sucursal_name
FROM users u
LEFT JOIN branches b ON u.sucursal_id = b.id
WHERE u.role = 'encargado';

-- 5. Verificar técnicos por sucursal
SELECT 
  '=== TÉCNICOS POR SUCURSAL ===' as seccion;

SELECT 
  b.name as sucursal_name,
  COUNT(u.id) as cantidad_tecnicos,
  STRING_AGG(u.name, ', ') as nombres_tecnicos
FROM branches b
LEFT JOIN users u ON u.sucursal_id = b.id AND u.role = 'technician'
GROUP BY b.id, b.name
ORDER BY b.name;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Esta política permite que un encargado vea técnicos de su misma sucursal
-- 2. Los encargados también pueden verse a sí mismos (por la política users_select_own)
-- 3. Los admins pueden ver todos los usuarios (por la política users_select_admin)
-- 4. Si un encargado no tiene sucursal_id asignado, no podrá ver técnicos
-- 5. Si un técnico no tiene sucursal_id asignado, no será visible para encargados

