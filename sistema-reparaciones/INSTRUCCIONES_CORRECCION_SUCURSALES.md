# 🔧 Instrucciones: Corrección de Sucursales y Mejoras

## 📋 Problemas Identificados y Soluciones

### 1. ✅ Inconsistencias entre número de sucursal y nombre del local

**Problema**: Algunos técnicos tienen asignada una sucursal que no coincide con el nombre de su local.

**Solución**: Ejecutar los scripts SQL en este orden:

#### Paso 1: Actualizar nombres de sucursales
```sql
-- Ejecutar en Supabase SQL Editor
-- database/update_branch_names.sql
```
Este script:
- Actualiza los nombres de las sucursales a los nombres correctos
- Asegura que existan las 7 sucursales con los nombres correctos:
  - Sucursal 1 → Tienda Mall Trebol
  - Sucursal 2 → Tienda Providencia
  - Sucursal 3 → Tienda Puente Alto
  - Sucursal 4 → Tienda Maipu
  - Sucursal 5 → Tienda Concepcion
  - Sucursal 6 → Tienda Santiago
  - Sucursal 7 → Tienda Apumanque

#### Paso 2: Corregir asignaciones de técnicos
```sql
-- Ejecutar en Supabase SQL Editor
-- database/fix_branch_consistency.sql
```
Este script:
- Corrige las asignaciones de sucursal basándose en el nombre del local del técnico
- Actualiza las órdenes para que coincidan con la sucursal del técnico
- Muestra un reporte de verificación al final

### 2. ✅ Mostrar nombre de sucursal al seleccionar

**Cambio aplicado**: En la página de "Gestión de Sucursales y Gastos", ahora:
- Al seleccionar una sucursal, aparece debajo del selector el nombre completo de la sucursal seleccionada
- En el título del resumen de sucursal, se muestra claramente el nombre de la sucursal

### 3. ✅ Opción de agregar nuevos gastos

**Estado actual**: Los componentes de gastos (Hormiga y Generales) ya tienen implementada la funcionalidad de agregar nuevos gastos:

- **Botón "+ Nuevo Gasto"**: Visible en la parte superior de cada sección
- **Formulario**: Se muestra al hacer clic en el botón
- **Funcionalidad completa**: Permite agregar gastos con todos los campos necesarios

**Ubicación**:
- **Gastos Hormiga**: Botón en la esquina superior derecha del componente
- **Gastos Generales**: Botón en la esquina superior derecha del componente

## 🚀 Pasos para Aplicar las Correcciones

1. **Ejecutar Scripts SQL**:
   - Ve a Supabase → SQL Editor
   - Ejecuta `database/update_branch_names.sql`
   - Ejecuta `database/fix_branch_consistency.sql`
   - Revisa el reporte de verificación al final del segundo script

2. **Verificar en la Aplicación**:
   - Ve a "Gestión de Usuarios" y verifica que cada técnico tenga la sucursal correcta
   - Ve a "Gestión de Sucursales y Gastos" y verifica que al seleccionar una sucursal aparezca su nombre
   - Verifica que los botones "+ Nuevo Gasto" funcionen correctamente

## 📊 Mapeo de Sucursales

| Número | Nombre Correcto | Coincidencia en Local |
|--------|----------------|----------------------|
| 1 | Tienda Mall Trebol | "Mall Trebol" o "Trebol" |
| 2 | Tienda Providencia | "Providencia" |
| 3 | Tienda Puente Alto | "Puente Alto" |
| 4 | Tienda Maipu | "Maipu" |
| 5 | Tienda Concepcion | "Concepcion" o "Concepción" |
| 6 | Tienda Santiago | "Santiago" (excluyendo Puente Alto y Providencia) |
| 7 | Tienda Apumanque | "Apumanque" |

## ⚠️ Notas Importantes

- Los scripts son seguros y no eliminan datos, solo actualizan asignaciones
- Si un técnico no tiene un local que coincida, mantendrá su sucursal actual
- Las órdenes se actualizan automáticamente para coincidir con la sucursal del técnico
- Después de ejecutar los scripts, verifica manualmente casos especiales







