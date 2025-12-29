# 📊 Resumen: Sistema de Gastos por Sucursal

## 🎯 Objetivo Implementado

Se ha implementado un sistema completo de gestión de gastos por sucursal que permite:
- Administrar 7 sucursales
- Registrar gastos hormiga (por encargados)
- Registrar gastos generales (por administradores)
- Visualizar KPIs globales y por sucursal
- Integrar gastos de repuestos existentes

## 📋 Archivos Creados

### 1. Migraciones SQL

#### `database/add_branches_and_expenses.sql`
- ✅ Crea tabla `branches` (sucursales)
- ✅ Crea tabla `small_expenses` (gastos hormiga)
- ✅ Crea tabla `general_expenses` (gastos generales)
- ✅ Actualiza tabla `users` para agregar rol 'encargado' y `sucursal_id`
- ✅ Actualiza tabla `orders` para agregar `sucursal_id`
- ✅ Crea índices para optimización
- ✅ Configura políticas RLS (Row Level Security)
- ✅ Inserta 7 sucursales de ejemplo

#### `database/update_existing_data_with_branches.sql`
- ✅ Asigna sucursales a usuarios técnicos existentes
- ✅ Asigna sucursales a encargados existentes
- ✅ Asigna sucursales a órdenes existentes (basándose en el técnico)
- ✅ Incluye consultas de verificación

### 2. Componentes React

#### `src/react/components/SmallExpenses.tsx`
- Componente para gestionar gastos hormiga
- Permite crear, listar y ver resumen por tipo
- Solo visible para encargados de su sucursal
- Categorías: aseo, mercadería, compras_pequenas

#### `src/react/components/GeneralExpenses.tsx`
- Componente para gestionar gastos generales
- Permite crear, listar y ver resumen por tipo
- Solo visible para administradores
- Categorías: arriendo, internet, luz, agua, facturas, servicios
- Puede filtrar por sucursal

#### `src/react/components/BranchManagement.tsx`
- Componente principal de gestión de sucursales para admin
- Muestra KPIs globales (todas las sucursales)
- Permite seleccionar una sucursal y ver:
  - KPIs de la sucursal seleccionada
  - Gastos hormiga de la sucursal
  - Gastos generales de la sucursal
- Calcula totales de:
  - Gastos hormiga
  - Gastos generales
  - Repuestos (de órdenes)
  - Pagos a técnicos
  - Pagos a encargados

#### `src/react/components/EncargadoDashboard.tsx`
- Dashboard específico para usuarios con rol 'encargado'
- Muestra KPIs de su sucursal
- Permite gestionar gastos hormiga de su sucursal
- Valida que el encargado tenga sucursal asignada

### 3. Archivos Actualizados

#### `src/types.ts`
- ✅ Agregado rol 'encargado' al tipo `Role`
- ✅ Agregado `sucursal_id` a `Profile`
- ✅ Agregado `sucursal_id` a `Order`
- ✅ Creados tipos: `Branch`, `SmallExpense`, `GeneralExpense`, `BranchExpensesSummary`

#### `src/react/components/AdminDashboard.tsx`
- ✅ Agregado componente `BranchManagement` en sección colapsable
- ✅ Mantiene todos los KPIs y funcionalidades existentes

#### `src/react/components/OrderForm.tsx`
- ✅ Asigna automáticamente `sucursal_id` al crear orden (heredado del técnico)

#### `src/react/Dashboard.tsx`
- ✅ Agregada lógica para mostrar `EncargadoDashboard` cuando el usuario es encargado
- ✅ Actualizado header para mostrar "Encargado" en lugar de "Técnico"

## 🔐 Seguridad (RLS Policies)

### Branches (Sucursales)
- ✅ Todos los usuarios autenticados pueden ver sucursales
- ✅ Solo admins pueden crear/actualizar/eliminar sucursales

### Small Expenses (Gastos Hormiga)
- ✅ Encargados pueden ver gastos de su sucursal
- ✅ Admins pueden ver todos los gastos hormiga
- ✅ Solo encargados pueden crear gastos hormiga en su sucursal
- ✅ Solo encargados pueden actualizar gastos de su sucursal
- ✅ Solo admins pueden eliminar gastos hormiga

### General Expenses (Gastos Generales)
- ✅ Solo admins pueden ver/crear/actualizar/eliminar gastos generales

## 📊 KPIs Implementados

### Dashboard Global (Admin)
1. **Total Gastos Hormiga** - Suma de todos los gastos hormiga de todas las sucursales
2. **Total Gastos Generales** - Suma de todos los gastos generales de todas las sucursales
3. **Total Repuestos** - Suma de `replacement_cost` de órdenes pagadas
4. **Total Pagos Técnicos** - Suma de `amount` de `salary_settlements` para técnicos
5. **Total Pagos Encargados** - Suma de pagos a encargados (preparado para futuro)

### Dashboard por Sucursal (Admin)
1. **Gastos Hormiga** - Total de gastos hormiga de la sucursal
2. **Gastos Generales** - Total de gastos generales de la sucursal
3. **Repuestos** - Total de repuestos de órdenes pagadas de la sucursal
4. **Pagos Técnicos** - Total de pagos a técnicos de la sucursal
5. **Pagos Encargados** - Total de pagos a encargados de la sucursal
6. **Total General** - Suma de todos los anteriores

### Dashboard Encargado
1. **Total Gastos Hormiga** - De su sucursal
2. **Total Repuestos** - De órdenes de su sucursal

## 🚀 Pasos para Implementar

### 1. Ejecutar Migraciones SQL

**Paso 1:** Ejecutar `database/add_branches_and_expenses.sql` en Supabase SQL Editor
- Esto crea las tablas y estructura base
- Crea 7 sucursales de ejemplo

**Paso 2:** Ejecutar `database/update_existing_data_with_branches.sql` en Supabase SQL Editor
- Esto asigna sucursales a usuarios y órdenes existentes
- Distribuye automáticamente entre las 7 sucursales

### 2. Actualizar Usuarios Existentes (Opcional)

Si necesitas asignar usuarios específicos a sucursales específicas:

```sql
-- Asignar técnico a sucursal específica
UPDATE users 
SET sucursal_id = 'uuid-de-la-sucursal' 
WHERE id = 'uuid-del-usuario';

-- Asignar encargado a sucursal específica
UPDATE users 
SET sucursal_id = 'uuid-de-la-sucursal', role = 'encargado'
WHERE id = 'uuid-del-usuario';
```

### 3. Crear Usuarios Encargados

Desde el panel de administración:
1. Ir a "Gestión de Usuarios"
2. Crear nuevo usuario
3. Seleccionar rol "Encargado" (si está disponible en el selector)
4. Asignar sucursal

**Nota:** Si el selector de roles no incluye "encargado", actualiza `UserManagement.tsx` para incluir esta opción.

## 📝 Estructura de Datos

### Tabla: branches
```sql
- id (UUID)
- name (TEXT) - Nombre de la sucursal
- address (TEXT) - Dirección (opcional)
- phone (TEXT) - Teléfono (opcional)
- created_at, updated_at
```

### Tabla: small_expenses
```sql
- id (UUID)
- sucursal_id (UUID) - FK a branches
- user_id (UUID) - FK a users (quien registró)
- tipo (TEXT) - 'aseo', 'mercaderia', 'compras_pequenas'
- monto (NUMERIC) - Monto del gasto
- fecha (DATE) - Fecha del gasto
- descripcion (TEXT) - Descripción opcional
- created_at
```

### Tabla: general_expenses
```sql
- id (UUID)
- sucursal_id (UUID) - FK a branches
- user_id (UUID) - FK a users (quien registró)
- tipo (TEXT) - 'arriendo', 'internet', 'luz', 'agua', 'facturas', 'servicios'
- monto (NUMERIC) - Monto del gasto
- fecha (DATE) - Fecha del gasto
- descripcion (TEXT) - Descripción opcional
- created_at
```

## 🔄 Flujos de Trabajo

### Encargado Registra Gasto Hormiga
1. Encargado inicia sesión
2. Ve su dashboard con KPIs de su sucursal
3. Hace clic en "Nuevo Gasto" en la sección de Gastos Hormiga
4. Completa formulario (tipo, monto, fecha, descripción)
5. Guarda el gasto
6. El gasto se asocia automáticamente a su sucursal

### Admin Registra Gasto General
1. Admin inicia sesión
2. Va a "Gestión de Sucursales y Gastos"
3. Selecciona una sucursal (o deja en "todas")
4. Hace clic en "Nuevo Gasto" en Gastos Generales
5. Completa formulario (sucursal, tipo, monto, fecha, descripción)
6. Guarda el gasto

### Admin Visualiza KPIs
1. Admin inicia sesión
2. Va a "Gestión de Sucursales y Gastos"
3. Ve KPIs globales (todas las sucursales)
4. Selecciona una sucursal específica
5. Ve KPIs detallados de esa sucursal
6. Ve listado de gastos hormiga y generales de esa sucursal

## ⚠️ Notas Importantes

1. **Compatibilidad:** El sistema es completamente retrocompatible. Las órdenes y usuarios existentes seguirán funcionando.

2. **Sucursales:** Las 7 sucursales se crean automáticamente con nombres genéricos. Puedes actualizar los nombres después:
   ```sql
   UPDATE branches SET name = 'Nombre Real' WHERE name = 'Sucursal 1';
   ```

3. **Asignación de Sucursales:** El script de actualización distribuye usuarios de forma automática. Si necesitas asignaciones específicas, hazlo manualmente.

4. **Repuestos:** Los gastos en repuestos se calculan automáticamente desde las órdenes existentes usando el campo `replacement_cost`.

5. **Pagos a Técnicos:** Se calculan desde la tabla `salary_settlements` existente.

6. **Pagos a Encargados:** Por ahora está en 0. Puedes agregar lógica específica si los encargados también reciben pagos.

## 🐛 Troubleshooting

### Error: "No tienes una sucursal asignada"
- **Causa:** El usuario encargado no tiene `sucursal_id` asignado
- **Solución:** Ejecutar `update_existing_data_with_branches.sql` o asignar manualmente

### Error: "Permission denied" al crear gasto hormiga
- **Causa:** El usuario no es encargado o no tiene sucursal asignada
- **Solución:** Verificar rol y `sucursal_id` del usuario

### Los KPIs muestran 0
- **Causa:** No hay datos o las órdenes no tienen `sucursal_id`
- **Solución:** Ejecutar `update_existing_data_with_branches.sql` para asignar sucursales a órdenes existentes

## ✅ Checklist de Implementación

- [ ] Ejecutar `database/add_branches_and_expenses.sql`
- [ ] Ejecutar `database/update_existing_data_with_branches.sql`
- [ ] Verificar que las 7 sucursales se crearon
- [ ] Verificar que usuarios técnicos tienen `sucursal_id`
- [ ] Verificar que órdenes tienen `sucursal_id`
- [ ] Crear al menos un usuario con rol 'encargado' y asignarle sucursal
- [ ] Probar crear gasto hormiga como encargado
- [ ] Probar crear gasto general como admin
- [ ] Verificar KPIs globales en admin dashboard
- [ ] Verificar KPIs por sucursal en admin dashboard
- [ ] Verificar dashboard de encargado

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de la consola del navegador (F12)
2. Revisa los logs de Supabase
3. Verifica que las migraciones SQL se ejecutaron correctamente
4. Verifica que los usuarios tienen los roles y sucursales correctas asignadas








