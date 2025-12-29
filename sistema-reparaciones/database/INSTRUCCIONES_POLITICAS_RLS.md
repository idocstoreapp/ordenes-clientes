# Instrucciones para Corregir Políticas RLS de Administradores

## 🔴 Problema Identificado

Los administradores no pueden:
- ✅ Crear, editar o eliminar usuarios
- ✅ Eliminar órdenes de reparación
- ✅ Gestionar reportes administrativos (eliminar órdenes)

Esto se debe a que faltan políticas RLS (Row Level Security) para estas operaciones.

## ✅ Solución

Se han creado dos scripts SQL para solucionar este problema:

### Opción 1: Script Completo (Recomendado)
**Archivo:** `fix_rls_policies.sql`

Este script:
- Elimina todas las políticas existentes
- Crea la función `is_admin()` (si no existe)
- Crea todas las políticas necesarias desde cero

**Cuándo usar:** Si quieres empezar desde cero o si tienes problemas con políticas existentes.

### Opción 2: Script Incremental
**Archivo:** `fix_admin_policies.sql`

Este script:
- Solo agrega las políticas faltantes
- No elimina políticas existentes
- Es más seguro si ya tienes políticas funcionando

**Cuándo usar:** Si solo quieres agregar las políticas faltantes sin tocar las existentes.

## 📋 Pasos para Aplicar la Solución

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**

### Paso 2: Ejecutar el Script

**Opción A - Script Completo:**
```sql
-- Copia y pega el contenido completo de database/fix_rls_policies.sql
```

**Opción B - Script Incremental (Recomendado si ya tienes políticas):**
```sql
-- Copia y pega el contenido completo de database/fix_admin_policies.sql
```

### Paso 3: Verificar la Ejecución

Después de ejecutar el script, deberías ver un mensaje de éxito. Para verificar que las políticas se crearon correctamente, ejecuta esta consulta:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('users', 'orders', 'order_notes', 'salary_adjustments')
  AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;
```

Deberías ver políticas como:
- `users_insert_admin`
- `users_update_admin`
- `users_delete_admin`
- `orders_delete_admin`
- `orders_insert_admin`
- `salary_adjustments_insert_admin`
- `salary_adjustments_update_admin`
- `salary_adjustments_delete_admin`

### Paso 4: Probar en la Aplicación

1. Inicia sesión como administrador
2. Intenta crear un nuevo usuario → Debería funcionar ✅
3. Intenta editar un usuario → Debería funcionar ✅
4. Intenta eliminar una orden en Reportes Administrativos → Debería funcionar ✅
5. Intenta eliminar una orden en la lista de órdenes → Debería funcionar ✅

## 🔍 Verificación de Problemas

Si después de ejecutar el script sigues teniendo problemas:

### 1. Verificar que RLS está habilitado
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'orders', 'order_notes', 'salary_adjustments');
```

Todas las tablas deben tener `rowsecurity = true`.

### 2. Verificar que la función is_admin() existe
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';
```

### 3. Verificar que el usuario actual es admin
```sql
SELECT id, role, name, email 
FROM users 
WHERE id = auth.uid();
```

El campo `role` debe ser `'admin'`.

### 4. Ver todas las políticas activas
```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'orders', 'order_notes', 'salary_adjustments')
ORDER BY tablename, policyname;
```

## 📝 Notas Importantes

1. **Backup:** Aunque estos scripts son seguros, siempre es recomendable hacer un backup de tu base de datos antes de ejecutar scripts SQL.

2. **Orden de Ejecución:** Si ejecutas `fix_rls_policies.sql`, no necesitas ejecutar `fix_admin_policies.sql` después, ya que el primero incluye todo.

3. **Tabla order_notes:** Si la tabla `order_notes` no existe en tu base de datos, el script `fix_admin_policies.sql` la omitirá automáticamente sin causar errores.

4. **Permisos:** Asegúrate de estar ejecutando estos scripts con un usuario que tenga permisos suficientes (generalmente el usuario de servicio o un superusuario).

## 🆘 Soporte

Si después de seguir estos pasos sigues teniendo problemas:

1. Verifica los logs de error en la consola del navegador (F12)
2. Revisa los logs de Supabase en el dashboard
3. Verifica que el usuario tiene el rol `admin` en la tabla `users`
4. Asegúrate de que el `service_role` key está configurado correctamente en `.env.local`

