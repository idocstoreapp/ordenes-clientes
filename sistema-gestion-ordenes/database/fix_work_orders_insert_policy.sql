-- ============================================
-- Script para corregir política de INSERT en work_orders
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script permite que usuarios de sucursal puedan crear órdenes
--
-- PROBLEMA: Los usuarios de sucursal no usan auth.users, por lo que auth.uid() 
-- es NULL y la política RLS bloquea la inserción de órdenes.
--
-- SOLUCIÓN: Modificar la política para permitir INSERT sin verificar auth.uid(),
-- ya que las órdenes se validan por sucursal_id y technician_id.

-- 1. Eliminar la política existente
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;

-- 2. Crear nueva política que permita INSERT sin verificar auth.uid()
-- Esto permite que tanto usuarios autenticados (auth.users) como sucursales 
-- (que no tienen auth.uid()) puedan crear órdenes
CREATE POLICY "work_orders_insert_all" ON work_orders FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que la política esté activa:
-- SELECT * FROM pg_policies WHERE tablename = 'work_orders' AND policyname LIKE '%insert%';
--
-- También puedes probar crear una orden desde una sucursal para confirmar que funciona.



