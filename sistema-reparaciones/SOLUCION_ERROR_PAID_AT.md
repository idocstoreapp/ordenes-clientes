# 🔧 Solución Rápida: Error "Could not find the 'paid_at' column"

## ⚠️ Problema

El error indica que la columna `paid_at` no existe en la tabla `orders` de la base de datos. Esto ocurre porque la migración SQL no se ha ejecutado.

## ✅ Solución: Ejecutar Migración SQL

### Paso 1: Abrir SQL Editor en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**

### Paso 2: Ejecutar la Migración

1. Copia **TODO** el contenido del archivo `database/migration_add_payout_fields.sql`
2. Pégalo en el SQL Editor
3. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

### Paso 3: Verificar que Funcionó

Ejecuta esta consulta para verificar que las columnas fueron agregadas:

```sql
-- Verificar que los campos fueron agregados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('paid_at', 'payout_week', 'payout_year');
```

**Resultado esperado**: Debes ver 3 filas:
- `paid_at` (tipo: `timestamp with time zone`)
- `payout_week` (tipo: `integer`)
- `payout_year` (tipo: `integer`)

### Paso 4: Actualizar Órdenes Existentes (Opcional)

Si tienes órdenes que ya estaban pagadas antes de ejecutar la migración, ejecuta esto para calcular sus semanas de pago:

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

## 🎯 Después de Ejecutar la Migración

1. **Refresca la página** de tu aplicación (Ctrl+F5 o Cmd+Shift+R)
2. El error debería desaparecer
3. El sistema ahora calculará correctamente las semanas de pago basándose en `paid_at`

## 📋 ¿Qué hace esta migración?

- ✅ Agrega la columna `paid_at` a la tabla `orders`
- ✅ Agrega las columnas `payout_week` y `payout_year` para calcular semanas de pago
- ✅ Crea funciones SQL para calcular semanas (sábado a viernes)
- ✅ Actualiza el trigger para calcular automáticamente estos campos cuando una orden se marca como pagada
- ✅ Crea índices para mejorar el rendimiento de las consultas

## 🐛 Si Aún Tienes Problemas

1. **Verifica que el script se ejecutó sin errores**: Revisa la pestaña "Results" en el SQL Editor
2. **Verifica que las columnas existen**: Ejecuta la consulta del Paso 3
3. **Limpia la caché del navegador**: Ctrl+Shift+Delete o Cmd+Shift+Delete
4. **Revisa la consola del navegador**: F12 → Console para ver si hay otros errores

## 📞 Nota Importante

Esta migración es **segura** y no afecta los datos existentes. Solo agrega nuevas columnas y calcula valores para órdenes que ya estaban pagadas.








