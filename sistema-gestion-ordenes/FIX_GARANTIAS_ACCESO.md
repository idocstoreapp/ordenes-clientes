# Corregir Acceso a Políticas de Garantía

## Problema
Las políticas de garantía solo se mostraban en los PDFs cuando se veían desde el admin. Las sucursales no podían ver las garantías porque la política RLS de `system_settings` solo permitía lectura a usuarios con rol 'admin'.

## Solución
Se actualizó la política RLS para permitir que todos los usuarios autenticados puedan **leer** las configuraciones del sistema (especialmente las garantías), pero solo los admins pueden **modificar** las configuraciones.

## Instrucciones

1. **Ejecutar el script SQL**:
   ```sql
   -- Desde el SQL Editor de Supabase
   -- O ejecutar el archivo: database/fix_warranty_policies_access.sql
   ```

2. **O ejecutar directamente**:
   ```sql
   DROP POLICY IF EXISTS "settings_select_admin" ON system_settings;
   CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT 
     USING (auth.uid() IS NOT NULL);
   ```

3. **Verificar que funciona**:
   - Iniciar sesión como sucursal
   - Generar un PDF de una orden
   - Verificar que las garantías se muestren correctamente

## Archivos modificados

- `database/create_settings_table.sql` - Actualizado para usar la nueva política
- `database/fix_warranty_policies_access.sql` - Script para aplicar el fix

## Nota
Las políticas de INSERT y UPDATE se mantienen solo para admins, por lo que solo los administradores pueden modificar las garantías, pero todos los usuarios autenticados pueden leerlas para mostrarlas en los PDFs.






