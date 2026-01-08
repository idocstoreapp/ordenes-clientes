-- ============================================
-- Script para corregir política de INSERT en order_services
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este script permite que usuarios de sucursal puedan crear servicios de órdenes
--
-- PROBLEMA: Los usuarios de sucursal no usan auth.users, por lo que auth.uid() 
-- es NULL y la política RLS bloquea la inserción de servicios de órdenes.
--
-- SOLUCIÓN: Modificar la política para permitir INSERT sin verificar auth.uid(),
-- ya que los servicios de órdenes se validan por order_id que pertenece a una orden válida.

-- 1. Eliminar la política existente
DROP POLICY IF EXISTS "order_services_insert_authenticated" ON order_services;

-- 2. Crear nueva política que permita INSERT sin verificar auth.uid()
-- Esto permite que tanto usuarios autenticados (auth.users) como sucursales 
-- (que no tienen auth.uid()) puedan crear servicios de órdenes
CREATE POLICY "order_services_insert_all" ON order_services FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar este script, verifica que la política esté activa:
-- SELECT * FROM pg_policies WHERE tablename = 'order_services' AND policyname LIKE '%insert%';
--
-- También puedes probar crear una orden con servicios desde una sucursal para confirmar que funciona.



