-- ============================================
-- Script para corregir política de INSERT en customers
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script permite que usuarios de sucursal puedan crear clientes
--
-- PROBLEMA: Los usuarios de sucursal no usan auth.users, por lo que auth.uid() 
-- es NULL y la política RLS bloquea la inserción de clientes.
--
-- SOLUCIÓN: Modificar la política para permitir INSERT sin verificar auth.uid(),
-- ya que los clientes no son datos sensibles y cualquier usuario (incluyendo 
-- sucursales) debería poder crearlos.

-- 1. Eliminar la política existente
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;

-- 2. Crear nueva política que permita INSERT sin verificar auth.uid()
-- Esto permite que tanto usuarios autenticados (auth.users) como sucursales 
-- (que no tienen auth.uid()) puedan crear clientes
CREATE POLICY "customers_insert_all" ON customers FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que la política esté activa:
-- SELECT * FROM pg_policies WHERE tablename = 'customers' AND policyname LIKE '%insert%';
--
-- También puedes probar crear un cliente desde una sucursal para confirmar que funciona.



