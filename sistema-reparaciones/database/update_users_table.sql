-- ============================================
-- Actualizar tabla users con campos adicionales
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columnas nuevas a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS local TEXT;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('last_name', 'document_number', 'local');

