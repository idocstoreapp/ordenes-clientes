# Sistema de Reparaciones

Sistema de gestión automatizada de órdenes de reparación con dashboards diferenciados para administradores y técnicos.

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

1. **Clonar e instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.local.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

3. **Configurar la base de datos:**
   - Ve a tu proyecto en Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido de `database/schema.sql`
   - Crea usuarios en Authentication
   - Inserta registros en la tabla `users` con los mismos IDs

4. **Ejecutar en desarrollo:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`

## 📁 Estructura del Proyecto

```
/
├── src/
│   ├── components/      # Componentes React
│   ├── layouts/         # Layouts Astro
│   ├── lib/            # Utilidades (supabase, date, commission)
│   ├── pages/          # Páginas Astro
│   ├── styles/         # Estilos globales
│   └── types.ts        # Tipos TypeScript
├── database/
│   └── schema.sql      # Esquema de base de datos
└── public/             # Archivos estáticos
```

## 👥 Tipos de Usuario

### Técnico
- Dashboard con KPIs semanales y mensuales
- Formulario para registrar nuevas órdenes
- Lista de órdenes con filtros
- Reporte semanal de ganancias
- Gestión de ajustes de sueldo (adelantos/descuentos)

### Administrador
- Dashboard con métricas globales
- Reportes semanales de todos los técnicos
- Reporte de compras a proveedores
- Gestión de pagos a técnicos
- Visualización de ajustes de sueldo por técnico

## 💰 Cálculo de Comisiones

La comisión del técnico es siempre el **40%** de la ganancia neta:

- **EFECTIVO**: `(costoReparacion - costoRepuesto) * 0.4`
- **TARJETA/TRANSFERENCIA**: `(totalCobrado - costoRepuesto) * 0.4`

## 📊 Funcionalidades Clave

- ✅ Registro rápido de órdenes con fecha automática
- ✅ Cálculo automático de comisiones
- ✅ Estado pendiente/pagado según número de recibo
- ✅ Filtros por estado de pago
- ✅ Reportes semanales y mensuales
- ✅ Gestión de proveedores
- ✅ Ajustes de sueldo (adelantos/descuentos)
- ✅ Dashboard diferenciado por rol

## 🚢 Despliegue

1. **Build del proyecto:**
```bash
npm run build
```

2. **Desplegar en Vercel:**
   - Conecta tu repositorio a Vercel
   - Agrega las variables de entorno
   - Deploy automático en cada push

## 📝 Notas

- Las semanas de comisión van de sábado a viernes
- Los viernes se "limpia" visualmente el dashboard (solo muestra semana actual)
- Los datos históricos permanecen en la base de datos
- El status 'paid' requiere número de recibo

## 🔒 Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Los técnicos solo ven sus propias órdenes
- Los administradores tienen acceso completo
- Autenticación manejada por Supabase Auth

---

## 👨‍💻 Desarrollador

**Jonathan Guarirapa** - Desarrollador de aplicaciones y sitios webs

- 🌐 Portfolio: [jonadevel-portfolio.vercel.app](https://jonadevel-portfolio.vercel.app)
- 📱 WhatsApp: [+56962614851](https://wa.me/56962614851)
- 📷 Instagram: [@jonacrd1](https://instagram.com/jonacrd1)
- ✉️ Email: [jona.develp@gmail.com](mailto:jona.develp@gmail.com)

