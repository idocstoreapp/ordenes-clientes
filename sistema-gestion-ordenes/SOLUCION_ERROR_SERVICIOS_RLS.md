# 🔧 Solución: Error al Agregar Servicio - RLS Policy

## ⚠️ Problema

Al intentar crear un nuevo servicio desde la configuración como administrador o desde una sucursal al crear una orden, aparece el error:

```
Error al agregar servicio: new row violates row-level security policy for table "services"
```

## 🔍 Causa

El problema se debe a que:

1. **La política RLS de INSERT** para la tabla `services` puede tener problemas de recursión al consultar la tabla `users` (que también tiene RLS habilitado)
2. **Faltan políticas UPDATE y DELETE** para la tabla `services`, lo que puede causar problemas al editar o eliminar servicios
3. **Las sucursales no pueden crear servicios** porque no tienen `auth.uid()` (es NULL) y la política solo permitía a admins

## ✅ Solución

Ejecuta el script SQL que corrige las políticas RLS de la tabla `services`.

### Paso 1: Abrir SQL Editor en Supabase

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **SQL Editor** (menú lateral izquierdo)
3. Haz clic en **"New query"**

### Paso 2: Ejecutar el Script

1. Abre el archivo: `sistema-gestion-ordenes/database/fix_services_rls_policies.sql`
2. Copia todo el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona `F5`)

### Paso 3: Verificar que Funcionó

Ejecuta esta consulta para verificar que las políticas estén correctamente configuradas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'services';
```

Deberías ver **4 políticas**:
- ✅ `services_select_all` (SELECT - todos pueden leer)
- ✅ `services_insert_admin_or_branch` (INSERT - admins y sucursales)
- ✅ `services_update_admin` (UPDATE - solo admins)
- ✅ `services_delete_admin` (DELETE - solo admins)

### Paso 4: Probar en la Aplicación

**Como Administrador:**
1. Recarga la página de configuración en tu aplicación
2. Intenta crear un nuevo servicio desde Configuración → Servicios
3. Debería funcionar sin errores ✅

**Como Sucursal:**
1. Inicia sesión como sucursal
2. Ve a crear una nueva orden
3. Intenta agregar un servicio nuevo cuando no existe en la lista
4. Debería permitir crear el servicio sin errores ✅

## 📋 ¿Qué hace el script?

El script:

1. **Crea una función `is_admin()`** con `SECURITY DEFINER` que evita problemas de recursión al leer la tabla `users`
2. **Actualiza la política INSERT** para permitir:
   - **Admins**: usando la función `is_admin()`
   - **Sucursales**: cuando `auth.uid() IS NULL` (las sucursales no usan `auth.users`)
3. **Agrega políticas UPDATE y DELETE** que faltaban para permitir a los admins editar y eliminar servicios

## ✅ Permisos después del script

- **Admins**: Pueden crear, editar y eliminar servicios ✅
- **Sucursales**: Pueden crear servicios (necesario al crear órdenes) ✅
- **Otros usuarios**: Solo pueden leer servicios (SELECT) ✅

## 🔍 Verificar que Eres Admin

Si después de ejecutar el script sigues teniendo problemas, verifica que tu usuario sea admin:

```sql
SELECT id, email, name, role 
FROM users 
WHERE id = auth.uid();
```

Deberías ver una fila con `role = 'admin'`.

## 🆘 Si Aún No Funciona

1. **Verifica que estés autenticado:**
   - Cierra sesión y vuelve a iniciar sesión
   - Verifica que tu sesión esté activa

2. **Verifica que el RLS esté habilitado:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'services';
   ```
   `rowsecurity` debería ser `true`

3. **Verifica las políticas activas:**
   ```sql
   SELECT policyname, cmd, qual, with_check 
   FROM pg_policies 
   WHERE tablename = 'services';
   ```

4. **Revisa los logs de Supabase:**
   - Ve a **Logs** → **Postgres Logs** en Supabase Dashboard
   - Busca errores relacionados con RLS o la tabla `services`
