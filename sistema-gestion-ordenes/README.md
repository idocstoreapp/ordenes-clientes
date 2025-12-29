# Sistema de Gestión de Órdenes de Servicio Técnico

Sistema completo de gestión de órdenes de trabajo para servicio técnico especializado en dispositivos Apple.

## 🚀 Tecnologías

- **Astro** - Framework web
- **React** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Auth + Database)
- **Vercel** - Deployment

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
Crear archivo `.env.local`:
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

3. **Configurar la base de datos:**
   - Ve a tu proyecto en Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido de `database/schema.sql`

4. **Ejecutar en desarrollo:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`

## 📁 Estructura del Proyecto

```
/
├── src/
│   ├── components/      # Componentes Astro
│   ├── layouts/         # Layouts Astro
│   ├── lib/            # Utilidades (supabase, date, currency, etc.)
│   ├── pages/          # Páginas Astro
│   ├── react/          # Componentes React
│   │   └── components/ # Componentes React individuales
│   ├── styles/         # Estilos globales
│   └── types.ts        # Tipos TypeScript
├── database/
│   └── schema.sql      # Esquema de base de datos
└── public/             # Archivos estáticos
```

## 🗄️ Base de Datos

**IMPORTANTE**: Este sistema está diseñado para usar la **MISMA base de datos de Supabase** que el sistema de reparaciones existente (`sistema-reparaciones`).

### Tablas Nuevas
- `customers` - Clientes
- `services` - Servicios de reparación
- `device_checklist_items` - Items de checklist por tipo de dispositivo
- `work_orders` - Órdenes de trabajo
- `order_services` - Relación orden-servicios
- `order_notes` - Notas de órdenes

### Tablas Compartidas
- `branches` - Sucursales (compartida, se agregan campos nuevos si no existen)
- `users` - Usuarios del sistema (compartida)

**Ver documentación completa**: `database/USO_BASE_DATOS.md` y `INSTRUCCIONES_SETUP.md`

## 👥 Tipos de Usuario

- **Admin**: Acceso completo al sistema
- **Técnico**: Crear y gestionar sus propias órdenes
- **Encargado**: Gestionar su sucursal
- **Recepcionista**: Ver y buscar información

## 📝 Notas

- Las semanas de comisión van de sábado a viernes
- El sistema incluye autocompletado inteligente para dispositivos Apple
- Checklist dinámico según tipo de dispositivo
- Sistema de prioridades con colores
- Generación de PDFs para órdenes
- Integración con WhatsApp

## 🔒 Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Los usuarios solo ven lo que tienen permiso
- Autenticación manejada por Supabase Auth

