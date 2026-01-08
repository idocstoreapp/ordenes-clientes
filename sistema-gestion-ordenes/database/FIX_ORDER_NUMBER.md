# 🔧 Solución: Error "duplicate key value violates unique constraint 'work_orders_order_number_key'"

## Problema

Cuando múltiples usuarios (especialmente de diferentes sucursales) crean órdenes simultáneamente, pueden obtener el mismo número de orden, causando un error de clave duplicada.

## ✅ Solución: Trigger en Base de Datos

La mejor solución es usar un **trigger en PostgreSQL** que genere automáticamente números de orden únicos usando una secuencia. Esto garantiza unicidad incluso con alta concurrencia.

### Paso 1: Ejecutar Script SQL en Supabase

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **SQL Editor**
3. Copia y pega el contenido del archivo `fix_order_number_generation.sql`
4. Haz clic en **RUN** (o Ctrl+Enter)

### Paso 2: Verificar que se creó correctamente

Ejecuta esta consulta para verificar:

```sql
-- Verificar que la secuencia existe
SELECT last_value FROM order_number_seq;

-- Verificar que el trigger existe
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'generate_order_number_trigger';
```

### Paso 3: Probar

1. Intenta crear una nueva orden
2. El número de orden se generará automáticamente
3. No debería haber errores de duplicados

## 🔍 Cómo Funciona

1. **Secuencia**: PostgreSQL mantiene un contador automático que garantiza números únicos
2. **Trigger**: Se ejecuta ANTES de insertar, generando el número si no se proporciona
3. **Verificación**: Si por alguna razón el número ya existe, se incrementa automáticamente

## 📝 Notas

- El trigger solo se ejecuta si `order_number` es NULL o vacío
- Si proporcionas un `order_number` manualmente, se respetará
- La secuencia garantiza números únicos incluso con concurrencia alta
- El código de la aplicación seguirá funcionando, pero el trigger tiene prioridad

## ⚠️ Si el Error Persiste

1. Verifica que el trigger esté activo:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'generate_order_number_trigger';
```

2. Verifica que la secuencia esté funcionando:
```sql
SELECT nextval('order_number_seq');
```

3. Si necesitas reinicializar la secuencia:
```sql
-- Obtener el máximo número de orden actual
SELECT MAX(
  CASE 
    WHEN order_number ~ '^ORD-(\d+)$' 
    THEN (regexp_match(order_number, '^ORD-(\d+)$'))[1]::INTEGER
    ELSE 0
  END
) FROM work_orders;

-- Luego establecer la secuencia (reemplaza 123456 con el valor obtenido)
SELECT setval('order_number_seq', 123456, false);
```

---

**Después de ejecutar el script, los números de orden se generarán automáticamente y no debería haber más errores de duplicados.**










