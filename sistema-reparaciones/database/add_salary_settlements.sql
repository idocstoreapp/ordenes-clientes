-- Tabla para registrar liquidaciones de sueldo por semana
CREATE TABLE IF NOT EXISTS salary_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  context TEXT DEFAULT 'technician',
  payment_method TEXT CHECK (payment_method IN ('efectivo','transferencia','otro')) DEFAULT 'efectivo',
  details JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE salary_settlements
  ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE salary_settlements
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('efectivo','transferencia','otro')) DEFAULT 'efectivo';

CREATE INDEX IF NOT EXISTS idx_salary_settlements_technician ON salary_settlements(technician_id, week_start);

ALTER TABLE salary_settlements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'salary_settlements_select_own_or_admin'
      AND tablename = 'salary_settlements'
  ) THEN
    CREATE POLICY "salary_settlements_select_own_or_admin"
      ON salary_settlements FOR SELECT
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
    WHERE policyname = 'salary_settlements_insert_admin_or_self'
      AND tablename = 'salary_settlements'
  ) THEN
    CREATE POLICY "salary_settlements_insert_admin_or_self"
      ON salary_settlements FOR INSERT
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

