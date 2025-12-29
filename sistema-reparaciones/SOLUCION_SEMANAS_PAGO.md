# Solución: Asignación Correcta de Semanas de Pago

## 🔴 Problemas Detectados y Solucionados

### PROBLEMA 1: Trigger usaba `created_at` en lugar de fecha de pago
**Archivo**: `database/schema.sql` (líneas 148-155)

**❌ ANTES:**
```sql
CREATE OR REPLACE FUNCTION update_order_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.week_start := DATE_TRUNC('week', NEW.created_at)::DATE;
  -- Calculaba semana basándose en created_at ❌
END;
```

**✅ DESPUÉS:**
- Se agregaron campos `paid_at`, `payout_week`, `payout_year`
- El trigger ahora calcula semana basándose en `paid_at` cuando `status = 'paid'`
- Ver: `database/migration_add_payout_fields.sql`

---

### PROBLEMA 2: Todos los reportes filtraban por `created_at`
**Archivos afectados**: 
- `WeeklySummary.tsx` (líneas 38-39)
- `WeeklyReport.tsx` (líneas 60-61)
- `TechnicianPayments.tsx` (líneas 126-127)
- `AdminDashboard.tsx` (líneas 39-40, 74-75)
- `AdminReports.tsx` (líneas 51-52)

**❌ ANTES:**
```typescript
.gte("created_at", start.toISOString())
.lte("created_at", end.toISOString())
// Filtraba órdenes por fecha de creación ❌
```

**✅ DESPUÉS:**
```typescript
.eq("payout_week", currentPayout.week)
.eq("payout_year", currentPayout.year)
// Filtra órdenes por semana de pago ✅
```

---

### PROBLEMA 3: Semana se recalculaba dinámicamente
**❌ ANTES:**
- La semana se calculaba cada vez que se consultaba
- Si una orden se creaba antes del cierre pero se pagaba después, cambiaba de semana

**✅ DESPUÉS:**
- `payout_week` y `payout_year` se asignan UNA VEZ cuando `status = 'paid'`
- Nunca se recalculan después
- Ver: `src/react/components/OrderForm.tsx` y `src/react/components/OrdersTable.tsx`

---

## ✅ Solución Implementada

### 1. Migración de Base de Datos
**Archivo**: `database/migration_add_payout_fields.sql`

- Agrega campos `paid_at`, `payout_week`, `payout_year`
- Actualiza trigger para calcular semana basándose en `paid_at`
- Script de migración retrocompatible para órdenes existentes

### 2. Funciones de Utilidad
**Archivo**: `src/lib/payoutWeek.ts`

- `calculatePayoutWeek()`: Calcula número de semana desde fecha de pago
- `calculatePayoutYear()`: Calcula año desde fecha de pago
- `getCurrentPayoutWeek()`: Obtiene semana/año actual
- `getPayoutWeekRange()`: Obtiene rango de fechas para una semana específica

### 3. Actualización de Componentes

#### OrderForm.tsx
**Cambio**: Cuando se crea una orden con recibo (status = 'paid'), se establece:
- `paid_at`: Fecha actual
- `payout_week`: Semana calculada
- `payout_year`: Año calculado

#### OrdersTable.tsx - handleUpdateReceipt()
**Cambio**: Cuando se agrega recibo y se marca como 'paid':
- Establece `paid_at`, `payout_week`, `payout_year` si es primera vez marcando como pagada
- Si se quita el estado de pagada, limpia estos campos

#### WeeklySummary.tsx
**Cambio**: 
- Filtra órdenes pagadas por `payout_week`/`payout_year` en lugar de `created_at`
- Las órdenes pendientes siguen filtrándose por `created_at` (no tienen `paid_at` aún)

#### WeeklyReport.tsx
**Cambio**:
- Usa `payout_week`/`payout_year` para órdenes pagadas
- Usa `paid_at` para ordenar (retrocompatibilidad)

#### TechnicianPayments.tsx
**Cambio**:
- Filtra comisiones por `payout_week`/`payout_year`

#### AdminDashboard.tsx
**Cambio**:
- Mes: Usa `paid_at` para órdenes pagadas (retrocompatibilidad)
- Semana (compras): Usa `payout_week`/`payout_year`

#### AdminReports.tsx
**Cambio**:
- Permite seleccionar semana específica
- Filtra órdenes pagadas por `payout_week`/`payout_year` de la semana seleccionada

### 4. Tipos TypeScript
**Archivo**: `src/types.ts`

Agregados campos a interface `Order`:
```typescript
paid_at?: string | null;
payout_week?: number | null;
payout_year?: number | null;
```

---

## 📋 Pasos para Aplicar la Solución

1. **Ejecutar migración SQL**:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Archivo: database/migration_add_payout_fields.sql
   ```

2. **Verificar trigger**:
   - El trigger actualizará automáticamente `payout_week`/`payout_year` cuando una orden se marca como 'paid'

3. **Órdenes existentes**:
   - El script de migración recalcula `payout_week`/`payout_year` para órdenes ya pagadas
   - Usa `paid_at` si existe, sino `created_at` (retrocompatibilidad)

4. **Probar**:
   - Crear orden sin recibo → debe estar pendiente (sin `payout_week`)
   - Agregar recibo → debe asignar `payout_week` de la semana actual
   - Verificar que reportes muestren la orden en la semana correcta

---

## 🔍 Retrocompatibilidad

- Órdenes existentes sin `paid_at`: Se usa `created_at` para calcular `payout_week`
- Órdenes existentes con `paid_at`: Se usa `paid_at` para calcular `payout_week`
- Consultas: Si no hay `payout_week`, se puede usar `paid_at` como fallback

---

## ⚠️ Importante

1. **Zona horaria**: Las funciones usan la zona horaria del servidor/cliente correctamente
2. **Semanas**: Van de sábado (6) a viernes, según `currentWeekRange()`
3. **Inmutabilidad**: Una vez asignada, `payout_week`/`payout_year` nunca cambian
4. **Pendientes**: Las órdenes pendientes no tienen `payout_week` hasta que se paguen

---

## 🧪 Verificación

Para verificar que funciona:
1. Crear orden el lunes sin recibo → debe quedar pendiente
2. Agregar recibo el viernes → debe tener `payout_week` de la semana actual
3. Si el viernes es cierre, la orden debe aparecer en la semana actual
4. Si se agrega recibo el sábado (nueva semana), debe tener `payout_week` de la nueva semana


