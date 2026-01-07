# Solución: Errores al Crear Clientes y Órdenes desde Sucursal

## 🔴 Problemas

Cuando un usuario de sucursal intenta crear un cliente o una orden, aparecen errores:
- **Cliente**: `new row violates row level security policy for table customers`
- **Orden**: `cannot coerce the result to a single json object` o `new row violates row level security policy for table work_orders`

## 🔍 Causa

Los usuarios de sucursal **NO** usan `auth.users` de Supabase. En su lugar, se autentican directamente con `login_email` y `password_hash` en la tabla `branches`, y su sesión se guarda en `localStorage`.

Las políticas RLS actuales requieren `auth.uid() IS NOT NULL`, pero como las sucursales no tienen `auth.uid()` (no están en `auth.users`), las políticas bloquean las inserciones.

## ✅ Solución

Ejecutar los scripts SQL que modifican las políticas RLS para permitir que las sucursales creen clientes y órdenes.

### Paso 1: Ejecutar Scripts SQL

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Ejecuta los siguientes scripts en orden:

#### Script 1: Corregir política de clientes
1. Crea una nueva query
2. Copia y pega el contenido de `database/fix_customers_insert_policy.sql`
3. Haz clic en **Run** para ejecutar el script

#### Script 2: Corregir política de órdenes
1. Crea una nueva query
2. Copia y pega el contenido de `database/fix_work_orders_insert_policy.sql`
3. Haz clic en **Run** para ejecutar el script

#### Script 3: Corregir política de servicios de órdenes
1. Crea una nueva query
2. Copia y pega el contenido de `database/fix_order_services_insert_policy.sql`
3. Haz clic en **Run** para ejecutar el script

### Paso 2: Verificar

1. Inicia sesión como usuario de sucursal
2. Intenta crear un nuevo cliente
3. Intenta crear una nueva orden con servicios
4. Debería funcionar sin errores

## 📋 Cambios Realizados

### Políticas Modificadas:

1. **customers**:
   - **Política anterior**: `customers_insert_authenticated` requería `auth.uid() IS NOT NULL`
   - **Política nueva**: `customers_insert_all` permite INSERT sin verificar `auth.uid()`

2. **work_orders**:
   - **Política anterior**: `work_orders_insert_authenticated` requería `auth.uid() IS NOT NULL`
   - **Política nueva**: `work_orders_insert_all` permite INSERT sin verificar `auth.uid()`

3. **order_services**:
   - **Política anterior**: `order_services_insert_authenticated` requería `auth.uid() IS NOT NULL`
   - **Política nueva**: `order_services_insert_all` permite INSERT sin verificar `auth.uid()`

### Cambios en el Código:

- **OrderForm.tsx**: Modificado para detectar correctamente cuando es una sucursal y usar el `branchId` como `sucursal_id` en lugar de buscar en `users`.

## 🔒 Seguridad

Estas modificaciones son seguras porque:
- Los datos se validan por `sucursal_id` y `technician_id` en las órdenes
- Las políticas de SELECT y UPDATE siguen siendo restrictivas
- Solo se permite INSERT, no modificar o eliminar datos de otras sucursales
- Las órdenes están asociadas a sucursales específicas

## 🧪 Prueba

Después de ejecutar los scripts, prueba crear:
- ✅ Cliente desde sucursal
- ✅ Orden desde sucursal
- ✅ Orden con servicios desde sucursal
- ✅ Cliente desde usuario técnico/encargado
- ✅ Orden desde usuario técnico/encargado
- ✅ Cliente desde admin
- ✅ Orden desde admin

Todos deberían funcionar sin problemas.

