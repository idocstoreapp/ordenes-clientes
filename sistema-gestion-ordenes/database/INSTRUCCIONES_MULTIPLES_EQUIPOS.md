# 📋 Instrucciones: Soporte para Múltiples Equipos en una Sola Orden

## Resumen de Cambios

El sistema ahora soporta crear **una sola orden** que contiene **múltiples equipos** en **una sola hoja PDF**.

### Cambios Principales

1. **OrderForm.tsx**: Modificado para crear una sola orden que contiene todos los equipos
   - El primer equipo se almacena en campos normales de la tabla `work_orders`
   - Los equipos adicionales se almacenan en el campo JSONB `devices_data`
   - Todos los servicios se asocian a la misma orden

2. **PDFPreview.tsx**: Refactorizado para mostrar todos los equipos en una sola hoja
   - Implementado sistema de **presupuestos de altura** por zona
   - **Tipografía adaptativa** que ajusta tamaño de fuente según cantidad de contenido
   - **Protección de zonas** (garantías y firma) para que nunca sean invadidas
   - Layout resiliente que garantiza que todo quepa en una sola hoja

3. **Base de Datos**: Nuevo campo `devices_data` (JSONB) en la tabla `work_orders`

## Paso 1: Ejecutar Script SQL

**IMPORTANTE**: Debes ejecutar el script SQL antes de usar la nueva funcionalidad.

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **SQL Editor**
3. Copia y pega el contenido del archivo `add_devices_data_field.sql`
4. Haz clic en **RUN** (o Ctrl+Enter)

El script agrega el campo `devices_data` (JSONB) a la tabla `work_orders` para almacenar equipos adicionales.

### Verificación

Ejecuta esta consulta para verificar que el campo existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'devices_data';
```

Deberías ver el campo listado.

## Paso 2: Reiniciar el Servidor de Desarrollo

Después de ejecutar el script SQL, reinicia tu servidor de desarrollo:

```powershell
# Detén el servidor (Ctrl+C)
cd sistema-gestion-ordenes
npm run dev
```

## Funcionamiento

### Crear Orden con Múltiples Equipos

1. En el formulario de orden, agrega múltiples equipos usando el botón "➕ Agregar Equipo"
2. Completa los datos de cada equipo (modelo, problema, servicios, etc.)
3. Al guardar, se crea **una sola orden** que contiene todos los equipos
4. El PDF muestra todos los equipos en **una sola hoja** con layout adaptativo

### Características del PDF

- ✅ **Una sola hoja siempre**: El documento nunca excede una página
- ✅ **Layout adaptativo**: El tamaño de fuente y espaciado se ajusta automáticamente
- ✅ **Zonas protegidas**: Garantías y firma nunca son invadidas
- ✅ **Tipografía inteligente**: Ajusta según cantidad de equipos y contenido
- ✅ **Presupuestos de altura**: Cada zona tiene un presupuesto máximo que no puede exceder

### Estructura de Datos

```json
{
  "devices_data": [
    {
      "device_type": "iphone",
      "device_model": "iPhone 13 Pro",
      "device_serial_number": "ABC123",
      "device_unlock_code": "1234",
      "problem_description": "Pantalla rota",
      "checklist_data": {...},
      "replacement_cost": 50000,
      "labor_cost": 30000,
      "selected_services": [...]
    }
  ]
}
```

## Solución de Problemas

### Error: "Could not find the 'devices_data' column"

**Causa**: No se ha ejecutado el script SQL.

**Solución**: Ejecuta el script `add_devices_data_field.sql` en Supabase SQL Editor.

### El PDF se sale de una hoja

**Causa**: Contenido extremadamente largo o muchos equipos.

**Solución**: El sistema automáticamente:
- Reduce el tamaño de fuente
- Ajusta el interlineado
- Trunca descripciones si es necesario
- Omite servicios si no caben (prioriza garantías y firma)

### Órdenes duplicadas

**Causa**: Versión anterior del código que creaba una orden por equipo.

**Solución**: El código actualizado crea una sola orden. Si ves órdenes duplicadas, verifica que estés usando la versión más reciente del código.

## Notas Técnicas

- El primer equipo se almacena en campos normales por compatibilidad con código existente
- Los equipos adicionales se almacenan en JSONB para flexibilidad
- El PDF calcula dinámicamente las alturas máximas por zona
- La tipografía se ajusta entre 6-8 puntos según contenido
- El interlineado se ajusta proporcionalmente al tamaño de fuente
