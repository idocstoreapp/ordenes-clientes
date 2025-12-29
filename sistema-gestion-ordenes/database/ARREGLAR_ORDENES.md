# 🔧 Solución: Error al Guardar Órdenes

## Problema
1. Error: `Could not find the 'device_unlock_pattern' column of 'work_orders' in the schema cache`
2. Las órdenes no se guardan

## ✅ Solución Rápida

### Paso 1: Ejecutar Script SQL en Supabase

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **SQL Editor**
3. Copia y pega este script:

```sql
-- Agregar columna device_unlock_pattern si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' 
    AND column_name = 'device_unlock_pattern'
  ) THEN
    ALTER TABLE work_orders 
    ADD COLUMN device_unlock_pattern JSONB;
    
    COMMENT ON COLUMN work_orders.device_unlock_pattern IS 'Patrón de desbloqueo como array de números del 1 al 9, ejemplo: [1,2,5,8,9]';
    
    RAISE NOTICE 'Columna device_unlock_pattern agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna device_unlock_pattern ya existe';
  END IF;
END $$;
```

4. Haz clic en **RUN** (o Ctrl+Enter)

### Paso 2: Verificar

Ejecuta esta consulta para verificar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name IN ('device_unlock_code', 'device_unlock_pattern')
ORDER BY column_name;
```

Deberías ver ambas columnas listadas.

### Paso 3: Reiniciar el servidor (opcional)

Si aún tienes problemas, reinicia el servidor:

```powershell
# Detén el servidor (Ctrl+C)
cd sistema-gestion-ordenes
npm run dev
```

## ✅ Verificación Final

Después de ejecutar el script:
1. Intenta crear una nueva orden
2. Debería guardarse correctamente
3. Debería abrirse la vista previa del PDF

---

**Después de ejecutar el script, las órdenes deberían guardarse correctamente y aparecer la vista previa del PDF.**



