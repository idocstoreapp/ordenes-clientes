# Prompt para Migración de Mejoras al Proyecto Duplicado

## Instrucciones para el Asistente de IA

Tengo un proyecto de sistema de gestión de órdenes de reparación que ha sido mejorado significativamente. He copiado la carpeta completa del proyecto mejorado y la he pegado en otro directorio para otra empresa. Necesito que me ayudes a aplicar todas las mejoras y correcciones que se hicieron en el proyecto original.

## Contexto del Proyecto

Este es un sistema de gestión de órdenes de reparación de dispositivos móviles construido con:
- **Frontend**: Astro + React + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **PDF Generation**: jsPDF
- **Autenticación**: Supabase Auth

## Problemas que se Resolvieron

### 1. **Validación de Formularios de Órdenes**
- Problema: Validación inconsistente de campos de equipos, errores intermitentes en diferentes sucursales
- Solución: Validación robusta con `.trim()`, verificación de valores numéricos, validación de checklist antes de submit

### 2. **Sistema de Precios de Servicios**
- Problema: Solo se podía ingresar un precio total por equipo, no precios individuales por servicio
- Solución: Sistema de `servicePrices: Record<string, number>` que permite precios individuales por cada servicio seleccionado

### 3. **Generación de PDF - Layout y Formato**
- Problema: PDF no se adaptaba a A4, márgenes excesivos, QR code innecesario, garantías cortadas, texto muy pequeño
- Solución:
  - Formato A4 forzado
  - Eliminación de QR code del header
  - Reducción de márgenes entre secciones
  - Header más compacto (25pt de altura)
  - Cajas de datos de sucursal/cliente con altura fija y texto adaptativo
  - Tamaño de fuente dinámico para garantías (3.5pt - 12pt según cantidad)
  - Garantías ocupan todo el espacio disponible sin desperdiciar

### 4. **Múltiples Equipos en PDF**
- Problema: PDF mostraba todos los equipos primero, luego todos los servicios, sin relación clara. Checklists no se mostraban por equipo.
- Solución: Reorganización completa para mostrar por cada equipo: datos → servicios → checklist → repuesto, en ese orden

### 5. **Separación de Servicios por Equipo**
- Problema: Al ver PDF desde historial, el primer equipo no mostraba sus servicios
- Solución: Lógica de separación basada en orden de inserción, pasando `orderServices` al componente PDFPreview

### 6. **Página de Configuración**
- Problema: Todo en una sola página con mucho scroll
- Solución: Sistema de pestañas (tabs) para organizar: Logos, Checklists, Servicios, Garantías

### 7. **Gestión de Servicios**
- Problema: No había forma de agregar/editar/eliminar servicios desde la interfaz
- Solución: Nuevo componente `ServicesEditor.tsx` con CRUD completo de servicios

### 8. **Notificaciones WhatsApp**
- Problema: Al cambiar estado a "Por entregar", el mensaje de WhatsApp mencionaba PDF en lugar de solo informar el cambio de estado
- Solución: Función `sendWhatsAppNotification` separada que envía solo mensaje de texto informativo

## Archivos Clave que Deben Copiarse/Actualizarse

### Archivos Críticos (Copiar Completos)

1. **`src/react/components/OrderForm.tsx`**
   - Validación mejorada de formularios
   - Sistema de precios individuales por servicio (`servicePrices`)
   - Construcción correcta de `all_devices` con servicios
   - Validación de checklist antes de submit

2. **`src/lib/generate-pdf-blob.ts`**
   - Layout A4 forzado
   - Header compacto sin QR code
   - Márgenes reducidos
   - Cajas de sucursal/cliente con altura fija
   - Loop por equipos mostrando: datos → servicios → checklist
   - Tamaño de fuente dinámico para garantías
   - Garantías ocupan todo el espacio disponible

3. **`src/react/components/PDFPreview.tsx`**
   - Mismas mejoras que `generate-pdf-blob.ts`
   - Lógica de reconstrucción de servicios desde `orderServices`
   - Manejo correcto de `all_devices` y `selected_services`

4. **`src/react/components/OrdersTable.tsx`**
   - Separación correcta de servicios por equipo (basada en orden de inserción)
   - Modal de notificaciones al cambiar estado
   - Función `sendWhatsAppNotification` para mensajes de texto
   - Pasar `orderServices` a PDFPreview

5. **`src/react/components/Settings.tsx`**
   - Sistema de pestañas (tabs)
   - Organización: Logos, Checklists, Servicios, Garantías
   - Integración de `ServicesEditor`

6. **`src/react/components/ServicesEditor.tsx`** (NUEVO ARCHIVO)
   - CRUD completo de servicios
   - Agregar, editar, eliminar servicios
   - Validación de precios

### Archivos de Utilidades (Verificar si existen cambios)

- `src/lib/utils.ts` - Funciones `formatCLPInput` y `parseCLPInput` (si no existen)
- `src/lib/settings.ts` - Función `clearSettingsCache` (si no existe)

## Cambios Específicos por Archivo

### OrderForm.tsx
- Interface `DeviceItem` ahora incluye `servicePrices: Record<string, number>`
- Función `getDeviceServiceTotal(device)` para calcular total de servicios
- UI con inputs individuales de precio por servicio
- Validación: cada servicio debe tener precio > 0
- Construcción de `all_devices` con `selected_services` incluidos

### generate-pdf-blob.ts y PDFPreview.tsx
- Formato A4: `new jsPDF({ format: 'a4', unit: 'pt' })`
- Header height: 25pt (reducido de 32pt)
- Sin QR code
- Panel sucursal/cliente: altura fija igual para ambos
- Loop `allDevices.forEach()` mostrando por equipo:
  - Datos del equipo
  - Servicios (con título "Servicios a realizar - Equipo X:")
  - Checklist (sin título, después de servicios)
  - Repuesto (si aplica)
- Garantías: tamaño de fuente dinámico (3.5pt - 12pt)
- Espaciado reducido entre elementos

### OrdersTable.tsx
- Función `sendWhatsAppNotification` (mensaje de texto, no PDF)
- Separación de servicios: `firstDeviceServicesCount = orderServices.length - additionalDevicesTotalServices`
- Pasar `orderServices` a PDFPreview: `orderServices={pdfOrderData.orderServices}`
- Modal de notificaciones con checkboxes para Email/WhatsApp

### Settings.tsx
- Estado `activeTab: "logos" | "checklists" | "services" | "warranties"`
- Navegación por tabs
- Renderizado condicional de contenido según tab activo
- Importar y usar `ServicesEditor`

## Instrucciones de Migración

1. **Copiar archivos completos** de la lista de "Archivos Críticos" al proyecto destino
2. **Verificar dependencias** en `package.json` (deben ser las mismas)
3. **Verificar estructura de base de datos**:
   - Tabla `order_services` NO debe tener columna `description` (se removió)
   - Tabla `services` debe tener: `id`, `name`, `description`, `default_price`
   - Tabla `work_orders` debe tener campo `all_devices` (JSONB)
4. **Probar funcionalidades**:
   - Crear orden con múltiples equipos y servicios
   - Verificar PDF muestra correctamente servicios por equipo
   - Verificar garantías ocupan todo el espacio
   - Cambiar estado a "Por entregar" y verificar mensaje WhatsApp
   - Agregar/editar servicios en Configuración

## Verificaciones Post-Migración

- [ ] PDF se genera en formato A4
- [ ] Header no tiene QR code
- [ ] Márgenes reducidos entre secciones
- [ ] Garantías ocupan todo el espacio disponible
- [ ] Múltiples equipos muestran: datos → servicios → checklist por cada uno
- [ ] Precios individuales por servicio funcionan
- [ ] Validación de formularios funciona correctamente
- [ ] Página de Configuración tiene tabs
- [ ] Se pueden agregar/editar servicios
- [ ] WhatsApp envía mensaje de texto (no menciona PDF)
- [ ] PDF desde historial muestra servicios del primer equipo correctamente

## Notas Importantes

- El campo `description` fue removido de `order_services` porque no existe en la base de datos
- Los servicios ahora se guardan con precios individuales en `order_services.unit_price` y `order_services.total_price`
- El campo `all_devices` en `work_orders` contiene toda la información de equipos, servicios y checklists
- La lógica de separación de servicios usa el orden de inserción, no IDs o nombres

---

**IMPORTANTE**: Si encuentras errores de compilación o tipos TypeScript, verifica que las interfaces en `src/types.ts` coincidan con las estructuras de datos usadas en estos archivos.
