# 🚨 PROMPT: Solución de Problemas en Sistema de Gestión de Órdenes con Sucursales

## 📋 CONTEXTO Y PROBLEMA

Tengo un sistema de gestión de órdenes de reparación que funciona con Supabase. El sistema tiene:

- **Autenticación dual:**
  - Usuarios normales que se autentican con `auth.users` de Supabase
  - Sucursales que se autentican con credenciales propias (`login_email` y `password_hash` en tabla `branches`)
  
- **Row Level Security (RLS)** habilitado en todas las tablas

- **Tablas principales:**
  - `branches` (sucursales)
  - `customers` (clientes)
  - `work_orders` (órdenes de trabajo)
  - `order_services` (servicios de las órdenes)
  - `order_notes` (notas de las órdenes)
  - `device_checklist_items` (items de checklist por tipo de dispositivo)

---

## ❌ PROBLEMAS IDENTIFICADOS

### Problema 1: Error RLS al crear clientes desde sucursales
**Error:** `new row violates row-level security policy for table "customers"`

**Causa:** Las políticas RLS requieren `auth.uid() IS NOT NULL`, pero las sucursales no tienen `auth.uid()` porque no están en `auth.users`.

**Ubicación:** Al intentar crear un cliente desde el componente `CustomerSearch.tsx` cuando se está logueado como sucursal.

---

### Problema 2: Error RLS al crear órdenes desde sucursales
**Error:** `new row violates row-level security policy for table "work_orders"`

**Causa:** Similar al Problema 1, la política `work_orders_insert_authenticated` requiere `auth.uid() IS NOT NULL`.

**Ubicación:** En `OrderForm.tsx` al intentar crear una orden después de llenar todos los campos.

---

### Problema 3: Error RLS al crear servicios de órdenes
**Error:** `new row violates row-level security policy for table "order_services"`

**Causa:** La política requiere `auth.uid() IS NOT NULL`.

**Ubicación:** En `OrderForm.tsx` después de crear la orden, al intentar insertar los servicios asociados.

---

### Problema 4: Error "cannot coerce the result to a single json object"
**Error:** `cannot coerce the result to a single json object`

**Causa:** El código intenta buscar en la tabla `users` con un `branchId` que no existe en esa tabla. Las sucursales tienen su ID en `branches`, no en `users`.

**Ubicación:** En `OrderForm.tsx` en la función `handleSubmit`, cuando intenta obtener `sucursal_id` y datos de la sucursal.

---

### Problema 5: No se puede agregar checklist para dispositivos no listados
**Problema:** Si un usuario escribe un modelo de dispositivo que no está en la base de datos de dispositivos conocidos, no se detecta el tipo de dispositivo y por lo tanto no aparece el checklist.

**Causa:** La función `detectDeviceType()` retorna `null` para dispositivos desconocidos, y cuando `deviceType` es `null`, el componente `DeviceChecklist` no se renderiza.

**Ubicación:** En `OrderForm.tsx` cuando se escribe un modelo de dispositivo no reconocido.

---

### Problema 6: Clientes duplicados
**Error:** `duplicate key value violates unique constraint customers_email_phone_key`

**Causa:** Si un cliente ya existe con el mismo email y teléfono, intentar crearlo de nuevo genera este error.

**Ubicación:** En `CustomerSearch.tsx` en la función `handleCreateCustomer`.

---

### Problema 7: Las órdenes creadas no se pueden ver después
**Problema:** Después de crear una orden desde una sucursal, la orden no aparece en la lista.

**Causa:** La política SELECT de `work_orders` requiere `auth.uid()` para verificar si la orden pertenece al usuario/sucursal, pero las sucursales no tienen `auth.uid()`.

**Ubicación:** En `OrdersTable.tsx` al intentar cargar las órdenes.

---

## ✅ SOLUCIÓN COMPLETA

### Paso 1: Ejecutar Script SQL para Corregir Políticas RLS

Crea un archivo SQL con el siguiente contenido y ejecútalo en Supabase Dashboard → SQL Editor:

```sql
-- ============================================
-- Script COMPLETO para corregir TODAS las políticas RLS
-- que bloquean a las sucursales
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA work_orders
-- ============================================

-- Eliminar políticas existentes (eliminar TODAS las posibles políticas)
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_select_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_admin" ON work_orders;

-- Política SELECT: Permitir ver órdenes
CREATE POLICY "work_orders_select_all" ON work_orders FOR SELECT
  USING (
    -- Usuarios autenticados: pueden ver sus órdenes, órdenes de su sucursal, o todas si son admin
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    -- Si no hay auth.uid() (sucursal), permitir SELECT (el frontend filtrará por sucursal_id)
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
CREATE POLICY "work_orders_insert_all" ON work_orders FOR INSERT 
  WITH CHECK (true);

-- Política UPDATE: Similar a SELECT
CREATE POLICY "work_orders_update_all" ON work_orders FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    (auth.uid() IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (
      technician_id = auth.uid()
      OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    ))
    OR
    (auth.uid() IS NULL)
  );

-- Política DELETE: Solo admins pueden eliminar
CREATE POLICY "work_orders_delete_admin" ON work_orders FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. POLÍTICAS PARA order_services
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "order_services_select_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_select_all" ON order_services;
DROP POLICY IF EXISTS "order_services_insert_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_insert_all" ON order_services;
DROP POLICY IF EXISTS "order_services_update_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_update_all" ON order_services;

-- Política SELECT: Permitir ver servicios de órdenes que puedes ver
CREATE POLICY "order_services_select_all" ON order_services FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
CREATE POLICY "order_services_insert_all" ON order_services FOR INSERT 
  WITH CHECK (true);

-- Política UPDATE: Similar a SELECT
CREATE POLICY "order_services_update_all" ON order_services FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_services.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  );

-- ============================================
-- 3. POLÍTICAS PARA order_notes
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "order_notes_select_authenticated" ON order_notes;
DROP POLICY IF EXISTS "order_notes_select_all" ON order_notes;
DROP POLICY IF EXISTS "order_notes_insert_authenticated" ON order_notes;
DROP POLICY IF EXISTS "order_notes_insert_all" ON order_notes;

-- Política SELECT: Similar a order_services
CREATE POLICY "order_notes_select_all" ON order_notes FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = order_notes.order_id
      AND (
        wo.technician_id = auth.uid()
        OR wo.sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    ))
    OR
    (auth.uid() IS NULL)
  );

-- Política INSERT: Permitir insertar sin verificar auth.uid()
CREATE POLICY "order_notes_insert_all" ON order_notes FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 4. POLÍTICAS PARA customers
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_insert_all" ON customers;

-- Crear política que permita INSERT sin verificar auth.uid()
CREATE POLICY "customers_insert_all" ON customers FOR INSERT 
  WITH CHECK (true);
```

---

### Paso 2: Modificar OrderForm.tsx para Detectar Sucursales Correctamente

En el archivo `OrderForm.tsx`, en la función `handleSubmit`, reemplaza la lógica de detección de sucursal con esta:

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  // ... validaciones existentes ...

  setLoading(true);

  try {
    // ... validaciones del checklist ...

    // Verificar si es una sucursal (no tiene usuario en auth.users)
    // Las sucursales tienen su sesión guardada en localStorage
    let isBranch = false;
    let sucursalId: string | null = null;
    let branchData = null;
    let actualTechnicianId: string | null = technicianId;

    // Verificar si hay sesión de sucursal en localStorage
    if (typeof window !== 'undefined') {
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          if (branchSession.type === 'branch' && branchSession.branchId === technicianId) {
            // Es una sucursal - usar el branchId como sucursal_id
            isBranch = true;
            sucursalId = branchSession.branchId;
            actualTechnicianId = null; // Las sucursales no tienen technician_id
            
            // Cargar datos completos de la sucursal
            const { data: branch, error: branchError } = await supabase
              .from("branches")
              .select("*")
              .eq("id", sucursalId)
              .single();
            
            if (!branchError && branch) {
              branchData = branch;
            }
          }
        } catch (e) {
          console.error("Error parseando branchSession:", e);
        }
      }
    }

    // Si no es sucursal, obtener datos del usuario normal
    if (!isBranch) {
      const { data: tech, error: techError } = await supabase
        .from("users")
        .select("sucursal_id")
        .eq("id", technicianId)
        .maybeSingle(); // Usar maybeSingle en lugar de single

      if (techError) {
        // Si el error es porque no existe el usuario, podría ser una sucursal
        // Intentar verificar si es una sucursal por el ID
        const { data: branchCheck, error: branchCheckError } = await supabase
          .from("branches")
          .select("id")
          .eq("id", technicianId)
          .maybeSingle();
        
        if (!branchCheckError && branchCheck) {
          // Es una sucursal
          isBranch = true;
          sucursalId = technicianId;
          actualTechnicianId = null;
          
          // Cargar datos completos de la sucursal
          const { data: branch, error: branchError } = await supabase
            .from("branches")
            .select("*")
            .eq("id", sucursalId)
            .single();
          
          if (!branchError && branch) {
            branchData = branch;
          }
        } else {
          throw techError;
        }
      } else {
        sucursalId = tech?.sucursal_id || null;
        
        // Cargar datos completos de la sucursal por separado
        if (sucursalId) {
          const { data: branch, error: branchError } = await supabase
            .from("branches")
            .select("*")
            .eq("id", sucursalId)
            .single();
          
          if (!branchError && branch) {
            branchData = branch;
          }
        }
      }
    }

    // Preparar datos de inserción
    const orderData: any = {
      order_number: null, // El trigger de BD lo generará automáticamente
      customer_id: selectedCustomer.id,
      technician_id: actualTechnicianId, // NULL para sucursales, technicianId para usuarios normales
      sucursal_id: sucursalId,
      device_type: deviceType || "iphone",
      device_model: deviceModel,
      device_serial_number: deviceSerial || null,
      device_unlock_code: unlockType === "code" ? deviceUnlockCode : null,
      problem_description: problemDescription,
      checklist_data: checklistData,
      replacement_cost: replacementCost,
      labor_cost: serviceValue,
      total_repair_cost: replacementCost + serviceValue,
      priority,
      commitment_date: commitmentDate || null,
      warranty_days: warrantyDays,
      status: "en_proceso",
    };

    // ... resto del código de creación de orden ...
  }
}
```

---

### Paso 3: Modificar CustomerSearch.tsx para Prevenir Duplicados

En el archivo `CustomerSearch.tsx`, en la función `handleCreateCustomer`, reemplaza con esta lógica:

```typescript
async function handleCreateCustomer(e?: React.MouseEvent<HTMLButtonElement>) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
    alert("Por favor completa nombre, email y teléfono");
    return;
  }

  setLoading(true);
  try {
    const email = newCustomer.email.trim().toLowerCase();
    const phone = newCustomer.phone.trim();

    // Primero verificar si ya existe un cliente con ese email y teléfono
    const { data: existingCustomer, error: searchError } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email)
      .eq("phone", phone)
      .maybeSingle();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error buscando cliente:", searchError);
      throw searchError;
    }

    let customerData;

    if (existingCustomer) {
      // Si el cliente ya existe, usar el existente y actualizar campos si es necesario
      const updates: any = {};
      if (newCustomer.name.trim() !== existingCustomer.name) {
        updates.name = newCustomer.name.trim();
      }
      if (newCustomer.address?.trim() && newCustomer.address.trim() !== existingCustomer.address) {
        updates.address = newCustomer.address.trim();
      }
      if (newCustomer.rutDocument?.trim() && newCustomer.rutDocument.trim() !== existingCustomer.rut_document) {
        updates.rut_document = newCustomer.rutDocument.trim();
      }

      if (Object.keys(updates).length > 0) {
        // Actualizar solo si hay cambios
        const { data: updatedCustomer, error: updateError } = await supabase
          .from("customers")
          .update(updates)
          .eq("id", existingCustomer.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error actualizando cliente:", updateError);
          customerData = existingCustomer;
        } else {
          customerData = updatedCustomer;
        }
      } else {
        customerData = existingCustomer;
      }
    } else {
      // Si no existe, crear el nuevo cliente
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: newCustomer.name.trim(),
          email: email,
          phone: phone,
          phone_country_code: newCustomer.phoneCountryCode,
          rut_document: newCustomer.rutDocument?.trim() || null,
          address: newCustomer.address?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        // Si el error es por duplicado, intentar buscar el cliente nuevamente
        if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          const { data: foundCustomer, error: findError } = await supabase
            .from("customers")
            .select("*")
            .eq("email", email)
            .eq("phone", phone)
            .maybeSingle();

          if (findError || !foundCustomer) {
            console.error("Error creando cliente:", error);
            alert(`Error al crear cliente: ${error.message}`);
            setLoading(false);
            return;
          }

          customerData = foundCustomer;
        } else {
          console.error("Error creando cliente:", error);
          alert(`Error al crear cliente: ${error.message}`);
          setLoading(false);
          return;
        }
      } else {
        customerData = data;
      }
    }

    if (customerData) {
      onCustomerSelect(customerData);
      setShowForm(false);
      setSearchTerm(customerData.name);
      setCustomers([]);
      setShowResults(false);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        phoneCountryCode: "+56",
        rutDocument: "",
        address: "",
      });
    }
  } catch (error: any) {
    console.error("Error inesperado:", error);
    alert(`Error inesperado: ${error.message}`);
  } finally {
    setLoading(false);
  }
}
```

---

### Paso 4: Agregar Funcionalidad de Dispositivos No Listados en OrderForm.tsx

En el archivo `OrderForm.tsx`, agrega estos estados:

```typescript
const [showDeviceCategoryModal, setShowDeviceCategoryModal] = useState(false);
const [pendingDeviceModel, setPendingDeviceModel] = useState("");
```

Modifica el `useEffect` que detecta el tipo de dispositivo:

```typescript
useEffect(() => {
  if (deviceModel) {
    const detected = detectDeviceType(deviceModel);
    if (detected) {
      setDeviceType(detected);
      setShowDeviceCategoryModal(false);
    } else {
      // Si no se detecta el tipo pero hay texto, permitir continuar sin tipo
      // El usuario puede seleccionar la categoría manualmente
      setDeviceType(null);
    }
    const suggestions = getSmartSuggestions(deviceModel);
    setDeviceSuggestions(suggestions.slice(0, 5));
    setShowDeviceSuggestions(true);
  } else {
    setDeviceSuggestions([]);
    setShowDeviceSuggestions(false);
    setDeviceType(null);
  }
}, [deviceModel]);
```

Agrega este JSX antes del componente `DeviceChecklist`:

```typescript
{/* Modal para seleccionar categoría de dispositivo */}
{showDeviceCategoryModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Agregar Nuevo Dispositivo
      </h3>
      <p className="text-slate-600 mb-4">
        El dispositivo <strong>"{pendingDeviceModel || deviceModel}"</strong> no está en el listado.
        Por favor, selecciona la categoría del dispositivo:
      </p>
      <div className="space-y-2 mb-6">
        <button
          onClick={() => {
            setDeviceType("iphone");
            setShowDeviceCategoryModal(false);
          }}
          className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
        >
          <span className="font-medium">📱 Celular</span>
          <p className="text-sm text-slate-600">iPhone, Android, etc.</p>
        </button>
        <button
          onClick={() => {
            setDeviceType("ipad");
            setShowDeviceCategoryModal(false);
          }}
          className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
        >
          <span className="font-medium">📱 Tablet</span>
          <p className="text-sm text-slate-600">iPad, Android Tablet, etc.</p>
        </button>
        <button
          onClick={() => {
            setDeviceType("macbook");
            setShowDeviceCategoryModal(false);
          }}
          className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
        >
          <span className="font-medium">💻 Notebook / Laptop</span>
          <p className="text-sm text-slate-600">MacBook, Windows Laptop, etc.</p>
        </button>
        <button
          onClick={() => {
            setDeviceType("apple_watch");
            setShowDeviceCategoryModal(false);
          }}
          className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
        >
          <span className="font-medium">⌚ Smartwatch</span>
          <p className="text-sm text-slate-600">Apple Watch, Android Watch, etc.</p>
        </button>
        <button
          onClick={() => {
            setDeviceType("iphone"); // Usar "iphone" como tipo genérico para "Otro"
            setShowDeviceCategoryModal(false);
          }}
          className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
        >
          <span className="font-medium">🔧 Otro</span>
          <p className="text-sm text-slate-600">Otro tipo de dispositivo</p>
        </button>
      </div>
      <button
        onClick={() => {
          setShowDeviceCategoryModal(false);
          setPendingDeviceModel("");
        }}
        className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
      >
        Cancelar
      </button>
    </div>
  </div>
)}

{/* Botón para agregar categoría si no se detectó tipo */}
{deviceModel && !deviceType && !showDeviceCategoryModal && (
  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
    <p className="text-sm text-amber-800 mb-2">
      No se detectó la categoría del dispositivo. Para mostrar el checklist, selecciona la categoría:
    </p>
    <button
      onClick={() => {
        setPendingDeviceModel(deviceModel);
        setShowDeviceCategoryModal(true);
      }}
      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
    >
      ➕ Agregar Nuevo Dispositivo
    </button>
  </div>
)}
```

---

### Paso 5: Verificar que OrdersTable.tsx Filtre por Sucursal

En el archivo `OrdersTable.tsx`, asegúrate de que al cargar las órdenes, si el usuario es una sucursal, filtre por `sucursal_id`:

```typescript
async function loadOrders() {
  setLoading(true);
  try {
    let query = supabase
      .from("work_orders")
      .select(`
        *,
        customer:customers(*),
        sucursal:branches(*)
      `)
      .order("created_at", { ascending: false });

    // Si el usuario es una sucursal (no tiene auth.uid()), filtrar por sucursal_id
    if (typeof window !== 'undefined') {
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          if (branchSession.type === 'branch' && branchSession.branchId) {
            // Filtrar solo órdenes de esta sucursal
            query = query.eq("sucursal_id", branchSession.branchId);
          }
        } catch (e) {
          console.error("Error parseando branchSession:", e);
        }
      }
    }

    // ... aplicar otros filtros ...

    const { data, error } = await query;

    if (error) throw error;
    setOrders(data || []);
  } catch (error: any) {
    console.error("Error cargando órdenes:", error);
    alert(`Error al cargar órdenes: ${error.message}`);
  } finally {
    setLoading(false);
  }
}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de implementar todas las soluciones:

- [ ] Ejecutado el script SQL completo
- [ ] Verificadas las políticas RLS (usar consultas del script)
- [ ] Modificado `OrderForm.tsx` para detectar sucursales
- [ ] Modificado `CustomerSearch.tsx` para prevenir duplicados
- [ ] Agregada funcionalidad de dispositivos no listados en `OrderForm.tsx`
- [ ] Verificado que `OrdersTable.tsx` filtre por sucursal
- [ ] Probado login como sucursal
- [ ] Probado crear cliente desde sucursal (sin errores RLS)
- [ ] Probado crear orden desde sucursal (sin errores RLS)
- [ ] Probado agregar dispositivo no listado (aparece checklist)
- [ ] Probado ver órdenes creadas desde sucursal (aparecen en la lista)

---

## 📝 NOTAS IMPORTANTES

1. **Seguridad:** Las políticas RLS ahora permiten INSERT sin verificar `auth.uid()`, pero el frontend **DEBE** validar y establecer correctamente `sucursal_id` y `technician_id` según el tipo de usuario.

2. **Filtrado:** Las políticas SELECT permiten ver todas las órdenes cuando `auth.uid() IS NULL`. El frontend **DEBE** filtrar por `sucursal_id` para mostrar solo las órdenes de la sucursal actual.

3. **Sesión de Sucursal:** Las sucursales guardan su sesión en `localStorage` con la clave `branchSession` y el formato:
   ```json
   {
     "type": "branch",
     "branchId": "uuid-de-la-sucursal",
     "branchName": "Nombre de la Sucursal",
     "email": "login_email@ejemplo.com"
   }
   ```

4. **Verificación de Políticas:** Usa estas consultas para verificar que las políticas estén correctas:
   ```sql
   -- Ver políticas de work_orders
   SELECT policyname, cmd, qual, with_check 
   FROM pg_policies 
   WHERE tablename = 'work_orders'
   ORDER BY policyname;
   
   -- Ver políticas de customers
   SELECT policyname, cmd, qual, with_check 
   FROM pg_policies 
   WHERE tablename = 'customers'
   ORDER BY policyname;
   ```

---

## 🎯 RESULTADO ESPERADO

Después de implementar todas las soluciones:

1. ✅ Las sucursales pueden crear clientes sin errores RLS
2. ✅ Las sucursales pueden crear órdenes sin errores RLS
3. ✅ No hay errores "cannot coerce the result to a single json object"
4. ✅ No hay errores de clientes duplicados
5. ✅ Los usuarios pueden agregar dispositivos no listados y seleccionar su categoría para mostrar el checklist
6. ✅ Las órdenes creadas desde sucursales se pueden ver en la lista
7. ✅ Todo el flujo de creación de órdenes funciona correctamente desde sucursales

---

**Este prompt contiene todas las soluciones necesarias para resolver los problemas de permisos y funcionalidad en un sistema idéntico.**


