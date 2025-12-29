# Resumen de Cambios: Sistema de Semanas de Pago

## 📋 Archivos Modificados

### Base de Datos
1. **`database/migration_add_payout_fields.sql`** (NUEVO)
   - Agrega campos `paid_at`, `payout_week`, `payout_year`
   - Actualiza trigger para calcular semana basándose en `paid_at`
   - Script de migración retrocompatible

### Utilidades
2. **`src/lib/payoutWeek.ts`** (NUEVO)
   - Funciones para calcular semanas de pago
   - `calculatePayoutWeek()`: Calcula número de semana desde fecha de pago
   - `calculatePayoutYear()`: Calcula año desde fecha de pago
   - `getCurrentPayoutWeek()`: Obtiene semana/año actual
   - `getPayoutWeekRange()`: Obtiene rango de fechas para semana específica

### Tipos
3. **`src/types.ts`**
   - Agregados campos `paid_at`, `payout_week`, `payout_year` a interface `Order`

### Componentes Frontend
4. **`src/react/components/OrderForm.tsx`**
   - Establece `paid_at`, `payout_week`, `payout_year` cuando se crea orden con recibo

5. **`src/react/components/OrdersTable.tsx`**
   - Actualiza `paid_at`, `payout_week`, `payout_year` cuando se agrega recibo
   - Limpia estos campos si se quita el estado de pagada

6. **`src/react/components/WeeklySummary.tsx`**
   - Filtra órdenes pagadas por `payout_week`/`payout_year` en lugar de `created_at`

7. **`src/react/components/WeeklyReport.tsx`**
   - Usa `payout_week`/`payout_year` para filtrar órdenes pagadas
   - Usa `paid_at` para ordenar (retrocompatibilidad)

8. **`src/react/components/TechnicianPayments.tsx`**
   - Filtra comisiones por `payout_week`/`payout_year`

9. **`src/react/components/AdminDashboard.tsx`**
   - Mes: Usa `paid_at` para órdenes pagadas
   - Semana (compras): Usa `payout_week`/`payout_year`

10. **`src/react/components/AdminReports.tsx`**
    - Filtra por `payout_week`/`payout_year` cuando se selecciona semana específica

11. **`src/react/components/SupplierPurchases.tsx`**
    - Filtra por `paid_at` para órdenes pagadas (retrocompatibilidad con `created_at`)

---

## 🔑 Cambios Principales por Archivo

### database/migration_add_payout_fields.sql

**PROBLEMA**: El trigger calculaba semana basándose en `created_at`

**SOLUCIÓN**:
- Agregados campos `paid_at`, `payout_week`, `payout_year`
- Trigger actualizado para calcular semana basándose en `paid_at` cuando `status = 'paid'`
- Función SQL `calculate_payout_week()` para calcular semana desde fecha de pago
- Script de migración retrocompatible para órdenes existentes

---

### src/lib/payoutWeek.ts (NUEVO)

**PROPÓSITO**: Funciones de utilidad para calcular semanas de pago

**FUNCIONES**:
- `calculatePayoutWeek(date)`: Calcula número de semana (1-53)
- `calculatePayoutYear(date)`: Calcula año
- `getCurrentPayoutWeek()`: Obtiene semana/año actual
- `getPayoutWeekRange(week, year)`: Obtiene rango de fechas para semana específica
- `isSamePayoutWeek()`: Compara si dos semanas son iguales

**IMPORTANTE**: Las semanas van de sábado (6) a viernes, según `currentWeekRange()`

---

### src/react/components/OrderForm.tsx

**PROBLEMA**: No establecía `paid_at` ni `payout_week` al crear orden con recibo

**SOLUCIÓN**:
```typescript
// Cuando se crea orden con recibo (status = 'paid')
const paidAt = status === "paid" ? now.toISOString() : null;
const payoutWeek = status === "paid" ? calculatePayoutWeek(now) : null;
const payoutYear = status === "paid" ? calculatePayoutYear(now) : null;
```

**EFECTO**: Las órdenes creadas con recibo ya tienen su semana de pago asignada desde el inicio

---

### src/react/components/OrdersTable.tsx - handleUpdateReceipt()

**PROBLEMA**: Al agregar recibo, no se establecía `paid_at` ni `payout_week`

**SOLUCIÓN**:
```typescript
// Si estamos marcando como pagada por primera vez
const isMarkingAsPaid = newStatus === "paid" && currentOrder.status !== "paid";
const paidAt = isMarkingAsPaid ? now.toISOString() : (currentOrder.paid_at || null);
const payoutWeek = isMarkingAsPaid ? calculatePayoutWeek(now) : (currentOrder.payout_week || null);
const payoutYear = isMarkingAsPaid ? calculatePayoutYear(now) : (currentOrder.payout_year || null);
```

**EFECTO**: Cuando se agrega recibo a una orden pendiente, se asigna su semana de pago permanentemente

---

### src/react/components/WeeklySummary.tsx

**PROBLEMA**: Filtraba por `created_at` en lugar de semana de pago

**ANTES**:
```typescript
.gte("created_at", start.toISOString())
.lte("created_at", end.toISOString())
```

**DESPUÉS**:
```typescript
const currentPayout = getCurrentPayoutWeek();
.eq("payout_week", currentPayout.week)
.eq("payout_year", currentPayout.year)
```

**EFECTO**: Muestra órdenes pagadas de la semana actual según cuando fueron pagadas, no cuando fueron creadas

---

### src/react/components/WeeklyReport.tsx

**PROBLEMA**: Similar a WeeklySummary, filtraba por `created_at`

**SOLUCIÓN**:
- Usa `payout_week`/`payout_year` para órdenes pagadas
- Mantiene filtro por `created_at` para órdenes pendientes y devueltas (no tienen `payout_week`)

**EFECTO**: El reporte semanal muestra correctamente las órdenes según su semana de pago

---

### src/react/components/TechnicianPayments.tsx

**PROBLEMA**: Filtraba comisiones por `created_at`

**SOLUCIÓN**:
```typescript
const currentPayout = getCurrentPayoutWeek();
.eq("payout_week", currentPayout.week)
.eq("payout_year", currentPayout.year)
```

**EFECTO**: Las comisiones se agrupan correctamente por semana de pago

---

### src/react/components/AdminDashboard.tsx

**PROBLEMA**: Mes usaba `created_at`, compras de semana usaban `created_at`

**SOLUCIÓN**:
- Mes: Usa `paid_at` para órdenes pagadas (retrocompatibilidad)
- Compras semana: Usa `payout_week`/`payout_year`

**EFECTO**: Las métricas del admin reflejan correctamente las semanas de pago

---

### src/react/components/AdminReports.tsx

**PROBLEMA**: Filtraba por `created_at` cuando se seleccionaba semana

**SOLUCIÓN**:
```typescript
const selectedPayoutWeek = calculatePayoutWeek(weekStart);
const selectedPayoutYear = calculatePayoutYear(weekStart);
.eq("payout_week", selectedPayoutWeek)
.eq("payout_year", selectedPayoutYear)
```

**EFECTO**: Al seleccionar una semana, muestra órdenes que fueron pagadas en esa semana

---

### src/react/components/SupplierPurchases.tsx

**PROBLEMA**: Filtraba compras por `created_at` en lugar de `paid_at`

**SOLUCIÓN**:
- Filtra por `paid_at` para órdenes pagadas
- Retrocompatibilidad: Si `paid_at` es null, usa `created_at`
- Muestra `paid_at` en la tabla si existe

**EFECTO**: Las compras a proveedores se cuentan según cuando se pagó la orden

---

## ✅ Comportamiento Correcto Ahora

1. **Orden creada sin recibo (lunes)**:
   - Status: `pending`
   - `paid_at`: `null`
   - `payout_week`: `null`
   - ✅ No aparece en reportes de semana actual

2. **Recibo agregado el viernes**:
   - Status: `paid`
   - `paid_at`: fecha/hora actual (viernes)
   - `payout_week`: semana actual (calculada desde viernes)
   - `payout_year`: año actual
   - ✅ Aparece en reportes de semana actual

3. **Recibo agregado el sábado (nueva semana)**:
   - Status: `paid`
   - `paid_at`: fecha/hora actual (sábado)
   - `payout_week`: nueva semana (calculada desde sábado)
   - `payout_year`: año actual
   - ✅ Aparece en reportes de la nueva semana, NO en la semana anterior

4. **Órdenes existentes (retrocompatibilidad)**:
   - Si tienen `paid_at`, se usa para calcular `payout_week`
   - Si no tienen `paid_at`, se usa `created_at` para calcular `payout_week`
   - ✅ Se migran correctamente al ejecutar el script SQL

---

## 🎯 Reglas de Negocio Implementadas

✅ **Regla 1**: Las comisiones se asignan según fecha de pago, NO fecha de creación  
✅ **Regla 2**: Hay un cierre semanal cada viernes/sábado  
✅ **Regla 3**: Si una orden se creó antes del cierre pero se pagó después, la comisión va a la semana siguiente  
✅ **Regla 4**: Una vez que una orden se paga, queda fijada a una semana específica para siempre  
✅ **Regla 5**: El sistema NO recalcula dinámicamente la semana

---

## 🚀 Próximos Pasos

1. **Ejecutar migración SQL** en Supabase:
   ```sql
   -- Copiar y ejecutar el contenido de database/migration_add_payout_fields.sql
   ```

2. **Verificar trigger**:
   - Crear una orden de prueba con recibo
   - Verificar que `paid_at`, `payout_week`, `payout_year` se establezcan correctamente

3. **Probar flujo completo**:
   - Crear orden sin recibo (debe quedar pendiente)
   - Agregar recibo después (debe asignar semana correcta)
   - Verificar que aparece en reportes de la semana correcta

4. **Verificar retrocompatibilidad**:
   - Órdenes existentes deben tener `payout_week` calculado
   - Los reportes deben funcionar con órdenes antiguas


