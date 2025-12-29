# PROMPT: Diseño Móvil Completo para Sistema de Reparaciones

## CONTEXTO DEL PROYECTO

Estás trabajando en un sistema de gestión de reparaciones desarrollado con:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL con RLS)
- **Framework**: Astro
- **Estructura**: Componentes React en `src/react/components/`

## OBJETIVO PRINCIPAL

Convertir TODA la aplicación a diseño móvil responsive, enfocándote especialmente en:
1. **Todas las listas/tablas** de la aplicación
2. **Menús de acciones** de cada elemento de lista
3. **Formularios y modales** responsive
4. **Navegación y sidebar** móvil
5. **KPIs y dashboards** adaptados a móvil

## COMPONENTES CON LISTAS QUE DEBES CONVERTIR

### 1. **OrdersTable.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/OrdersTable.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: 
  - Tabla desktop: `hidden lg:block`
  - Cards móvil: `lg:hidden space-y-3`
  - Modal de acciones para móvil
  - Botón "Ver acciones" con dropdown

### 2. **AdminReports.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/AdminReports.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: Cards con información de órdenes, modal de historial

### 3. **SupplierPurchases.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/SupplierPurchases.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: Cards con información de compras a proveedores

### 4. **UserManagement.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/UserManagement.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: Cards con información de usuarios y botones de acción

### 5. **SmallExpenses.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/SmallExpenses.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: Cards con gastos hormiga, botones de editar/eliminar para admins

### 6. **GeneralExpenses.tsx** (YA CONVERTIDO - USAR COMO REFERENCIA)
- **Ubicación**: `src/react/components/GeneralExpenses.tsx`
- **Estado**: ✅ Ya tiene diseño móvil implementado
- **Patrón usado**: Cards con gastos generales, botones de editar/eliminar para admins

### 7. **TechnicianPayments.tsx** (REVISAR Y MEJORAR)
- **Ubicación**: `src/react/components/TechnicianPayments.tsx`
- **Estado**: ⚠️ Revisar si tiene diseño móvil completo
- **Acciones**: Ver pagos, ajustes de sueldo, liquidaciones

### 8. **WeeklyReport.tsx** (REVISAR Y MEJORAR)
- **Ubicación**: `src/react/components/WeeklyReport.tsx`
- **Estado**: ⚠️ Revisar si tiene modal para ajustes de sueldo en móvil
- **Acciones**: Ajustes de sueldo, ver reporte semanal

### 9. **AdminDashboard.tsx** (REVISAR Y MEJORAR)
- **Ubicación**: `src/react/components/AdminDashboard.tsx`
- **Estado**: ⚠️ Revisar KPIs y diseño responsive
- **Contenido**: KPIs, resúmenes, gráficos

### 10. **EncargadoDashboard.tsx** (REVISAR Y MEJORAR)
- **Ubicación**: `src/react/components/EncargadoDashboard.tsx`
- **Estado**: ⚠️ Revisar diseño responsive
- **Contenido**: KPIs de sucursal, órdenes actuales

### 11. **BranchExpensesPage.tsx** (REVISAR Y MEJORAR)
- **Ubicación**: `src/react/components/BranchExpensesPage.tsx`
- **Estado**: ⚠️ Revisar KPIs y filtros en móvil
- **Contenido**: KPIs de sucursales, filtros de fecha, resúmenes

## PATRÓN DE DISEÑO MÓVIL A SEGUIR

### Estructura Base para Listas

```tsx
{/* Vista de Cards para Móvil */}
<div className="lg:hidden space-y-3">
  {items.length === 0 ? (
    <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
      No hay elementos registrados
    </div>
  ) : (
    items.map((item) => (
      <div
        key={item.id}
        className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
      >
        {/* Información principal del item */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-0.5">Etiqueta</div>
            <div className="text-sm font-medium text-slate-900">{item.value}</div>
          </div>
          {/* Badge o estado */}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            Estado
          </span>
        </div>

        {/* Información secundaria */}
        <div className="mb-2">
          <div className="text-xs text-slate-500 mb-0.5">Campo</div>
          <div className="text-sm text-slate-900">{item.field}</div>
        </div>

        {/* Información adicional agrupada */}
        <div className="border-t border-slate-200 pt-2 mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Campo 1:</span>
            <span className="text-sm font-medium text-slate-700">{item.field1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Campo 2:</span>
            <span className="text-sm font-medium text-slate-700">{item.field2}</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
          <button
            onClick={() => handleAction1(item.id)}
            className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => handleAction2(item.id)}
            className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    ))
  )}
</div>

{/* Vista de Tabla para Desktop */}
<div className="hidden lg:block overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-slate-200">
        <th className="text-left py-2 px-2 font-semibold text-slate-700">Columna 1</th>
        <th className="text-left py-2 px-2 font-semibold text-slate-700">Columna 2</th>
        {/* ... más columnas */}
        <th className="text-left py-2 px-2 font-semibold text-slate-700">Acciones</th>
      </tr>
    </thead>
    <tbody>
      {items.length === 0 ? (
        <tr>
          <td colSpan={totalColumns} className="text-center py-4 text-slate-500">
            No hay elementos registrados
          </td>
        </tr>
      ) : (
        items.map((item) => (
          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-2 px-2">{item.field1}</td>
            <td className="py-2 px-2">{item.field2}</td>
            {/* ... más celdas */}
            <td className="py-2 px-2">
              <div className="flex gap-2">
                <button onClick={() => handleAction1(item.id)}>Editar</button>
                <button onClick={() => handleAction2(item.id)}>Eliminar</button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
```

### Patrón para Menús de Acciones (Dropdown)

```tsx
const [actionsMenuOpen, setActionsMenuOpen] = useState<string | null>(null);

// En el card móvil:
<button
  onClick={() => setActionsMenuOpen(actionsMenuOpen === item.id ? null : item.id)}
  className="w-full px-4 py-2 bg-brand-light text-white rounded-md text-sm font-medium hover:bg-brand transition"
>
  Ver acciones
</button>

{actionsMenuOpen === item.id && (
  <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
    <button
      onClick={() => {
        handleAction1(item.id);
        setActionsMenuOpen(null);
      }}
      className="w-full text-left px-3 py-2 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
    >
      ✏️ Editar
    </button>
    <button
      onClick={() => {
        handleAction2(item.id);
        setActionsMenuOpen(null);
      }}
      className="w-full text-left px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
    >
      📄 Ver detalles
    </button>
    <button
      onClick={() => {
        handleAction3(item.id);
        setActionsMenuOpen(null);
      }}
      className="w-full text-left px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
    >
      🗑️ Eliminar
    </button>
  </div>
)}
```

### Patrón para Modales en Móvil

```tsx
const [modalOpen, setModalOpen] = useState<string | null>(null);

{modalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(null)}>
    <div className="bg-white rounded-lg p-5 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-slate-700">Título del Modal</h3>
        <button onClick={() => setModalOpen(null)} className="text-slate-400 hover:text-slate-600 text-lg">
          ✕
        </button>
      </div>
      
      {/* Contenido del modal */}
      <div className="space-y-4 text-sm">
        {/* Formulario o información */}
      </div>
      
      {/* Botones de acción */}
      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200">
        <button onClick={() => setModalOpen(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm">
          Cancelar
        </button>
        <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-brand-light text-white rounded-md text-sm">
          Guardar
        </button>
      </div>
    </div>
  </div>
)}
```

## INSTRUCCIONES ESPECÍFICAS

### 1. BUSCAR TODOS LOS COMPONENTES CON LISTAS

Ejecuta estas búsquedas en el código:
- Buscar: `table className` o `<table`
- Buscar: `.map(` seguido de elementos de lista
- Buscar: `useState<.*\[\]>` para identificar estados de arrays
- Buscar componentes que rendericen múltiples elementos

### 2. PARA CADA COMPONENTE CON LISTA:

#### a) Identificar la estructura de datos
- ¿Qué campos muestra cada item?
- ¿Qué acciones tiene cada item?
- ¿Hay filtros o búsquedas?

#### b) Crear diseño móvil
- Convertir tabla a cards usando el patrón base
- Agrupar información relacionada
- Usar jerarquía visual (tamaños de texto, colores, espaciado)
- Mantener información esencial visible
- Mover detalles secundarios a secciones expandibles o modales

#### c) Implementar menús de acciones
- Si hay más de 2 acciones, usar botón "Ver acciones" con dropdown
- Si hay 1-2 acciones, mostrar botones directos
- Todas las acciones deben ser accesibles desde móvil
- Usar iconos cuando sea apropiado (✏️, 🗑️, 📄, etc.)

#### d) Hacer formularios responsive
- Inputs a ancho completo en móvil
- Grids adaptativos: `grid-cols-1 sm:grid-cols-2`
- Botones apilados en móvil: `flex-col gap-2`
- Modales para formularios complejos en móvil

#### e) Adaptar KPIs y dashboards
- Grids responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Texto más grande en móvil si es necesario
- Scroll horizontal solo si es absolutamente necesario
- Cards con padding adecuado: `p-4 sm:p-6`

### 3. BREAKPOINTS DE TAILWIND A USAR

- `sm:` - 640px+ (tablets pequeñas)
- `md:` - 768px+ (tablets)
- `lg:` - 1024px+ (desktop)
- `xl:` - 1280px+ (desktop grande)

**Regla general**: 
- Móvil: diseño por defecto (sin prefijo)
- Desktop: usar `lg:` para ocultar/mostrar elementos

### 4. ELEMENTOS A REVISAR EN CADA COMPONENTE

- [ ] Header/Navegación responsive
- [ ] Sidebar móvil (ya implementado en `Sidebar.tsx`)
- [ ] Filtros y búsquedas responsive
- [ ] Listas/Tablas convertidas a cards
- [ ] Menús de acciones accesibles
- [ ] Modales responsive
- [ ] Formularios responsive
- [ ] KPIs y resúmenes responsive
- [ ] Botones con tamaño adecuado para touch
- [ ] Texto legible (mínimo 12px, preferible 14px+)
- [ ] Espaciado adecuado entre elementos
- [ ] Sin scroll horizontal innecesario

### 5. COMPONENTES ESPECÍFICOS A REVISAR

#### Dashboard.tsx
- Header responsive ✅ (ya implementado)
- Logo tamaño adecuado ✅ (ya duplicado)
- Sidebar toggle ✅ (ya implementado)

#### Sidebar.tsx
- Ya tiene diseño móvil ✅
- Verificar que funcione correctamente

#### TechnicianPayments.tsx
- Lista de técnicos → Cards móvil
- Lista de pagos → Cards móvil
- Ajustes de sueldo → Modal en móvil
- Liquidaciones → Cards o modal

#### WeeklyReport.tsx
- Reporte semanal → Cards móvil
- Ajustes de sueldo → Modal en móvil (ya implementado parcialmente)
- Verificar que el modal funcione bien

#### AdminDashboard.tsx
- KPIs → Grid responsive
- Gráficos → Responsive o scroll horizontal controlado
- Resúmenes → Cards móvil

#### EncargadoDashboard.tsx
- KPIs → Grid responsive
- Órdenes actuales → Ya usa OrdersTable (debe estar bien)

#### BranchExpensesPage.tsx
- KPIs globales → Grid responsive
- Selector de sucursal → Responsive
- Filtros de fecha → Responsive
- Resúmenes → Cards móvil

## EJEMPLOS DE CÓDIGO DE REFERENCIA

### Ejemplo 1: OrdersTable (Completo y funcional)
Ver: `src/react/components/OrdersTable.tsx`
- Líneas 1000-1200: Cards móvil
- Líneas 1200-1400: Tabla desktop
- Líneas 1400-1600: Modales de acciones

### Ejemplo 2: UserManagement (Completo y funcional)
Ver: `src/react/components/UserManagement.tsx`
- Líneas 357-436: Cards móvil
- Líneas 438-550: Tabla desktop

### Ejemplo 3: SmallExpenses (Completo y funcional)
Ver: `src/react/components/SmallExpenses.tsx`
- Cards móvil con botones de editar/eliminar
- Tabla desktop con columna de acciones

## CHECKLIST FINAL

Antes de considerar el trabajo completo, verifica:

- [ ] Todas las listas tienen diseño móvil (cards)
- [ ] Todas las tablas tienen versión desktop (oculta en móvil)
- [ ] Todos los menús de acciones funcionan en móvil
- [ ] Todos los formularios son responsive
- [ ] Todos los modales son responsive
- [ ] Todos los KPIs son responsive
- [ ] No hay scroll horizontal innecesario
- [ ] Todos los botones tienen tamaño adecuado para touch (mínimo 44x44px)
- [ ] El texto es legible en móvil (mínimo 12px)
- [ ] El espaciado es adecuado
- [ ] La navegación funciona bien en móvil
- [ ] Los filtros y búsquedas funcionan en móvil

## NOTAS IMPORTANTES

1. **NO elimines funcionalidad**: Solo rediseña, no cambies la lógica de negocio
2. **Mantén consistencia**: Usa los mismos patrones en todos los componentes
3. **Prueba en diferentes tamaños**: Verifica que funcione en móvil, tablet y desktop
4. **Accesibilidad**: Asegúrate de que los botones sean lo suficientemente grandes para touch
5. **Performance**: No agregues complejidad innecesaria, mantén el código simple

## COMANDOS ÚTILES

```bash
# Buscar componentes con tablas
grep -r "<table" src/react/components/

# Buscar componentes con .map(
grep -r "\.map(" src/react/components/

# Buscar estados de arrays
grep -r "useState<.*\[\]>" src/react/components/
```

## RESULTADO ESPERADO

Al finalizar, toda la aplicación debe:
- Ser completamente responsive
- Tener diseño móvil elegante y funcional
- Mantener toda la funcionalidad existente
- Tener consistencia visual en todos los componentes
- Ser fácil de usar en dispositivos móviles

---

**IMPORTANTE**: Usa los componentes ya convertidos (OrdersTable, AdminReports, SupplierPurchases, UserManagement, SmallExpenses, GeneralExpenses) como referencia para mantener consistencia en el diseño.





