-- ============================================
-- Corregir INSERT de servicios para sucursales (caso: falla solo para algunos usuarios)
-- ============================================
-- Síntoma:
-- - Algunos usuarios de sucursal pueden crear servicios y otros no.
-- - Error típico: "new row violates row-level security policy for table services".
--
-- Causa habitual:
-- - Política actual permite solo admin o auth.uid() IS NULL.
-- - Usuarios de sucursal autenticados (auth.uid() con sesión válida) quedan bloqueados.
--
-- Solución:
-- - Permitir INSERT a:
--   1) Admins autenticados
--   2) Usuarios internos de sucursal (encargado/recepcionista/technician) con sucursal asignada
--   3) Sucursales "legacy" no-auth (auth.uid() IS NULL)

CREATE OR REPLACE FUNCTION public.can_manage_services()
RETURNS BOOLEAN AS $$
BEGIN
  -- flujo legacy (sucursal sin auth.users)
  IF auth.uid() IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'admin'
        OR (
          u.sucursal_id IS NOT NULL
          AND u.role IN ('encargado', 'recepcionista', 'technician')
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_insert_admin" ON services;
DROP POLICY IF EXISTS "services_insert_admin_or_branch" ON services;

CREATE POLICY "services_insert_admin_or_branch_users" ON services
FOR INSERT
WITH CHECK (public.can_manage_services());

-- Opcional: verificar políticas activas
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'services';
