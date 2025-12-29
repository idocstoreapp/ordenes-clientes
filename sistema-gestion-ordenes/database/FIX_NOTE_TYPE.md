# 🔧 Solución: Error al guardar nota - Columnas note_type y user_id faltantes

## ❌ Errores
```
Error al guardar la nota: Could not find the 'note_type' column of 'order_notes' in the schema cache
Error al guardar la nota: Could not find the 'user_id' column of 'order_notes' in the schema cache
Error al guardar la nota: insert or update on table "order_notes" violates foreign key constraint "order_notes_order_id_fkey"
```

## 🔍 Causa
La tabla `order_notes` fue creada originalmente por `sistema-reparaciones` con problemas de compatibilidad:
1. **Columnas faltantes**: Tiene `technician_id` pero falta `user_id` y `note_type`
2. **Foreign key incorrecta**: La constraint apunta a `orders(id)` pero `sistema-gestion-ordenes` usa `work_orders(id)`

El sistema `sistema-gestion-ordenes` requiere:
- `note_type`: Para distinguir entre notas públicas e internas
- `user_id`: Para identificar al usuario que creó la nota (más genérico que `technician_id`)
- Foreign key correcta: Que apunte a `work_orders(id)` en lugar de `orders(id)`

## ✅ Solución

### Paso 1: Ejecutar la migración SQL

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú lateral izquierdo)
4. Abre el archivo `database/add_note_type_column.sql` de este proyecto
5. Copia todo el contenido del archivo
6. Pégalo en el SQL Editor de Supabase
7. Haz clic en **RUN** (o presiona Ctrl+Enter)

### Paso 2: Verificar que funcionó

Después de ejecutar el script, deberías ver mensajes de éxito. Los cambios incluyen:

- **Foreign key corregida**: 
  - Se elimina la constraint antigua que apuntaba a `orders(id)`
  - Se crea una nueva constraint que apunta a `work_orders(id)`
  
- **note_type**: 
  - Valor por defecto: `'interno'`
  - Valores permitidos: `'interno'` o `'publico'`
  - Todas las notas existentes se marcarán automáticamente como `'interno'`
  
- **user_id**: 
  - Columna nullable que referencia a `users(id)`
  - Si existen notas con `technician_id`, esos valores se copiarán automáticamente a `user_id`

### Paso 3: Limpiar el cache de Supabase (si es necesario)

Si después de ejecutar la migración sigues viendo el error:

1. Ve a Supabase Dashboard → Tu Proyecto
2. Settings → API
3. Haz clic en **Clear Cache** o espera unos minutos para que el cache se actualice automáticamente

## 📝 Notas

- **IMPORTANTE**: Esta migración cambia la foreign key para que apunte a `work_orders` en lugar de `orders`
- **ADVERTENCIA**: Si hay notas existentes con `order_id` que apuntan a `orders` (del sistema-reparaciones), estas se eliminarán automáticamente porque no son válidas para `work_orders`. Si necesitas conservar esas notas, haz un backup antes de ejecutar la migración
- Si estás usando `sistema-reparaciones` con la misma base de datos, las notas de ese sistema no funcionarán hasta que se ajuste la constraint o se use una tabla separada
- Todas las notas existentes se marcarán como `'interno'` por defecto
- Si las notas existentes tienen `technician_id`, esos valores se copiarán a `user_id` automáticamente
- Puedes cambiar el tipo de nota después desde la interfaz
- La migración verifica si las columnas y constraints ya existen antes de modificarlas, por lo que es seguro ejecutarla múltiples veces
- La columna `technician_id` se mantiene para compatibilidad con `sistema-reparaciones`, pero `user_id` es la preferida en `sistema-gestion-ordenes`

