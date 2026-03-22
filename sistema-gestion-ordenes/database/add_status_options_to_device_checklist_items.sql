-- ============================================
-- Agregar estados personalizados por item de checklist
-- ============================================
-- Este cambio es aditivo y no rompe datos existentes.
-- Permite que cada item de device_checklist_items tenga
-- sus propios estados permitidos (ej: "entregado", "no_entregado").

ALTER TABLE device_checklist_items
ADD COLUMN IF NOT EXISTS status_options JSONB;

-- Validación básica: si existe, debe ser un arreglo JSON
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'device_checklist_items_status_options_is_array'
  ) THEN
    ALTER TABLE device_checklist_items
    ADD CONSTRAINT device_checklist_items_status_options_is_array
    CHECK (
      status_options IS NULL
      OR jsonb_typeof(status_options) = 'array'
    );
  END IF;
END $$;

COMMENT ON COLUMN device_checklist_items.status_options IS
'Estados permitidos para este item de checklist. Si es NULL, se usan estados por defecto (ok,damaged,replaced,no_probado).';

-- Ejemplo opcional:
-- UPDATE device_checklist_items
-- SET status_options = '["entregado","no_entregado"]'::jsonb
-- WHERE device_type = 'samsung' AND item_name = 'Sim Card / Micro SD';
