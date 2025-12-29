-- ============================================
-- FIX COMPLETO: Políticas RLS para tabla users
-- ============================================
-- Este script corrige todas las políticas RLS para la tabla users
-- asegurando que:
-- 1. Los usuarios puedan ver su propio perfil
-- 2. Los admins puedan ver todos los usuarios
-- 3. Los encargados puedan ver técnicos de su sucursal
-- ============================================

-- 1. Eliminar TODAS las políticas existentes para users (evitar conflictos)
DROP POLICY IF EXISTS "users_select_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_select_technicians_same_branch_encargado" ON users;
DROP POLICY IF EXISTS "users_select_all_if_admin_or_own_branch_if_encargado" ON users;

-- 2. Crear función helper para verificar si el usuario es admin
-- Esta función usa SECURITY DEFINER para leer la tabla sin pasar por RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear función helper para obtener la sucursal del usuario actual
-- Esta función usa SECURITY DEFINER para evitar recursión
CREATE OR REPLACE FUNCTION get_current_user_sucursal_id()
RETURNS UUID AS $$
DECLARE
  user_sucursal_id UUID;
BEGIN
  SELECT sucursal_id INTO user_sucursal_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'encargado';
  
  RETURN user_sucursal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear función helper para verificar si el usuario es encargado
CREATE OR REPLACE FUNCTION is_encargado()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role = 'encargado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Política 1: Los usuarios pueden ver su propio perfil (MÁS IMPORTANTE - debe estar primero)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 6. Política 2: Los admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin"
  ON users FOR SELECT
  USING (is_admin());

-- 7. Política 3: Los encargados pueden ver técnicos de su sucursal
-- Usa la función helper para evitar recursión
CREATE POLICY "users_select_technicians_same_branch_encargado"
  ON users FOR SELECT
  USING (
    is_encargado()
    AND get_current_user_sucursal_id() IS NOT NULL
    AND users.role = 'technician'
    AND users.sucursal_id = get_current_user_sucursal_id()
  );

-- 8. Verificar que las políticas se crearon correctamente
SELECT 
  '=== POLÍTICAS CREADAS ===' as seccion;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 9. Verificar funciones creadas
SELECT 
  '=== FUNCIONES CREADAS ===' as seccion;

SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname IN ('is_admin', 'is_encargado', 'get_current_user_sucursal_id')
ORDER BY proname;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. El orden de las políticas es importante
-- 2. La política "users_select_own" debe estar primero para que los usuarios puedan ver su perfil
-- 3. Las funciones helper usan SECURITY DEFINER para evitar recursión en RLS
-- 4. Si un usuario no puede iniciar sesión, verifica que exista en la tabla users con el mismo ID de auth.uid()







