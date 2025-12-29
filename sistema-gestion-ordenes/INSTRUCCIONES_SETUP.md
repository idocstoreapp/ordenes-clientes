# 🚀 Instrucciones de Configuración - Sistema de Gestión de Órdenes

## 📋 Pasos para Configurar el Sistema

### 1. Instalar Dependencias

**⚠️ IMPORTANTE**: Debes estar dentro del directorio `sistema-gestion-ordenes` para ejecutar npm install.

```powershell
# En PowerShell (Windows):
cd sistema-gestion-ordenes
npm install
```

**Si obtienes error "Could not read package.json"**: Significa que no estás en el directorio correcto. Verifica que estás en `sistema-gestion-ordenes` con `dir package.json`

### 2. Configurar Base de Datos

**IMPORTANTE**: Este sistema usa la **MISMA base de datos de Supabase** que `sistema-reparaciones`.

#### Opción A: Usar la misma base de datos (RECOMENDADO)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto que usa `sistema-reparaciones`
3. Ve a **SQL Editor**
4. Abre el archivo `database/schema.sql` de este proyecto
5. Copia todo el contenido y pégalo en el SQL Editor
6. Haz clic en **RUN**

El script está diseñado para:
- ✅ Solo crear tablas nuevas (no afecta las existentes)
- ✅ Agregar columnas nuevas a `branches` si no existen
- ✅ Ser seguro ejecutarlo múltiples veces

**Ver documentación completa**: Ver `database/USO_BASE_DATOS.md`

#### Opción B: Crear una nueva base de datos (NO RECOMENDADO)

Si prefieres una base de datos completamente separada:

1. Crea un nuevo proyecto en Supabase
2. Ejecuta el `database/schema.sql` completo
3. Crea nuevos usuarios
4. Usa las nuevas credenciales en las variables de entorno

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Para obtener estas variables**:
1. Ve a Supabase Dashboard → Tu Proyecto
2. Settings → API
3. Copia:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - anon/public key → `PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

El sistema estará disponible en `http://localhost:4321`

### 5. Hacer Login

1. Ve a `http://localhost:4321/login`
2. Usa las credenciales de un usuario existente del sistema de reparaciones
3. Si no tienes usuarios, créalos en Supabase → Authentication → Users

## 📁 Estructura del Proyecto

```
sistema-gestion-ordenes/
├── src/
│   ├── components/          # Componentes Astro
│   ├── layouts/            # Layouts Astro
│   ├── lib/                # Utilidades
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── currency.ts     # Formato de moneda
│   │   ├── date.ts         # Utilidades de fecha
│   │   └── deviceDatabase.ts  # Base de datos de dispositivos
│   ├── pages/              # Páginas Astro
│   │   ├── index.astro     # Página inicial
│   │   ├── login.astro     # Página de login
│   │   └── dashboard.astro # Dashboard principal
│   ├── react/              # Componentes React
│   │   ├── Login.tsx       # Componente de login
│   │   ├── Dashboard.tsx   # Dashboard principal
│   │   └── components/     # Componentes React
│   │       ├── AdminDashboard.tsx
│   │       ├── TechnicianDashboard.tsx
│   │       ├── OrderForm.tsx
│   │       ├── OrdersTable.tsx
│   │       ├── CustomerSearch.tsx
│   │       ├── DeviceChecklist.tsx
│   │       ├── Sidebar.tsx
│   │       └── KpiCard.tsx
│   ├── styles/
│   │   └── global.css      # Estilos globales
│   └── types.ts            # Tipos TypeScript
├── database/
│   ├── schema.sql          # Esquema de base de datos
│   └── USO_BASE_DATOS.md   # Documentación de BD
├── public/
│   └── logo.png            # Logo de la empresa
├── package.json
├── astro.config.mjs
└── README.md
```

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo

# Build
npm run build        # Compila para producción
npm run preview      # Previsualiza el build

# Type checking
npm run check        # Verifica tipos TypeScript
```

## 🗄️ Tablas de la Base de Datos

### Tablas Nuevas (este sistema)
- `customers` - Clientes
- `services` - Servicios de reparación
- `device_checklist_items` - Items de checklist por dispositivo
- `work_orders` - Órdenes de trabajo
- `order_services` - Relación orden-servicios
- `order_notes` - Notas de órdenes

### Tablas Compartidas (sistema-reparaciones)
- `users` - Usuarios (compartida)
- `branches` - Sucursales (compartida, con campos nuevos agregados)

## ✅ Checklist de Verificación

Después de la configuración, verifica:

- [ ] Dependencias instaladas (`npm install` sin errores)
- [ ] Schema SQL ejecutado correctamente
- [ ] Variables de entorno configuradas
- [ ] Servidor de desarrollo funciona (`npm run dev`)
- [ ] Puedes hacer login con usuario existente
- [ ] Dashboard se carga correctamente
- [ ] Puedes ver la lista de órdenes
- [ ] Puedes crear una nueva orden

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env.local` existe
- Verifica que las variables tienen los nombres correctos
- Reinicia el servidor de desarrollo

### Error: "relation does not exist"
- Verifica que ejecutaste el `schema.sql` completo
- Verifica que estás usando el proyecto correcto de Supabase
- Revisa los logs de Supabase para errores

### Error: "permission denied"
- Verifica que las políticas RLS están configuradas
- Verifica que el usuario tiene los permisos correctos
- Revisa el rol del usuario en la tabla `users`

### No puedo hacer login
- Verifica que el usuario existe en Supabase → Authentication
- Verifica que el usuario existe en la tabla `users` con el mismo ID
- Verifica que el email y contraseña son correctos

## 📚 Documentación Adicional

- `README.md` - Información general del proyecto
- `database/USO_BASE_DATOS.md` - Detalles sobre el uso de la base de datos
- `ESTADO_PROYECTO.md` - Estado actual del desarrollo
- `MANUAL_SISTEMA_GESTION_ORDENES.md` (en directorio padre) - Manual completo del sistema

## 🆘 Soporte

Si tienes problemas:
1. Revisa esta documentación
2. Verifica los logs en la consola del navegador
3. Verifica los logs de Supabase
4. Revisa que todos los pasos de configuración se completaron

---

¡Listo para empezar! 🎉

