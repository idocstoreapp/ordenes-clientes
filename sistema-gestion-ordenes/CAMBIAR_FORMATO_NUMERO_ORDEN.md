# 🔢 Cambiar Formato de Números de Orden

## Cambios Realizados

1. ✅ **Eliminado el prefijo "ORD-"** del formato de números de orden
2. ✅ **Inicialización desde 24900** para nuevas órdenes

## Pasos para Aplicar los Cambios

### 1. Ejecutar Script SQL en Supabase

1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. En el menú lateral, ve a **SQL Editor**
3. Click en **"New query"**
4. Abre el archivo `database/update_order_number_format.sql`
5. Copia TODO el contenido y pégalo en el SQL Editor
6. Click en **"Run"** (o presiona F5)

### 2. Verificar que se Aplicó Correctamente

Ejecuta esta consulta para verificar:

```sql
-- Verificar el valor actual de la secuencia
SELECT last_value FROM order_number_seq;

-- Verificar que el trigger existe
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'generate_order_number_trigger';
```

**Resultado esperado:**
- `last_value` debe ser **24900** o mayor (si ya hay órdenes con números más altos)
- El trigger debe estar activo

### 3. Probar Creando una Nueva Orden

1. Crea una nueva orden en el sistema
2. El número de orden debería ser **24900** (o el siguiente número disponible)
3. No debería tener el prefijo "ORD-"

## 📝 Notas Importantes

- **Órdenes existentes**: Las órdenes que ya tienen formato "ORD-XXXX" seguirán funcionando normalmente
- **Nuevas órdenes**: Se generarán sin el prefijo, solo con el número (ej: 24900, 24901, 24902...)
- **Compatibilidad**: El sistema funciona con ambos formatos, así que no hay problema si hay órdenes antiguas con "ORD-"

## 🔍 Formato Anterior vs Nuevo

**Antes:**
- ORD-000001
- ORD-000002
- ORD-000003

**Ahora:**
- 24900
- 24901
- 24902

## ⚠️ Si Algo Sale Mal

Si necesitas revertir los cambios, ejecuta el script original:

```sql
-- Restaurar función original con prefijo ORD-
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_order_number TEXT;
BEGIN
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;
  
  next_num := nextval('order_number_seq');
  new_order_number := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  
  WHILE EXISTS (SELECT 1 FROM work_orders WHERE order_number = new_order_number) LOOP
    next_num := nextval('order_number_seq');
    new_order_number := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
  END LOOP;
  
  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```






