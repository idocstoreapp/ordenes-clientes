# Instrucciones: Habilitar Tipos de Dispositivos Personalizados

## Paso 1: Ejecutar Script SQL

Para permitir tipos de dispositivos personalizados (como "parlante", "auriculares", etc.), necesitas ejecutar el script SQL que elimina las restricciones de la base de datos.

### Opción A: Desde Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `allow_custom_device_types.sql`:

```sql
-- Script para permitir tipos de dispositivos personalizados
-- Elimina las restricciones CHECK que limitan device_type a solo 4 valores

-- 1. Eliminar restricción CHECK de device_checklist_items
ALTER TABLE device_checklist_items 
DROP CONSTRAINT IF EXISTS device_checklist_items_device_type_check;

-- 2. Eliminar restricción CHECK de work_orders
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_device_type_check;
```

5. Haz clic en **Run** para ejecutar el script
6. Deberías ver un mensaje de éxito

### Opción B: Desde la línea de comandos

Si tienes acceso a la base de datos directamente:

```bash
psql -h tu-host -U tu-usuario -d tu-database -f allow_custom_device_types.sql
```

## Paso 2: Verificar

Después de ejecutar el script, deberías poder:

1. **En Configuración**: Agregar nuevos tipos de dispositivos (ej: "Parlante", "Auriculares")
2. **En Creación de Orden**: Usar cualquier tipo de dispositivo, incluso si no tiene checklist configurado
3. **En Creación de Orden**: Crear checklists personalizados sobre la marcha

## Funcionalidades Nuevas

### En la Página de Configuración

- Botón **"+ Nuevo Tipo"** para agregar nuevos tipos de dispositivos
- Puedes crear checklists completos para cualquier tipo de dispositivo
- Los tipos personalizados aparecen junto a los predefinidos (iPhone, iPad, MacBook, Apple Watch)

### En la Creación de Órdenes

- Si el tipo de dispositivo no tiene checklist configurado, verás un mensaje
- Puedes agregar items personalizados al checklist sobre la marcha
- Los items personalizados se guardan solo en esa orden (no se crean en la base de datos)
- Si quieres que el checklist esté disponible para futuras órdenes, créalo desde Configuración

## Ejemplo de Uso

### Crear Checklist para "Parlante"

1. Ve a **Configuración** → **Checklists por Dispositivo**
2. Haz clic en **"+ Nuevo Tipo"**
3. Valor: `parlante`
4. Nombre: `Parlante`
5. Haz clic en **"Crear Tipo"**
6. Agrega items como:
   - "Altavoces"
   - "Conexión Bluetooth"
   - "Batería"
   - "Cargador"
   - etc.

### Usar en Creación de Orden

1. Al crear una orden, escribe "Parlante JBL" en el campo de dispositivo
2. El sistema detectará que es tipo "parlante" (o puedes seleccionarlo manualmente)
3. Verás el checklist que configuraste en Configuración
4. Si no hay checklist configurado, puedes crear items personalizados sobre la marcha

## Notas Importantes

- Los tipos de dispositivos se normalizan automáticamente (minúsculas, sin espacios, con guiones bajos)
- Ejemplo: "Parlante Bluetooth" → `parlante_bluetooth`
- Los checklists creados en Configuración están disponibles para todas las órdenes de ese tipo
- Los checklists personalizados creados en una orden solo se guardan en esa orden específica










