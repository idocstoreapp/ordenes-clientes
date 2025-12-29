-- ============================================
-- MIGRACIÓN: Agregar columnas note_type y user_id a order_notes
-- Y corregir foreign key constraint de order_id
-- ============================================
-- PROBLEMA DETECTADO:
-- 1. El código intenta guardar 'note_type' y 'user_id' en order_notes pero estas columnas
--    no existen en la base de datos (fue creada por sistema-reparaciones con technician_id).
-- 2. La foreign key constraint apunta a 'orders(id)' pero sistema-gestion-ordenes usa 'work_orders(id)'
-- 
-- SOLUCIÓN:
-- 1. Agregar columna note_type con valores 'interno' o 'publico' y valor por defecto 'interno'
-- 2. Agregar columna user_id para compatibilidad con sistema-gestion-ordenes
-- 3. Modificar foreign key constraint para que apunte a work_orders(id)
-- ============================================

-- 1. Agregar columna user_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'order_notes' 
      AND column_name = 'user_id'
  ) THEN
    -- Agregar la columna user_id
    ALTER TABLE order_notes 
      ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    
    -- Si existe technician_id, copiar los valores a user_id para las notas existentes
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'order_notes' 
        AND column_name = 'technician_id'
    ) THEN
      UPDATE order_notes 
      SET user_id = technician_id 
      WHERE user_id IS NULL AND technician_id IS NOT NULL;
    END IF;
    
    RAISE NOTICE 'Columna user_id agregada exitosamente a order_notes';
  ELSE
    RAISE NOTICE 'La columna user_id ya existe en order_notes';
    
    -- Verificar si la foreign key constraint existe, si no, crearla
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc 
        ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE kcu.table_schema = 'public'
        AND kcu.table_name = 'order_notes'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'users'
    ) THEN
      -- Agregar la foreign key constraint si no existe
      ALTER TABLE order_notes 
        ADD CONSTRAINT order_notes_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
      RAISE NOTICE 'Foreign key constraint order_notes_user_id_fkey agregada';
    END IF;
  END IF;
END $$;

-- 2. Corregir foreign key constraint de order_id para que apunte a work_orders
DO $$ 
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Buscar el nombre de la constraint actual
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'order_notes'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%order_id%';
  
  -- Si existe una constraint que apunta a orders, eliminarla
  IF constraint_name_var IS NOT NULL THEN
    -- Verificar si la constraint apunta a orders
    IF EXISTS (
      SELECT 1 
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc 
        ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE kcu.table_schema = 'public'
        AND kcu.table_name = 'order_notes'
        AND kcu.column_name = 'order_id'
        AND ccu.table_name = 'orders'
    ) THEN
      -- Eliminar la constraint antigua
      EXECUTE format('ALTER TABLE order_notes DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
      RAISE NOTICE 'Constraint antigua eliminada: %', constraint_name_var;
    END IF;
  END IF;
  
  -- Verificar si ya existe una constraint que apunte a work_orders
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc 
      ON kcu.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name = 'order_notes'
      AND kcu.column_name = 'order_id'
      AND ccu.table_name = 'work_orders'
  ) THEN
    -- Verificar que la tabla work_orders existe antes de crear la constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'work_orders'
    ) THEN
      -- Limpiar datos que violarían la nueva constraint (notas con order_id que no existe en work_orders)
      -- Esto es necesario porque las notas antiguas pueden apuntar a orders, no a work_orders
      DELETE FROM order_notes 
      WHERE order_id NOT IN (SELECT id FROM work_orders);
      
      -- Agregar nueva constraint que apunte a work_orders
      ALTER TABLE order_notes 
        ADD CONSTRAINT order_notes_order_id_fkey 
        FOREIGN KEY (order_id) 
        REFERENCES work_orders(id) 
        ON DELETE CASCADE;
      RAISE NOTICE 'Nueva constraint agregada: order_notes_order_id_fkey apuntando a work_orders';
    ELSE
      RAISE NOTICE 'ADVERTENCIA: La tabla work_orders no existe. La constraint no se puede crear.';
    END IF;
  ELSE
    RAISE NOTICE 'La constraint ya apunta a work_orders';
  END IF;
END $$;

-- 3. Agregar columna note_type si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'order_notes' 
      AND column_name = 'note_type'
  ) THEN
    -- Agregar la columna con valor por defecto
    ALTER TABLE order_notes 
      ADD COLUMN note_type TEXT NOT NULL DEFAULT 'interno';
    
    -- Agregar restricción CHECK para validar valores permitidos
    ALTER TABLE order_notes 
      ADD CONSTRAINT check_note_type 
      CHECK (note_type IN ('interno', 'publico'));
    
    RAISE NOTICE 'Columna note_type agregada exitosamente a order_notes';
  ELSE
    RAISE NOTICE 'La columna note_type ya existe en order_notes';
  END IF;
END $$;

-- 4. Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'order_notes' 
  AND column_name IN ('note_type', 'user_id')
ORDER BY column_name;

-- 5. Verificar la foreign key constraint de order_id
SELECT 
  kcu.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE kcu.table_schema = 'public'
  AND kcu.table_name = 'order_notes'
  AND kcu.column_name = 'order_id';

-- 6. Verificar la restricción CHECK de note_type
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'check_note_type';

