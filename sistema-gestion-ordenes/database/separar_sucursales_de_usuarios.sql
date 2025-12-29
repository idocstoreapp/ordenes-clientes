-- Script para separar completamente las sucursales de los usuarios
-- Las sucursales tendrán su propio sistema de autenticación independiente

-- ============================================
-- 1. Agregar columnas de autenticación a branches
-- ============================================

DO $$ 
BEGIN
  -- Agregar login_email si no existe (email para login de la sucursal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='login_email') THEN
    ALTER TABLE branches ADD COLUMN login_email TEXT UNIQUE;
  END IF;
  
  -- Agregar password_hash si no existe (hash de la contraseña para login)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='password_hash') THEN
    ALTER TABLE branches ADD COLUMN password_hash TEXT;
  END IF;
  
  -- Agregar is_active si no existe (para activar/desactivar login de sucursal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='is_active') THEN
    ALTER TABLE branches ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 2. Eliminar relación entre users y branches para sucursales
-- ============================================
-- NOTA: No eliminamos la columna sucursal_id de users porque los técnicos/encargados
-- pueden seguir teniendo una sucursal asignada. Solo eliminamos la lógica que crea
-- usuarios en auth.users para las sucursales.

-- ============================================
-- 3. Crear función para hashear contraseñas (usando bcrypt)
-- ============================================
-- Nota: Supabase usa bcrypt automáticamente en auth.users, pero para branches
-- necesitamos usar una función similar o almacenar el hash directamente.

-- Función helper para verificar contraseña (se usará en el código de la aplicación)
-- La contraseña se hasheará usando bcrypt en el código antes de guardarla

-- ============================================
-- 4. Comentarios importantes
-- ============================================
-- - Las sucursales ahora tienen login_email y password_hash directamente en branches
-- - No se crean usuarios en auth.users para sucursales
-- - Los técnicos/encargados siguen usando auth.users y pueden tener sucursal_id
-- - El login debe verificar primero si es un usuario normal o una sucursal

