-- Agrega columna para controlar desde cuándo se debe aplicar cada ajuste
ALTER TABLE salary_adjustments
  ADD COLUMN IF NOT EXISTS available_from DATE DEFAULT CURRENT_DATE;

-- Normaliza registros existentes para que la fecha coincida con la creación original
UPDATE salary_adjustments
SET available_from = COALESCE(available_from, created_at::date);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_available_from
  ON salary_adjustments(technician_id, available_from);

