-- Políticas para permitir que admins y técnicos gestionen proveedores

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'suppliers_insert_admin_or_tech'
      AND tablename = 'suppliers'
  ) THEN
    CREATE POLICY "suppliers_insert_admin_or_tech"
      ON suppliers
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'technician')
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'suppliers_delete_admin'
      AND tablename = 'suppliers'
  ) THEN
    CREATE POLICY "suppliers_delete_admin"
      ON suppliers
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
      );
  END IF;
END
$$;

