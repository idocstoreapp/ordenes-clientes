-- ============================================
-- Script para agregar columnas faltantes a la tabla users
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script agrega las columnas: last_name, document_number, local

-- Agregar columnas nuevas a la tabla users (si no existen)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS local TEXT;

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'users' 
  AND column_name IN ('last_name', 'document_number', 'local')
ORDER BY column_name;

-- Si la consulta anterior muestra las 3 columnas, entonces todo está correcto
-- Si alguna columna falta, verifica los permisos o ejecuta manualmente:
-- ALTER TABLE users ADD COLUMN last_name TEXT;
-- ALTER TABLE users ADD COLUMN document_number TEXT;
-- ALTER TABLE users ADD COLUMN local TEXT;

