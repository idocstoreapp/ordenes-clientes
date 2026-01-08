# 🧪 Guía de Prueba: Flujo Completo de Creación de Orden desde Sucursal

Este documento describe cómo probar el flujo completo de creación de órdenes desde una sucursal y qué verificar en cada paso.

---

## 📋 PREPARACIÓN

### 1. Ejecutar Script SQL de Corrección

**IMPORTANTE:** Antes de probar, ejecuta el script de corrección de políticas RLS:

```sql
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Archivo: database/fix_all_rls_for_branches.sql
```

Este script corrige todas las políticas RLS que bloquean a las sucursales.

### 2. Verificar Sucursal de Prueba

Asegúrate de tener una sucursal activa con:
- `login_email` configurado
- `password_hash` configurado (usar `/api/hash-password` para generar)
- `is_active = true`

```sql
-- Verificar sucursal
SELECT id, name, login_email, is_active 
FROM branches 
WHERE is_active = true 
LIMIT 1;
```

### 3. Verificar Políticas RLS

Después de ejecutar el script, verifica que las políticas estén correctas:

```sql
-- Ver políticas de work_orders
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'work_orders'
ORDER BY policyname;

-- Deberías ver:
-- - work_orders_select_all (SELECT)
-- - work_orders_insert_all (INSERT)
-- - work_orders_update_all (UPDATE)
-- - work_orders_delete_admin (DELETE)
```

---

## 🔄 FLUJO DE PRUEBA PASO A PASO

### Paso 1: Login como Sucursal

1. Ir a `/login`
2. Ingresar el `login_email` de la sucursal
3. Ingresar la contraseña
4. Hacer click en "Iniciar Sesión"

**Verificar:**
- ✅ No hay errores en consola
- ✅ Se redirige a `/dashboard`
- ✅ En `localStorage` existe `branchSession` con:
  ```json
  {
    "type": "branch",
    "branchId": "uuid-de-la-sucursal",
    "branchName": "Nombre de la Sucursal",
    "email": "login_email@ejemplo.com"
  }
  ```

**Si falla:**
- Verificar que `login_email` y `password_hash` estén correctos
- Verificar que `is_active = true`
- Revisar consola del navegador para errores

---

### Paso 2: Navegar a Crear Orden

1. En el dashboard, hacer click en "Nueva Orden" o navegar a la sección de órdenes
2. Verificar que se muestra el formulario `OrderForm`

**Verificar:**
- ✅ El formulario se carga sin errores
- ✅ Todos los campos están visibles
- ✅ No hay errores en consola

**Si falla:**
- Verificar que el componente `OrderForm` recibe `technicianId={user.id}` donde `user.id` es el `branchId`
- Revisar consola del navegador

---

### Paso 3: Buscar/Crear Cliente

#### Opción A: Buscar Cliente Existente

1. En el campo "Cliente", escribir parte del nombre o email
2. Seleccionar un cliente de la lista

**Verificar:**
- ✅ La búsqueda funciona
- ✅ Se puede seleccionar un cliente
- ✅ El cliente se muestra seleccionado

#### Opción B: Crear Nuevo Cliente

1. En el campo "Cliente", escribir un nombre nuevo
2. Hacer click en "Crear Nuevo Cliente"
3. Llenar el formulario:
   - Nombre: "Cliente Prueba"
   - Email: "cliente@prueba.com"
   - Teléfono: "+56912345678"
4. Hacer click en "Crear Cliente"

**Verificar:**
- ✅ No aparece error "new row violates row-level security policy for table customers"
- ✅ El cliente se crea exitosamente
- ✅ El cliente queda seleccionado en el formulario
- ✅ No hay errores en consola

**Si falla:**
- Verificar que la política `customers_insert_all` esté activa:
  ```sql
  SELECT * FROM pg_policies 
  WHERE tablename = 'customers' 
  AND policyname = 'customers_insert_all';
  ```
- Si no existe, ejecutar:
  ```sql
  DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
  CREATE POLICY "customers_insert_all" ON customers FOR INSERT 
    WITH CHECK (true);
  ```

---

### Paso 4: Llenar Información del Dispositivo

1. **Dispositivo (Marca y Modelo):**
   - Escribir: "iPhone 13 Pro Max"
   - Verificar que se detecta el tipo automáticamente
   - O escribir un dispositivo no listado: "Samsung Galaxy S21"
   - Si no se detecta, debería aparecer botón "➕ Agregar Nuevo Dispositivo"
   - Hacer click y seleccionar categoría (ej: "📱 Celular")

2. **Número de Serie (opcional):**
   - Escribir: "ABC123XYZ"

3. **Código/Patrón de Desbloqueo (opcional):**
   - Seleccionar tipo o dejar "Sin código/patrón"

**Verificar:**
- ✅ El checklist aparece si se detectó/seleccionó el tipo de dispositivo
- ✅ Se pueden marcar items del checklist
- ✅ No hay errores en consola

---

### Paso 5: Llenar Descripción del Problema

1. Escribir: "Pantalla rota, necesita reemplazo"

**Verificar:**
- ✅ El campo acepta texto
- ✅ No hay errores

---

### Paso 6: Seleccionar Servicios

1. Hacer click en "Seleccionar Servicios"
2. Seleccionar uno o más servicios
3. Hacer click en "Confirmar"

**Verificar:**
- ✅ Los servicios se muestran seleccionados
- ✅ Se puede ver el valor del servicio

---

### Paso 7: Llenar Costos

1. **Costo Repuesto (CLP):** Escribir: "50000"
2. **Valor del Servicio (CLP):** Escribir: "30000"

**Verificar:**
- ✅ Los valores se formatean correctamente (con puntos de miles)
- ✅ El total se calcula correctamente
- ✅ Se muestra el desglose de IVA

---

### Paso 8: Configurar Prioridad y Fechas

1. **Prioridad:** Seleccionar "Media"
2. **Fecha Compromiso (opcional):** Seleccionar una fecha
3. **Garantía (días):** Dejar en 30 o cambiar

**Verificar:**
- ✅ Todos los campos funcionan
- ✅ No hay errores

---

### Paso 9: Crear la Orden

1. Hacer click en "Crear Orden"
2. Esperar a que se procese

**Verificar:**
- ✅ NO aparece error "new row violates row-level security policy for table work_orders"
- ✅ NO aparece error "cannot coerce the result to a single json object"
- ✅ Aparece mensaje: "Orden creada exitosamente. Se abrirá la vista previa del PDF."
- ✅ Se abre la vista previa del PDF
- ✅ El PDF muestra los datos correctos de la sucursal
- ✅ No hay errores en consola

**Si falla con error RLS:**
1. Verificar políticas:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'work_orders' 
   AND policyname = 'work_orders_insert_all';
   ```
2. Si no existe, ejecutar:
   ```sql
   DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
   CREATE POLICY "work_orders_insert_all" ON work_orders FOR INSERT 
     WITH CHECK (true);
   ```

**Si falla con "cannot coerce":**
- Verificar que `OrderForm.tsx` detecta correctamente que es una sucursal
- Verificar que `sucursalId` se establece correctamente
- Verificar que `actualTechnicianId` es `null` para sucursales
- Revisar consola del navegador para más detalles

---

### Paso 10: Verificar Orden Creada

1. Cerrar la vista previa del PDF
2. Navegar a la lista de órdenes
3. Buscar la orden recién creada

**Verificar:**
- ✅ La orden aparece en la lista
- ✅ El número de orden está asignado
- ✅ Los datos de la orden son correctos
- ✅ La sucursal asociada es correcta
- ✅ Se puede ver el PDF de la orden
- ✅ Se puede editar la orden (si aplica)

**Si la orden no aparece:**
- Verificar política SELECT:
  ```sql
  SELECT * FROM pg_policies 
  WHERE tablename = 'work_orders' 
  AND policyname = 'work_orders_select_all';
  ```
- Verificar que el frontend filtra por `sucursal_id` correctamente

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Error: "new row violates row-level security policy for table work_orders"

**Causa:** La política RLS `work_orders_insert_authenticated` requiere `auth.uid() IS NOT NULL`, pero las sucursales no tienen `auth.uid()`.

**Solución:**
```sql
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
CREATE POLICY "work_orders_insert_all" ON work_orders FOR INSERT 
  WITH CHECK (true);
```

---

### Error: "new row violates row-level security policy for table customers"

**Causa:** Similar al anterior, la política requiere `auth.uid()`.

**Solución:**
```sql
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
CREATE POLICY "customers_insert_all" ON customers FOR INSERT 
  WITH CHECK (true);
```

---

### Error: "new row violates row-level security policy for table order_services"

**Causa:** La política requiere `auth.uid()`.

**Solución:**
```sql
DROP POLICY IF EXISTS "order_services_insert_authenticated" ON order_services;
CREATE POLICY "order_services_insert_all" ON order_services FOR INSERT 
  WITH CHECK (true);
```

---

### Error: "cannot coerce the result to a single json object"

**Causa:** El código intenta buscar en `users` con un `branchId` que no existe en esa tabla.

**Solución:** Ya está implementada en `OrderForm.tsx`. Verificar que:
1. Se detecta correctamente la sesión de sucursal en `localStorage`
2. Se establece `isBranch = true`
3. Se establece `sucursalId = branchSession.branchId`
4. Se establece `actualTechnicianId = null`

---

### La orden se crea pero no aparece en la lista

**Causa:** La política SELECT bloquea la visualización.

**Solución:**
```sql
DROP POLICY IF EXISTS "work_orders_select_own_or_sucursal_or_admin" ON work_orders;
CREATE POLICY "work_orders_select_all" ON work_orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    (auth.uid() IS NULL)
  );
```

**Nota:** El frontend DEBE filtrar por `sucursal_id` para mostrar solo las órdenes de la sucursal actual.

---

## ✅ CHECKLIST FINAL

Después de completar todas las pruebas, verifica:

- [ ] Login como sucursal funciona
- [ ] Se puede buscar cliente existente
- [ ] Se puede crear nuevo cliente sin errores RLS
- [ ] Se puede seleccionar/agregar dispositivo
- [ ] El checklist aparece correctamente
- [ ] Se puede crear orden sin errores RLS
- [ ] El PDF se genera correctamente
- [ ] La orden aparece en la lista
- [ ] Se puede ver el PDF de la orden creada
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en la consola del servidor (si aplica)

---

## 📝 NOTAS ADICIONALES

1. **Seguridad:** Las políticas RLS ahora permiten INSERT sin verificar `auth.uid()`, pero el frontend DEBE validar y establecer correctamente `sucursal_id` y `technician_id`.

2. **Filtrado:** Las políticas SELECT permiten ver todas las órdenes cuando `auth.uid() IS NULL`. El frontend DEBE filtrar por `sucursal_id` para mostrar solo las órdenes de la sucursal actual.

3. **Validación:** Considera agregar triggers en la base de datos para validar que las sucursales solo puedan crear/modificar órdenes con su propio `sucursal_id`, pero esto requiere identificar la sucursal desde el contexto de la aplicación.

---

**Última actualización:** Después de ejecutar `fix_all_rls_for_branches.sql`

