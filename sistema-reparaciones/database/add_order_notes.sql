-- Crea tabla de notas por orden y políticas RLS para técnicos y admins

CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);

ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'order_notes_select_own_or_admin'
      AND tablename = 'order_notes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "order_notes_select_own_or_admin"
        ON order_notes FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_notes.order_id
              AND o.technician_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
          )
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'order_notes_insert_own_or_admin'
      AND tablename = 'order_notes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "order_notes_insert_own_or_admin"
        ON order_notes FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_notes.order_id
              AND o.technician_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
          )
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'order_notes_update_admin'
      AND tablename = 'order_notes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "order_notes_update_admin"
        ON order_notes FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
          )
        );
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'order_notes_delete_admin'
      AND tablename = 'order_notes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "order_notes_delete_admin"
        ON order_notes FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
          )
        );
    $policy$;
  END IF;
END
$$;

