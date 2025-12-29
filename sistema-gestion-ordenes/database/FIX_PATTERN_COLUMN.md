# 🔧 Solución: Error device_unlock_pattern

## Problema
Error: `Could not find the 'device_unlock_pattern' column of 'work_orders' in the schema cache`

## ✅ Solución

### Paso 1: Ejecutar Script SQL en Supabase

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **SQL Editor**
3. Copia y pega el siguiente script:

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
AND column_name = 'device_unlock_pattern';
```

Deberías ver la columna listada.

### Paso 3: Reiniciar el servidor de desarrollo

Después de agregar la columna, reinicia tu servidor:

```powershell
# Detén el servidor (Ctrl+C)
cd sistema-gestion-ordenes
npm run dev
```

## ✅ Alternativa: Script Rápido

También puedes ejecutar directamente el archivo `database/add_pattern_field.sql`:

1. Abre `database/add_pattern_field.sql`
2. Copia todo el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta

---

**Después de ejecutar el script, las órdenes deberían guardarse correctamente.**



