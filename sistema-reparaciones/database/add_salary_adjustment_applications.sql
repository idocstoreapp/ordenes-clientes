-- Tabla para registrar aplicaciones parciales de ajustes de sueldo
CREATE TABLE IF NOT EXISTS salary_adjustment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES salary_adjustments(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applied_amount NUMERIC NOT NULL CHECK (applied_amount >= 0),
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_salary_adj_app_adjustment ON salary_adjustment_applications(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_salary_adj_app_technician ON salary_adjustment_applications(technician_id);
CREATE INDEX IF NOT EXISTS idx_salary_adj_app_week ON salary_adjustment_applications(week_start);

ALTER TABLE salary_adjustment_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'salary_adj_app_select_own_or_admin'
      AND tablename = 'salary_adjustment_applications'
  ) THEN
    CREATE POLICY "salary_adj_app_select_own_or_admin"
      ON salary_adjustment_applications FOR SELECT
      USING (
        technician_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role = 'admin'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'salary_adj_app_insert_admin_or_self'
      AND tablename = 'salary_adjustment_applications'
  ) THEN
    CREATE POLICY "salary_adj_app_insert_admin_or_self"
      ON salary_adjustment_applications FOR INSERT
      WITH CHECK (
        technician_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role = 'admin'
        )
      );
  END IF;
END
$$;

