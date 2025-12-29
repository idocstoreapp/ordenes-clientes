-- ============================================
-- Script para Crear Usuarios de Desarrollo
-- ============================================
-- IMPORTANTE: Este script NO crea usuarios en Authentication
-- Primero debes crear los usuarios en Authentication, luego ejecutar este script
-- ============================================

-- PASO 1: Crear usuarios en Authentication (desde Supabase Dashboard)
-- 1. Ve a Authentication → Users → Add user → Create new user
-- 2. Crea estos usuarios:
--    - admin@test.com / admin123 (marca "Auto Confirm User")
--    - tecnico@test.com / tecnico123 (marca "Auto Confirm User")
--    - encargado@test.com / encargado123 (marca "Auto Confirm User")
-- 3. Copia los UIDs de cada usuario

-- PASO 2: Reemplaza los UIDs abajo con los reales y ejecuta este script

-- ============================================
-- Obtener IDs de sucursales disponibles
-- ============================================
-- Ejecuta esto primero para ver las sucursales disponibles:
SELECT id, name FROM branches ORDER BY name;

-- ============================================
-- Crear Usuario Administrador
-- ============================================
-- Reemplaza 'TU_ADMIN_UID_AQUI' con el UID real del usuario admin en Authentication
INSERT INTO users (id, role, name, email, local)
VALUES (
  'TU_ADMIN_UID_AQUI',  -- ⚠️ REEMPLAZA con el UID real de Authentication
  'admin',
  'Administrador',
  'admin@test.com',
  'Sucursal Principal'
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  local = EXCLUDED.local;

-- ============================================
-- Crear Usuario Técnico
-- ============================================
-- Reemplaza 'TU_TECNICO_UID_AQUI' con el UID real del usuario técnico en Authentication
-- También reemplaza 'SUCURSAL_ID_AQUI' con el ID de una sucursal (de la consulta anterior)
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'TU_TECNICO_UID_AQUI',  -- ⚠️ REEMPLAZA con el UID real
  'technician',
  'Técnico de Prueba',
  'tecnico@test.com',
  'Sucursal Principal',
  (SELECT id FROM branches ORDER BY name LIMIT 1)  -- Usa la primera sucursal
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  local = EXCLUDED.local,
  sucursal_id = EXCLUDED.sucursal_id;

-- ============================================
-- Crear Usuario Encargado
-- ============================================
-- Reemplaza 'TU_ENCARGADO_UID_AQUI' con el UID real del usuario encargado en Authentication
INSERT INTO users (id, role, name, email, local, sucursal_id)
VALUES (
  'TU_ENCARGADO_UID_AQUI',  -- ⚠️ REEMPLAZA con el UID real
  'encargado',
  'Encargado de Prueba',
  'encargado@test.com',
  'Sucursal Principal',
  (SELECT id FROM branches ORDER BY name LIMIT 1)  -- Usa la primera sucursal
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  local = EXCLUDED.local,
  sucursal_id = EXCLUDED.sucursal_id;

-- ============================================
-- Verificar que se crearon correctamente
-- ============================================
SELECT 
  id,
  role,
  name,
  email,
  local,
  sucursal_id,
  (SELECT name FROM branches WHERE id = users.sucursal_id) as sucursal_name
FROM users
WHERE email IN ('admin@test.com', 'tecnico@test.com', 'encargado@test.com')
ORDER BY role;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Los usuarios deben existir PRIMERO en Authentication
-- 2. El ID en la tabla users DEBE ser exactamente igual al UID de Authentication
-- 3. Si el usuario ya existe, el script lo actualizará (ON CONFLICT)
-- 4. Las contraseñas se configuran en Authentication, no aquí
-- 5. Para iniciar sesión, usa el email y password configurados en Authentication








