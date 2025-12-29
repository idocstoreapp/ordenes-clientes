<div align="center">

# Sistema de Gestión de Órdenes de Servicio Técnico

![Logo IDoc STORE](sistema-reparaciones/public/logo.png)

---

## Sistema de Gestión de Órdenes de Servicio Técnico

### Documento de Presentación y Manual de Uso

---

*Desarrollado para optimizar y modernizar las operaciones de servicio técnico especializado en dispositivos Apple*

---

</div>

## Índice

1. [Introducción](#introducción)
2. [Flujo General de la Aplicación](#flujo-general-de-la-aplicación)
3. [Dashboard Administrativo](#dashboard-administrativo)
4. [Gestión de Órdenes de Trabajo](#gestión-de-órdenes-de-trabajo)
5. [Gestión de Clientes](#gestión-de-clientes)
6. [Prioridades y Responsables](#prioridades-y-responsables)
7. [Sucursales y Usuarios](#sucursales-y-usuarios)
8. [Documento PDF de la Orden](#documento-pdf-de-la-orden)
9. [Comunicación con el Cliente (WhatsApp)](#comunicación-con-el-cliente-whatsapp)
10. [Experiencia de Usuario y Diseño](#experiencia-de-usuario-y-diseño)
11. [Conclusión](#conclusión)

---

## 1. Introducción

### ¿Qué Problema Resuelve el Sistema?

El sistema de gestión de órdenes de servicio técnico fue desarrollado específicamente para optimizar y organizar las operaciones de un servicio técnico especializado en la reparación de dispositivos Apple, incluyendo iPhone, iPad, Apple Watch y MacBook.

### Problemas que Resuelve:

- **Desorganización**: Mantiene un registro ordenado de todas las reparaciones realizadas
- **Pérdida de Información**: Almacena de forma segura el historial completo de cada dispositivo y cliente
- **Comunicación Ineficiente**: Facilita la comunicación con clientes mediante WhatsApp
- **Falta de Control**: Permite visualizar métricas y estadísticas del negocio en tiempo real
- **Gestión Manual**: Elimina la necesidad de llevar registros en papel o planillas Excel

### A Quién Está Dirigido

Este sistema está diseñado para:

- **Técnicos**: Quienes realizan las reparaciones y necesitan registrar órdenes de trabajo de forma rápida y eficiente
- **Recepcionistas**: Personal que atiende a los clientes y necesita acceder al historial de reparaciones
- **Encargados**: Supervisores de sucursales que requieren controlar gastos y operaciones
- **Administradores**: Dueños y gerentes que necesitan tomar decisiones basadas en datos precisos

### Beneficios para el Negocio

- ✅ **Ahorro de Tiempo**: Registro rápido de órdenes sin necesidad de llenar formularios extensos
- ✅ **Mayor Organización**: Todas las órdenes, clientes y repuestos centralizados en un solo lugar
- ✅ **Mejor Comunicación**: Envío rápido de diagnósticos y actualizaciones a clientes vía WhatsApp
- ✅ **Control Financiero**: Visualización clara de ingresos, gastos y comisiones
- ✅ **Escalabilidad**: Sistema preparado para crecer junto con el negocio
- ✅ **Acceso desde Cualquier Lugar**: Funciona en computadores, tablets y teléfonos móviles

---

## 2. Flujo General de la Aplicación

### Paso 1: Inicio de Sesión

El usuario accede al sistema mediante su correo electrónico y contraseña. El sistema utiliza autenticación segura a través de Google Login, garantizando que solo personal autorizado tenga acceso.

### Paso 2: Acceso al Dashboard

Una vez iniciada la sesión, el usuario accede automáticamente a su dashboard personalizado según su rol:

- **Técnicos**: Ven sus órdenes, estadísticas semanales y mensuales
- **Encargados**: Acceden a la información de su sucursal y gastos
- **Administradores**: Visualizan métricas globales de todas las sucursales

### Paso 3: Visualización de Métricas

El dashboard muestra información clave en tiempo real:

- Órdenes pendientes y completadas
- Ventas del día y del mes
- Equipos en reparación
- Equipos listos para entregar
- Equipos en garantía

### Paso 4: Creación de Nueva Orden

Desde el dashboard, el usuario puede crear una nueva orden de trabajo. Este proceso incluye:

1. Selección o creación del cliente
2. Selección del dispositivo (iPhone, iPad, MacBook, Apple Watch)
3. Registro del diagnóstico con checklist dinámico
4. Agregado de servicios y repuestos
5. Establecimiento de prioridad y fecha de compromiso
6. Asignación a técnico y sucursal

### Paso 5: Gestión de Estados

Una vez creada la orden, se puede actualizar su estado:

- **En Proceso**: Equipo en reparación
- **Por Entregar**: Reparación completada, esperando entrega
- **Entregada**: Equipo entregado al cliente
- **Rechazada**: Cliente rechazó la reparación
- **Sin Solución**: No se pudo reparar
- **Garantía**: Equipo devuelto en garantía

### Paso 6: Comunicación con Cliente

El sistema permite enviar mensajes rápidos al cliente vía WhatsApp, incluyendo:

- Diagnósticos con imágenes
- Solicitudes de aprobación
- Notificaciones de cambios de estado
- Información de reparación completada

### Paso 7: Generación de Documentos

Cuando una orden está lista, se puede generar un documento PDF profesional que incluye:

- Datos de la empresa y sucursal
- Información del cliente
- Detalle completo de equipos y servicios
- Totales y formas de pago
- Políticas y garantías
- Código QR para seguimiento online

---

## 3. Dashboard Administrativo

El dashboard administrativo es el panel de control central del sistema, diseñado para proporcionar una visión completa del negocio en tiempo real.

### Métricas Principales

#### Ventas del Día
Muestra el total de ingresos registrados en el día actual, incluyendo todas las órdenes pagadas durante la jornada.

#### Ventas del Mes
Presenta el total acumulado de ventas del mes en curso, permitiendo hacer comparaciones con meses anteriores.

#### Equipos en Reparación
Contador que muestra cuántos dispositivos están actualmente siendo reparados, ayudando a gestionar la carga de trabajo.

#### Equipos Listos para Entregar
Indica cuántos equipos tienen la reparación completada y están listos para ser entregados a sus clientes.

#### Equipos en Garantía
Muestra el número de dispositivos que han sido devueltos y están en proceso de garantía.

### Visualización

Todas estas métricas se presentan en tarjetas (cards) visuales y coloridas, con iconos que facilitan su identificación rápida. Los valores se actualizan automáticamente a medida que se crean nuevas órdenes o se actualizan los estados.

### Filtros y Reportes

El dashboard permite filtrar información por:
- Período de tiempo (día, semana, mes, rango personalizado)
- Sucursal específica
- Técnico específico
- Estado de las órdenes

Estos filtros permiten realizar análisis detallados y generar reportes personalizados según las necesidades del negocio.

---

## 4. Gestión de Órdenes de Trabajo

### Listado de Órdenes

El sistema presenta todas las órdenes de trabajo en una tabla clara y organizada que muestra:

#### Información Visible en Cada Orden

- **Número de Orden**: Identificador único de la reparación
- **Fecha**: Fecha de creación de la orden
- **Cliente**: Nombre del cliente dueño del dispositivo
- **Dispositivo**: Tipo y modelo del equipo (ej: iPhone 13 Pro Max)
- **Servicio**: Descripción del trabajo realizado
- **Prioridad**: Indicador visual con colores (Baja/Media/Urgente)
- **Estado**: Estado actual de la orden (En proceso, Por entregar, Entregada, etc.)
- **Fecha Compromiso**: Fecha acordada para la entrega
- **Técnico**: Nombre del técnico asignado
- **Sucursal**: Sucursal donde se está realizando la reparación
- **Total**: Monto total cobrado por la reparación

#### Filtros Disponibles

El listado de órdenes permite filtrar por diferentes criterios:

- **Por Estado**:
  - En proceso
  - Por entregar
  - Entregadas
  - Rechazadas
  - Sin solución
  - Garantía

- **Por Período**:
  - Todas las semanas
  - Semana actual
  - Rango personalizado (desde/hasta)

- **Búsqueda por Número**: Permite buscar rápidamente una orden específica escribiendo su número

### Creación de una Orden

La creación de una orden es un proceso intuitivo y completo que guía al usuario paso a paso:

#### 1. Selección o Creación de Dispositivo

**Categorías de Dispositivos Disponibles**:

- **Teléfono**: iPhone (modelos desde iPhone 6 hasta iPhone 17)
- **Tablet**: iPad (iPad, iPad Air, iPad Pro, iPad mini)
- **Smartwatch**: Apple Watch (Series 7, 8, 9, SE, Ultra)
- **Notebook**: MacBook (MacBook Air, MacBook Pro, modelos M1, M2, M3, M4)

**Funcionalidad de Autocompletado**:

El sistema cuenta con una base de datos inteligente que sugiere automáticamente modelos de dispositivos mientras el usuario escribe. Por ejemplo:

- Al escribir "iPhone 13", el sistema sugiere: iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max
- Al escribir "MacBook", sugiere: MacBook Air M1, MacBook Pro M2, etc.

**Marca y Modelo**:

El usuario puede escribir directamente el dispositivo completo, por ejemplo:
- Apple iPhone 13 Pro Max
- Apple MacBook Air M2
- Apple iPad Pro 12.9"

#### 2. Checklist Dinámico por Dispositivo

Una vez seleccionado el dispositivo, el sistema presenta automáticamente un checklist de verificación que cambia según el tipo de equipo:

**Para iPhone**:
- ✓ Cámara frontal
- ✓ Cámara trasera
- ✓ Señal
- ✓ Altavoces
- ✓ Face ID / Touch ID
- ✓ WiFi
- ✓ Bluetooth
- ✓ Sensores (Acelerómetro, Giroscopio)
- ✓ Botones (Volumen, Power, Home)
- ✓ Pantalla (Táctil, visual)

**Para iPad**:
- ✓ Cámara frontal
- ✓ Cámara trasera
- ✓ WiFi
- ✓ Bluetooth
- ✓ Touch ID / Face ID
- ✓ Altavoces
- ✓ Puerto de carga (Lightning/USB-C)
- ✓ Pantalla (Táctil, visual)

**Para Apple Watch**:
- ✓ Pantalla
- ✓ Corona Digital
- ✓ Botón lateral
- ✓ Sensores (Corazón, ECG)
- ✓ Cargador magnético
- ✓ Altavoz
- ✓ Micrófono

**Para MacBook**:
- ✓ Pantalla
- ✓ Teclado
- ✓ Trackpad
- ✓ Cámara
- ✓ Altavoces
- ✓ Puertos (USB-C, Thunderbolt, HDMI)
- ✓ Batería
- ✓ Ventiladores

Este checklist permite registrar el estado inicial del dispositivo antes de comenzar la reparación, lo cual es útil para:
- Documentar daños previos
- Evitar reclamos por daños no relacionados
- Proporcionar un diagnóstico profesional al cliente

#### 3. Datos Técnicos

**Número de Serie**:
Campo para registrar el número de serie del dispositivo, permitiendo un seguimiento único de cada equipo.

**Código / Patrón de Desbloqueo**:
El sistema permite registrar códigos de acceso o mostrar un patrón visual interactivo donde el usuario puede dibujar el patrón de desbloqueo del dispositivo. Esto ayuda a:
- Desbloquear el dispositivo durante la reparación
- Probar funcionalidades después de la reparación
- Mantener un registro seguro de la información de acceso

#### 4. Descripción del Problema

Campo de texto libre donde el técnico puede describir detalladamente:
- El problema reportado por el cliente
- Síntomas observados
- Observaciones iniciales
- Diagnóstico preliminar

#### 5. Servicios de Reparación

**Selección desde Lista**:
El sistema incluye una lista predefinida de servicios comunes:
- Cambio de pantalla
- Cambio de batería
- Reparación de cámara
- Reparación de conector de carga
- Reparación de botones
- Reparación de altavoces
- Reparación de sensores
- Reparación de placa madre
- Y muchos más...

**Agregar Servicios Nuevos**:
Si el servicio requerido no está en la lista, el usuario puede agregarlo directamente, permitiendo que el sistema crezca y se adapte a las necesidades específicas del negocio.

**Múltiples Servicios**:
Una orden puede incluir múltiples servicios. Por ejemplo:
- Cambio de pantalla
- Cambio de batería
- Reparación de cámara trasera

**Costos**:

**Repuesto (Opcional)**:
- Campo para registrar el costo del repuesto utilizado
- Permite vincular con proveedores
- Se puede dejar en $0 si no se requiere repuesto

**Mano de Obra (Obligatoria, excepto garantía)**:
- Costo del trabajo realizado
- Calculado automáticamente si se usa una tabla de precios
- Puede ser $0 solo en casos de garantía

**Precio Total**:
El sistema calcula automáticamente el precio total sumando:
- Costo del repuesto
- Mano de obra
- Impuestos (si aplican)

#### 6. Garantía del Trabajo

**Tiempo de Garantía Configurable**:
El sistema permite establecer el tiempo de garantía para cada reparación:
- 30 días (estándar)
- 60 días
- 90 días
- Personalizado

Esta información se incluye automáticamente en el documento PDF generado para el cliente.

#### 7. Medio de Pago

El sistema permite registrar cómo fue pagada la orden:
- **Efectivo**
- **Tarjeta** (Crédito/Débito)
- **Transferencia** (Bancaria)

Si la orden se crea sin método de pago, el estado queda como "Pendiente" y se puede actualizar posteriormente cuando se reciba el pago.

#### 8. Número de Recibo/Boleta

Campo para registrar el número de recibo o boleta emitida al cliente. El sistema permite:
- Ingresar el número manualmente
- Pegar enlaces de sistemas externos (como Bsale)
- Guardar la URL del recibo para acceso rápido

### Edición de Órdenes

Una vez creada, cualquier orden puede ser editada para:
- Actualizar el estado
- Agregar o modificar servicios
- Actualizar costos
- Agregar el número de recibo
- Modificar la fecha de compromiso
- Cambiar la prioridad

### Eliminación de Órdenes

Las órdenes solo pueden ser eliminadas por usuarios con rol de Administrador, garantizando la integridad de los datos y el historial completo de reparaciones.

---

## 5. Gestión de Clientes

### Búsqueda de Clientes

El sistema permite buscar clientes existentes mediante:
- Nombre completo o parcial
- Correo electrónico
- Número de teléfono
- Número de documento/RUT

Esta búsqueda rápida evita duplicar información y permite acceder inmediatamente al historial completo de reparaciones del cliente.

### Creación de Nuevos Clientes

Si el cliente no existe en el sistema, se puede crear un nuevo registro proporcionando:

#### Datos Básicos del Cliente

**Nombre** (Obligatorio):
- Nombre completo del cliente
- Permite búsquedas rápidas posteriormente

**Correo Electrónico** (Obligatorio):
- Dirección de correo electrónica válida
- Se utiliza para envío de documentos y comunicaciones
- Debe ser único en el sistema

**Teléfono con Prefijo y Bandera**:
- El sistema incluye un selector de país con bandera visual
- Prefijo automático según el país seleccionado
- Facilita la comunicación vía WhatsApp
- Ejemplo: +56 9 1234 5678 (Chile)

**Identificación / RUT**:
- Número de documento de identidad
- Para clientes chilenos: RUT con formato XX.XXX.XXX-X
- Útil para facturación y reportes fiscales

**Dirección** (Opcional):
- Dirección completa del cliente
- Útil para entregas a domicilio o envíos
- Puede dejarse vacío si no es necesaria

### Historial de Reparaciones

Una de las funcionalidades más valiosas del sistema es el historial completo de reparaciones por cliente. Al acceder al perfil de un cliente, se puede ver:

- **Lista de todas las órdenes** asociadas a ese cliente
- **Fechas de cada reparación**
- **Dispositivos reparados** (todos los equipos de ese cliente)
- **Servicios realizados**
- **Estados de cada orden**
- **Montos cobrados**

Este historial permite:
- Ofrecer servicios personalizados basados en reparaciones anteriores
- Identificar clientes frecuentes
- Hacer seguimiento de garantías
- Generar reportes de fidelización

---

## 6. Prioridades y Responsables

### Prioridades

Cada orden puede tener una prioridad asignada que ayuda a organizar el trabajo diario:

#### Niveles de Prioridad

**🔵 Baja**:
- Órdenes que no tienen urgencia
- Color azul para identificación visual
- Tiempo de entrega estándar

**🟡 Media**:
- Órdenes normales
- Color amarillo/naranja para identificación
- Tiempo de entrega intermedio

**🔴 Urgente**:
- Órdenes que requieren atención inmediata
- Color rojo para destacar visualmente
- Prioridad en el listado de órdenes

#### Visualización en el Listado

Las prioridades se muestran mediante colores en la tabla de órdenes, permitiendo identificar rápidamente cuáles requieren atención inmediata.

### Fecha de Compromiso

Cada orden incluye una fecha de compromiso, que es la fecha acordada con el cliente para la entrega del equipo reparado. Esta fecha:

- Se establece al crear la orden
- Puede modificarse si es necesario
- Se muestra destacada en el listado
- El sistema puede generar alertas si se acerca la fecha sin completar la reparación

### Asignación

#### Sucursal

Cada orden se asigna automáticamente a la sucursal del técnico que la crea. Esto permite:
- Organizar órdenes por ubicación física
- Generar reportes por sucursal
- Controlar gastos por ubicación
- Asignar recursos según la carga de trabajo

**Las 7 Sucursales Disponibles**:
1. Tienda Mall Trebol
2. Tienda Providencia
3. Tienda Puente Alto
4. Tienda Maipu
5. Tienda Concepcion
6. Tienda Santiago
7. Tienda Apumanque

#### Técnico (Opcional)

Además de la sucursal, se puede asignar un técnico específico a cada orden. Esto es útil cuando:
- Se requiere experiencia específica en cierto tipo de reparación
- Se quiere distribuir la carga de trabajo equitativamente
- Se necesita hacer seguimiento del rendimiento individual

Si no se asigna un técnico específico, la orden queda disponible para cualquier técnico de la sucursal.

---

## 7. Sucursales y Usuarios

### Gestión de Sucursales

El sistema permite administrar hasta 7 sucursales de forma independiente. Para cada sucursal se puede configurar:

#### Información de la Sucursal

**Logo**:
- Subir el logo de la sucursal
- Se utiliza en los documentos PDF generados
- Se muestra en el dashboard de la sucursal

**Razón Social**:
- Nombre legal de la sucursal
- Aparece en documentos oficiales
- Puede ser diferente al nombre comercial

**Dirección**:
- Dirección completa de la sucursal
- Incluye calle, número, comuna, ciudad
- Útil para documentos y comunicaciones

**Teléfono**:
- Número de contacto de la sucursal
- Se incluye en documentos PDF
- Permite a los clientes contactar directamente

#### Configuración de Sucursales

Todas las sucursales se pueden gestionar desde el panel de administración, permitiendo:
- Agregar nuevas sucursales
- Editar información existente
- Activar o desactivar sucursales
- Ver estadísticas por sucursal

### Gestión de Usuarios

El sistema incluye diferentes tipos de usuarios, cada uno con permisos específicos:

#### Tipos de Usuarios

**Administrador**:
- Acceso completo al sistema
- Puede ver todas las órdenes de todas las sucursales
- Puede crear, editar y eliminar órdenes
- Gestión completa de usuarios y sucursales
- Acceso a reportes y estadísticas globales
- Único rol que puede eliminar órdenes

**Encargado**:
- Acceso a la información de su sucursal asignada
- Puede ver órdenes de su sucursal
- Gestión de gastos de la sucursal (gastos hormiga)
- Visualización de KPIs de su sucursal
- No puede eliminar órdenes ni gestionar usuarios

**Técnico**:
- Acceso a sus propias órdenes
- Crear nuevas órdenes
- Editar órdenes que ha creado
- Ver sus estadísticas personales (comisiones, ganancias)
- No puede eliminar órdenes ni ver información de otros técnicos

**Recepcionista**:
- Acceso a ver órdenes y clientes
- Buscar información para atender clientes
- No puede crear ni modificar órdenes
- Acceso limitado para consultas

#### Creación y Gestión de Usuarios

Los administradores pueden:

**Crear Nuevos Usuarios**:
- Nombre completo
- Correo electrónico (único)
- Contraseña inicial
- Rol asignado
- Sucursal asignada (si aplica)

**Editar Usuarios Existentes**:
- Modificar información personal
- Cambiar rol (con restricciones)
- Reasignar sucursal
- Activar o desactivar cuenta

**Eliminar Usuarios**:
- Solo administradores pueden eliminar usuarios
- Se mantiene el historial de órdenes creadas por usuarios eliminados
- La eliminación es permanente y requiere confirmación

---

## 8. Documento PDF de la Orden

El sistema genera automáticamente un documento PDF profesional para cada orden de trabajo. Este documento puede imprimirse o enviarse por correo electrónico al cliente.

### Contenido del PDF

#### Encabezado

**Logo y Datos de la Empresa**:
- Logo de la sucursal (si está configurado)
- Nombre de la empresa
- Razón social
- Dirección completa de la sucursal
- Teléfono de contacto
- Correo electrónico

**Información de la Orden**:
- Número de orden (único)
- Fecha de creación
- Fecha de compromiso de entrega
- Estado actual de la orden

#### Datos del Cliente

**Información Completa**:
- Nombre completo
- Correo electrónico
- Teléfono con prefijo
- Dirección (si está registrada)
- Número de documento/RUT

#### Detalle de Equipos y Servicios

**Equipo Reparado**:
- Marca y modelo completo
- Número de serie (si fue registrado)
- Descripción del problema reportado

**Servicios Realizados**:
- Lista detallada de todos los servicios
- Descripción de cada servicio
- Cantidad (si aplica)
- Precio unitario
- Subtotal por servicio

**Repuestos Utilizados**:
- Nombre del repuesto
- Cantidad
- Precio unitario
- Subtotal

#### Totales

**Resumen Financiero**:
- Subtotal de servicios
- Subtotal de repuestos
- Descuentos (si aplican)
- Impuestos (si aplican)
- **Total a Pagar** (destacado)

**Información de Pago**:
- Método de pago (Efectivo/Tarjeta/Transferencia)
- Número de recibo o boleta
- Fecha de pago
- Estado del pago

#### Políticas y Garantías

**Términos y Condiciones**:
- Tiempo de garantía del trabajo realizado
- Condiciones de la garantía
- Excepciones y limitaciones
- Información sobre devoluciones

**Políticas de la Empresa**:
- Política de cambios y devoluciones
- Información sobre equipos no retirados
- Contacto para reclamos o consultas

#### Código QR

**Seguimiento Online**:
- Código QR único para cada orden
- Al escanearlo, el cliente puede:
  - Ver el estado actual de su orden
  - Acceder al historial completo
  - Recibir notificaciones de actualizaciones
  - Ver los detalles de la reparación

Este código QR proporciona transparencia total al cliente y reduce consultas telefónicas repetitivas.

#### Espacio para Firma

**Aceptación del Cliente**:
- Espacio designado para firma del cliente
- Confirma que acepta:
  - Los servicios realizados
  - Los precios cobrados
  - Las condiciones de garantía
  - Las políticas de la empresa

### Formato del Documento

#### Dos Copias

El sistema genera automáticamente dos versiones del PDF:

**1. Copia Cliente**:
- Versión completa para entregar al cliente
- Incluye todos los detalles
- Formato profesional y legible

**2. Copia Sucursal**:
- Versión para archivo interno
- Incluye información adicional administrativa
- Mismo formato, optimizado para impresión

#### Características del PDF

- **Formato Profesional**: Diseño limpio y moderno
- **Fácil Impresión**: Optimizado para impresoras estándar (A4)
- **Legible**: Tipografía clara y tamaño adecuado
- **Completo**: Toda la información necesaria en un solo documento
- **Profesional**: Refleja la calidad del servicio ofrecido

---

## 9. Comunicación con el Cliente (WhatsApp)

El sistema integra funcionalidades para comunicarse eficientemente con los clientes a través de WhatsApp, eliminando la necesidad de comunicación telefónica tradicional o envío de PDFs innecesarios.

### Funcionalidades de WhatsApp

#### Envío de Mensajes Rápidos

El sistema permite enviar mensajes predefinidos al cliente con un solo clic:

**Mensajes Disponibles**:
- "Su orden está en proceso"
- "Su orden está lista para retirar"
- "Necesitamos su aprobación para proceder"
- "Su equipo ha sido entregado"

Estos mensajes se personalizan automáticamente con:
- Nombre del cliente
- Número de orden
- Detalles específicos de la orden

#### Envío de Diagnósticos con Imágenes

Una de las funcionalidades más valiosas es la capacidad de enviar diagnósticos detallados con imágenes:

**Contenido del Diagnóstico**:
- Descripción clara del problema encontrado
- Estado de los componentes (bueno/dañado/reemplazado)
- Imágenes del dispositivo (opcional)
- Presupuesto de reparación
- Tiempo estimado de reparación

**Beneficios**:
- El cliente ve exactamente qué está pasando con su dispositivo
- Transparencia total en el proceso
- Facilita la aprobación del cliente
- Reduce malentendidos y reclamos

#### Solicitud de Aprobación

Cuando se requiere aprobación del cliente antes de proceder con una reparación costosa:

1. El técnico crea el diagnóstico en el sistema
2. El sistema genera un mensaje automático para WhatsApp
3. El técnico envía el mensaje con un clic
4. El cliente recibe la información y puede aprobar o rechazar
5. El sistema registra la respuesta del cliente

Este flujo asegura que:
- El cliente esté informado antes de proceder
- Se obtenga aprobación explícita para reparaciones costosas
- Se mantenga un registro de las comunicaciones
- Se eviten sorpresas desagradables al momento de la entrega

#### Notificaciones Automáticas

El sistema puede enviar notificaciones automáticas cuando:
- Se crea una nueva orden
- Se actualiza el estado de una orden
- Se completa una reparación
- Se requiere atención del cliente

### Ventajas de la Integración con WhatsApp

**✅ Comunicación Directa**:
- El cliente recibe mensajes en su aplicación favorita
- No necesita instalar aplicaciones adicionales
- Respuesta rápida y conveniente

**✅ Sin Costos Adicionales**:
- WhatsApp es gratuito
- No requiere servicios de SMS pagos
- Reduce costos operativos

**✅ Mensajes Ricos**:
- Soporte para texto, imágenes y documentos
- Formato claro y profesional
- Fácil de leer en móviles

**✅ Historial de Conversaciones**:
- Todas las comunicaciones quedan registradas en WhatsApp
- El cliente puede revisar el historial cuando lo necesite
- Facilita el seguimiento de acuerdos

**✅ Multiplataforma**:
- Funciona en Android e iOS
- Accesible desde computadores
- Disponible 24/7

---

## 10. Experiencia de Usuario y Diseño

El sistema ha sido diseñado pensando en la experiencia del usuario, garantizando que sea intuitivo, rápido y agradable de usar.

### Diseño Responsive

El sistema se adapta perfectamente a cualquier dispositivo:

#### Teléfonos Móviles

- Interfaz optimizada para pantallas pequeñas
- Navegación táctil intuitiva
- Botones y campos de tamaño adecuado
- Menú hamburguesa para acceso rápido
- Formularios adaptados a pantallas verticales

#### Tablets

- Aprovecha el espacio adicional de pantalla
- Diseño en dos columnas cuando es apropiado
- Navegación cómoda tanto en vertical como horizontal
- Visualización mejorada de tablas y listas

#### Computadores de Escritorio

- Diseño completo con todas las funcionalidades visibles
- Tablas con múltiples columnas
- Sidebar fijo para navegación rápida
- Dashboard con múltiples métricas visibles simultáneamente

### Animaciones Suaves

El sistema utiliza animaciones sutiles que mejoran la experiencia sin distraer:

- **Transiciones suaves** entre páginas
- **Feedback visual** al hacer clic en botones
- **Loading states** claros mientras se cargan datos
- **Animaciones de entrada** para nuevos elementos
- **Confirmaciones visuales** para acciones importantes

Estas animaciones hacen que el sistema se sienta moderno y profesional, mientras mejoran la percepción de velocidad y responsividad.

### Formularios Claros

Todos los formularios del sistema están diseñados con:

**Etiquetas Descriptivas**:
- Cada campo tiene una etiqueta clara que explica qué información se requiere
- Textos de ayuda opcionales para campos complejos
- Ejemplos de formato cuando es necesario

**Validación en Tiempo Real**:
- El sistema valida los datos mientras el usuario escribe
- Mensajes de error claros y específicos
- Indicadores visuales de campos válidos/inválidos

**Campos Obligatorios Claramente Marcados**:
- Asterisco (*) en campos obligatorios
- Diferentes estilos visuales para campos opcionales vs obligatorios

**Agrupación Lógica**:
- Campos relacionados están agrupados juntos
- Secciones claramente delimitadas
- Flujo lógico de arriba hacia abajo

### Diseño Moderno

El sistema utiliza un diseño moderno y limpio que incluye:

**Paleta de Colores Profesional**:
- Azul oscuro (#1e3a8a) como color principal (refleja confianza y profesionalismo)
- Azul brillante (#3b82f6) para elementos interactivos
- Colores neutros (grises) para fondos y textos secundarios
- Colores de estado (verde para éxito, rojo para errores, amarillo para advertencias)

**Tipografía Clara**:
- Fuentes sans-serif modernas y legibles
- Tamaños de fuente apropiados para diferentes tipos de contenido
- Jerarquía visual clara (títulos, subtítulos, texto)

**Espaciado Adecuado**:
- Respiración suficiente entre elementos
- Agrupación visual clara de información relacionada
- No se siente abarrotado ni vacío

**Iconos Intuitivos**:
- Iconos reconocibles y universales
- Uso consistente de iconos en todo el sistema
- Ayudan a identificar rápidamente funciones y estados

### Experiencia Intuitiva

El sistema está diseñado para ser usado sin necesidad de capacitación extensiva:

**Navegación Clara**:
- Menú siempre visible con nombres descriptivos
- Breadcrumbs que muestran dónde estás en el sistema
- Botones de navegación obvios (Atrás, Siguiente, Guardar, Cancelar)

**Acciones Obvias**:
- Botones principales destacados visualmente
- Acciones destructivas (eliminar) requieren confirmación
- Feedback inmediato después de cada acción

**Búsqueda y Filtros Fáciles**:
- Barra de búsqueda siempre accesible
- Filtros claramente visibles
- Resultados de búsqueda destacados

**Ayuda Contextual**:
- Tooltips en iconos e información adicional
- Textos de ayuda en formularios complejos
- Mensajes de error descriptivos que explican cómo solucionar problemas

---

## 11. Conclusión

El sistema de gestión de órdenes de servicio técnico es una solución integral diseñada específicamente para modernizar y optimizar las operaciones de un servicio técnico especializado en dispositivos Apple.

### Sistema Escalable

El sistema ha sido desarrollado con una arquitectura moderna y escalable que permite:

- **Crecimiento del Negocio**: Puede manejar desde pequeñas operaciones hasta grandes empresas con múltiples sucursales
- **Expansión de Funcionalidades**: La arquitectura permite agregar nuevas características sin afectar las existentes
- **Aumento de Usuarios**: Puede soportar múltiples usuarios simultáneos sin pérdida de rendimiento
- **Integración Futura**: Preparado para integrarse con otros sistemas (contabilidad, inventario, etc.)

### Pensado para el Crecimiento

Cada aspecto del sistema ha sido diseñado considerando el crecimiento futuro:

- **Múltiples Sucursales**: Soporte nativo para gestión multi-sucursal
- **Múltiples Usuarios**: Sistema de roles y permisos que permite agregar usuarios según se necesiten
- **Base de Datos Robusta**: Almacenamiento seguro y eficiente de grandes volúmenes de datos
- **Reportes y Analytics**: Capacidad de generar reportes detallados para toma de decisiones

### Optimiza Tiempos

El sistema reduce significativamente el tiempo dedicado a tareas administrativas:

- **Registro Rápido**: Crear una orden toma minutos en lugar de horas
- **Búsqueda Instantánea**: Encontrar información en segundos
- **Comunicación Eficiente**: Envío de mensajes y documentos con un clic
- **Automatización**: Cálculos automáticos de precios, comisiones y totales
- **Sin Papel**: Eliminación de registros manuales y archivos físicos

### Mejora Comunicación

La comunicación con clientes se vuelve más eficiente y profesional:

- **WhatsApp Integrado**: Comunicación directa y rápida
- **Transparencia**: Los clientes pueden ver el estado de su orden en tiempo real
- **Documentos Profesionales**: PDFs claros y completos
- **Notificaciones Automáticas**: El cliente se mantiene informado sin esfuerzo adicional

### Ordena el Negocio

El sistema proporciona orden y estructura a todas las operaciones:

- **Centralización**: Toda la información en un solo lugar
- **Organización**: Órdenes, clientes y datos organizados lógicamente
- **Trazabilidad**: Historial completo de cada reparación
- **Control**: Visibilidad total de ingresos, gastos y operaciones
- **Seguridad**: Datos protegidos con backups automáticos

### Tecnología de Confianza

El sistema utiliza tecnologías modernas y confiables:

- **Frontend**: Astro + React + Tailwind CSS (interfaz moderna y rápida)
- **Backend**: Node.js (servidor robusto y escalable)
- **Base de Datos**: Supabase (PostgreSQL seguro y confiable)
- **Autenticación**: Supabase Auth con Google Login (seguridad garantizada)
- **Hosting**: Vercel (infraestructura de clase mundial)
- **Control de Versiones**: GitHub (desarrollo profesional y mantenimiento continuo)

### Resultado Final

El resultado es un sistema que:

✅ **Aumenta la Eficiencia** operativa del negocio
✅ **Mejora la Experiencia** tanto de técnicos como de clientes
✅ **Proporciona Control** total sobre las operaciones
✅ **Facilita el Crecimiento** del negocio
✅ **Garantiza la Calidad** del servicio al cliente

---

## Apéndice: Tecnologías Utilizadas

Para clientes interesados en los aspectos técnicos, el sistema utiliza las siguientes tecnologías:

### Frontend

- **Astro**: Framework web moderno para aplicaciones rápidas
- **React**: Librería de JavaScript para interfaces de usuario interactivas
- **Tailwind CSS**: Framework de CSS utilitario para diseño rápido y consistente
- **TypeScript**: Lenguaje de programación que añade tipado estático a JavaScript

### Backend

- **Node.js**: Entorno de ejecución de JavaScript en el servidor
- **Supabase**: Plataforma Backend-as-a-Service que proporciona base de datos PostgreSQL y autenticación

### Base de Datos

- **PostgreSQL**: Sistema de gestión de bases de datos relacional de código abierto
- **Row Level Security (RLS)**: Seguridad a nivel de fila para proteger los datos

### Autenticación

- **Supabase Auth**: Sistema de autenticación seguro
- **Google Login**: Integración con Google para inicio de sesión rápido

### Deployment

- **Vercel**: Plataforma de hosting moderna para aplicaciones web
- **GitHub**: Control de versiones y repositorio de código

### Arquitectura

El sistema utiliza una **arquitectura separada**:
- **Frontend**: Interfaz de usuario independiente
- **Backend (API)**: Lógica de negocio y acceso a datos separada

Esta separación permite:
- Desarrollo independiente de frontend y backend
- Escalabilidad independiente
- Mantenimiento más fácil
- Mejor rendimiento

---

<div align="center">

## Fin del Documento

*Este documento fue creado para proporcionar una visión completa del Sistema de Gestión de Órdenes de Servicio Técnico desarrollado para IDoc STORE.*

*Para consultas o soporte técnico, contacte al equipo de desarrollo.*

---

![Logo IDoc STORE](sistema-reparaciones/public/logo.png)

**IDoc STORE - Servicio Especializado**

</div>

