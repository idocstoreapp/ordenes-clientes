-- ============================================
-- Agregar campos adicionales a la tabla users
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columnas nuevas a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS local TEXT;

-- ============================================
-- Función para crear usuarios (solo para admins)
-- ============================================
-- Esta función permite a los administradores crear usuarios de forma segura

CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_document_number TEXT DEFAULT NULL,
  p_local TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'technician'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Solo los administradores pueden crear usuarios'
    );
  END IF;

  -- Verificar que el email no esté en uso
  IF EXISTS (
    SELECT 1 FROM users WHERE email = p_email
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'El correo electrónico ya está en uso'
    );
  END IF;

  -- Crear usuario en auth.users usando la extensión
  -- Nota: Esto requiere que tengas la extensión pgcrypto habilitada
  -- y permisos para insertar en auth.users
  
  -- Generar un UUID para el nuevo usuario
  v_user_id := gen_random_uuid();
  
  -- Insertar en auth.users (esto requiere permisos especiales)
  -- En producción, esto debería hacerse desde una función edge o usando el Admin API
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', p_name, 'last_name', p_last_name, 'document_number', p_document_number, 'local', p_local),
    false,
    'authenticated'
  );

  -- Insertar en la tabla users
  INSERT INTO users (
    id,
    role,
    name,
    last_name,
    document_number,
    email,
    local
  )
  VALUES (
    v_user_id,
    p_role::TEXT,
    p_name,
    p_last_name,
    p_document_number,
    p_email,
    p_local
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- La función anterior intenta crear usuarios directamente en auth.users,
-- pero esto puede no funcionar dependiendo de tus permisos de Supabase.
-- 
-- OPCIÓN RECOMENDADA: Usar Supabase Edge Functions o Admin API
-- 
-- Para una solución más robusta, crea una Edge Function en Supabase
-- que use el Admin Client con service_role key.
--
-- Alternativamente, puedes usar el componente que crea usuarios
-- usando el Admin Client desde el frontend (requiere service_role key
-- en variable de entorno, pero NO es recomendado por seguridad).

