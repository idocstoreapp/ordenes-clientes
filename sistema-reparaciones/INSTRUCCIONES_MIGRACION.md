# 🚀 Instrucciones de Migración: Sistema de Semanas de Pago

## ⚠️ IMPORTANTE: Leer Antes de Ejecutar

Esta migración corrige un problema crítico donde las comisiones se asignaban según la fecha de creación de la orden en lugar de la fecha de pago. 

**EFECTO**: Las órdenes ahora se asignan a la semana correcta según cuando fueron pagadas, y esta asignación es permanente.

---

## 📋 Paso 1: Ejecutar Migración SQL

1. Abre el **SQL Editor** en Supabase
2. Copia el contenido completo de `database/migration_add_payout_fields.sql`
3. Ejecuta el script
4. Verifica que no haya errores

**Lo que hace este script:**
- ✅ Agrega campos `paid_at`, `payout_week`, `payout_year` a la tabla `orders`
- ✅ Crea funciones SQL para calcular semanas de pago
- ✅ Actualiza el trigger para calcular semanas basándose en `paid_at`
- ✅ Migra órdenes existentes calculando `payout_week` desde `paid_at` o `created_at`

---

## 📋 Paso 2: Verificar Migración

Ejecuta esta consulta en Supabase para verificar:

```sql
-- Verificar que los campos fueron agregados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('paid_at', 'payout_week', 'payout_year');

-- Verificar que órdenes pagadas tienen payout_week
SELECT COUNT(*) as total_paid,
       COUNT(payout_week) as with_payout_week,
       COUNT(payout_week) - COUNT(*) as missing_payout_week
FROM orders 
WHERE status = 'paid';
```

**Resultado esperado**: `missing_payout_week` debe ser 0 (todas las órdenes pagadas tienen `payout_week`)

---

## 📋 Paso 3: Probar el Sistema

### Test 1: Crear Orden sin Recibo
1. Crea una orden nueva **sin** número de recibo
2. Verifica en la base de datos:
   ```sql
   SELECT id, status, paid_at, payout_week, payout_year 
   FROM orders 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - `status` debe ser `'pending'`
   - `paid_at` debe ser `NULL`
   - `payout_week` debe ser `NULL`
   - `payout_year` debe ser `NULL`

### Test 2: Agregar Recibo
1. Agrega el número de recibo a la orden creada anteriormente
2. Verifica nuevamente:
   - `status` debe ser `'paid'`
   - `paid_at` debe tener fecha/hora actual
   - `payout_week` debe tener un número (1-53)
   - `payout_year` debe tener el año actual

### Test 3: Verificar Semana Correcta
1. Si es viernes, crea una orden y agrégale recibo
2. Si es sábado (día siguiente), verifica que la orden del viernes siga apareciendo en la semana anterior
3. Crea otra orden el sábado y agrégale recibo
4. Verifica que ambas órdenes aparezcan en semanas diferentes en los reportes

---

## 🔍 Verificación de Reportes

### Dashboard del Técnico
1. Abre el dashboard del técnico
2. Revisa "Pendientes de Pago": debe mostrar órdenes sin recibo
3. Revisa "Ganancia Semanal": debe mostrar órdenes pagadas de la semana actual según `payout_week`

### Panel del Administrador
1. Abre el panel del administrador
2. Revisa "Pagos Pendientes a Técnicos": debe sumar todas las órdenes pendientes
3. Revisa reportes semanales: deben filtrar por `payout_week`/`payout_year`

---

## 🐛 Solución de Problemas

### Error: "column paid_at does not exist"
- **Causa**: No se ejecutó la migración SQL
- **Solución**: Ejecuta `database/migration_add_payout_fields.sql`

### Error: "payout_week is null" en órdenes pagadas
- **Causa**: El trigger no está funcionando correctamente
- **Solución**: 
  1. Verifica que el trigger existe: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_order_metadata';`
  2. Si no existe, ejecuta la parte del trigger en el script de migración

### Las órdenes siguen apareciendo en semanas incorrectas
- **Causa**: Los componentes aún están usando `created_at` en lugar de `payout_week`
- **Solución**: Verifica que todos los archivos fueron actualizados según `RESUMEN_CAMBIOS_SEMANAS.md`

### Órdenes antiguas no tienen payout_week
- **Causa**: El script de migración no se ejecutó completamente
- **Solución**: Ejecuta manualmente:
  ```sql
  UPDATE orders 
  SET 
    paid_at = CASE 
      WHEN status = 'paid' AND paid_at IS NULL THEN created_at
      ELSE paid_at
    END,
    payout_week = CASE 
      WHEN status = 'paid' THEN calculate_payout_week(COALESCE(paid_at, created_at))
      ELSE NULL
    END,
    payout_year = CASE 
      WHEN status = 'paid' THEN calculate_payout_year(COALESCE(paid_at, created_at))
      ELSE NULL
    END
  WHERE status = 'paid' AND (payout_week IS NULL OR payout_year IS NULL);
  ```

---

## 📊 Consultas Útiles para Debugging

### Ver órdenes de una semana específica
```sql
SELECT order_number, status, created_at, paid_at, payout_week, payout_year, commission_amount
FROM orders
WHERE payout_week = 25  -- Cambiar por la semana que necesites
AND payout_year = 2024
ORDER BY paid_at DESC;
```

### Ver órdenes pendientes (sin payout_week)
```sql
SELECT order_number, status, created_at, paid_at, payout_week
FROM orders
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Comparar created_at vs paid_at para órdenes pagadas
```sql
SELECT 
  order_number,
  created_at,
  paid_at,
  payout_week,
  payout_year,
  EXTRACT(EPOCH FROM (paid_at - created_at))/86400 as days_difference
FROM orders
WHERE status = 'paid'
ORDER BY days_difference DESC;
```

---

## ✅ Checklist Final

- [ ] Migración SQL ejecutada sin errores
- [ ] Campos `paid_at`, `payout_week`, `payout_year` existen en tabla `orders`
- [ ] Todas las órdenes pagadas tienen `payout_week` y `payout_year`
- [ ] Trigger `trigger_update_order_metadata` existe y funciona
- [ ] Crear orden sin recibo → `payout_week` es NULL ✅
- [ ] Agregar recibo → `payout_week` se asigna correctamente ✅
- [ ] Reportes muestran órdenes en semana correcta ✅
- [ ] Órdenes de diferentes semanas aparecen separadas ✅

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de la consola del navegador (F12)
2. Revisa los logs de Supabase
3. Verifica que todos los archivos fueron actualizados según el resumen
4. Ejecuta las consultas de debugging para identificar el problema


