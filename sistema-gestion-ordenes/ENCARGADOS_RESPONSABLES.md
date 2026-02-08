# 👤 Sistema de Encargados Responsables

## 📋 Descripción

Se ha agregado un nuevo campo obligatorio al formulario de creación de órdenes: **"Responsable de Recibir el Equipo"**. Este campo permite identificar quién recibió el equipo cuando la orden es creada desde una sucursal.

## ✅ Funcionalidad Implementada

### 1. Base de Datos
- ✅ Se agregó la columna `responsible_user_id` a la tabla `work_orders`
- ✅ Script SQL creado: `database/add_responsible_user_field.sql`

### 2. Gestión de Encargados
- ✅ Los administradores pueden crear usuarios con rol "Encargado" desde la página de Usuarios
- ✅ Los encargados deben ser asignados a una sucursal (obligatorio)
- ✅ Los encargados aparecen en el selector cuando se crea una orden desde su sucursal

### 3. Formulario de Órdenes
- ✅ Campo obligatorio "Responsable de Recibir el Equipo" aparece solo para sucursales
- ✅ Validación: No se puede crear la orden sin seleccionar un encargado
- ✅ Mensaje de error claro si falta el encargado

## 🚀 Pasos para Configurar

### Paso 1: Ejecutar Scripts SQL

**IMPORTANTE:** Ejecuta AMBOS scripts en orden:

1. **Script 1: Agregar columna responsible_user_id**
   - Ve a **Supabase Dashboard** → **SQL Editor**
   - Abre el archivo: `sistema-gestion-ordenes/database/add_responsible_user_field.sql`
   - Copia y ejecuta el contenido
   - Verifica que la columna se creó correctamente

2. **Script 2: Permitir que sucursales lean encargados (OBLIGATORIO)**
   - En el mismo **SQL Editor**
   - Abre el archivo: `sistema-gestion-ordenes/database/fix_users_select_for_branches.sql`
   - Copia y ejecuta el contenido
   - Este script permite que las sucursales puedan ver los encargados (necesario para el selector)

### Paso 2: Crear Encargados

1. Inicia sesión como **Administrador**
2. Ve a **Usuarios** en el menú
3. Haz clic en **"+ Nuevo Usuario"**
4. Completa el formulario:
   - **Nombre**: Nombre del encargado
   - **Email**: Email del encargado
   - **Contraseña**: Mínimo 6 caracteres
   - **Rol**: Selecciona **"Encargado"**
   - **Sucursal**: Selecciona la sucursal donde trabajará (obligatorio)
5. Haz clic en **"Crear Usuario"**

### Paso 3: Usar en Sucursales

1. Inicia sesión como **Sucursal**
2. Ve a crear una nueva orden
3. Completa todos los campos normalmente
4. **Antes de crear la orden**, verás el campo **"Responsable de Recibir el Equipo"**
5. Selecciona uno de los encargados asignados a tu sucursal
6. Si no seleccionas un encargado, verás un mensaje de error y no podrás crear la orden

## 📝 Notas Importantes

- ⚠️ **El campo es obligatorio**: No se puede crear una orden desde una sucursal sin seleccionar un encargado
- ✅ **Solo para sucursales**: El campo solo aparece cuando se crea una orden desde una sucursal
- ✅ **Filtrado automático**: Solo se muestran los encargados asignados a la sucursal actual
- ✅ **Sin encargados**: Si no hay encargados asignados, se muestra un mensaje indicando que el admin debe crearlos

## 🔍 Verificación

Para verificar que todo funciona:

1. **Crear un encargado:**
   ```sql
   -- Verificar que el encargado existe
   SELECT id, name, email, role, sucursal_id 
   FROM users 
   WHERE role = 'encargado';
   ```

2. **Verificar que la columna existe:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'work_orders' 
   AND column_name = 'responsible_user_id';
   ```

3. **Verificar órdenes con encargado:**
   ```sql
   SELECT order_number, responsible_user_id, 
          (SELECT name FROM users WHERE id = responsible_user_id) as encargado_name
   FROM work_orders 
   WHERE responsible_user_id IS NOT NULL;
   ```

## 🆘 Solución de Problemas

### "No hay encargados asignados a esta sucursal" (pero sí existen en la página de Usuarios)

**Causa:** Las políticas RLS están bloqueando la consulta porque las sucursales no tienen `auth.uid()`.

**Solución:**
1. Ejecuta el script: `database/fix_users_select_for_branches.sql`
2. Este script permite que las sucursales puedan leer usuarios con rol "encargado"
3. Recarga la página y vuelve a intentar crear una orden

**Verificación:**
- Abre la consola del navegador (F12)
- Deberías ver logs que muestran los encargados encontrados
- Si aún no aparecen, verifica que los encargados tengan el `sucursal_id` correcto en la página de Usuarios

### "No hay encargados asignados a esta sucursal" (realmente no hay encargados)
- **Solución**: El administrador debe crear encargados desde la página de Usuarios y asignarlos a la sucursal

### "Este campo es obligatorio para crear la orden"
- **Solución**: Selecciona un encargado del dropdown antes de crear la orden

### No puedo crear encargados
- **Verifica**: Que estés logueado como administrador
- **Verifica**: Que tengas configurado `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` en las variables de entorno
