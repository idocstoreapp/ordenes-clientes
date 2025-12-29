# 🔧 Configuración de Supabase - Guía Completa

## 📋 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en **"New Project"**
4. Completa:
   - **Name**: Sistema de Reparaciones (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (¡guárdala!)
   - **Region**: Elige la más cercana a ti
5. Click en **"Create new project"**
6. Espera 2-3 minutos mientras se crea el proyecto

---

## 🔑 Paso 2: Obtener Credenciales

1. En tu proyecto de Supabase, ve a **Settings** (⚙️) en el menú lateral
2. Click en **API**
3. Encontrarás dos valores importantes:

### a) Project URL
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
```
**Copia este valor completo** → será `PUBLIC_SUPABASE_URL`

### b) API Keys
Busca la sección **"Project API keys"** y copia:
```
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Copia esta clave completa** → será `PUBLIC_SUPABASE_ANON_KEY`

⚠️ **IMPORTANTE**: Usa la clave **"anon public"**, NO la "service_role" (es secreta)

---

## 📝 Paso 3: Configurar Variables de Entorno

1. En tu proyecto local, crea el archivo `.env.local`:
```bash
cd /Users/idocstore/Documents/app
cp .env.local.example .env.local
```

2. Abre `.env.local` y reemplaza con tus valores:
```env
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ejemplo real:**
```env
PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🗄️ Paso 4: Crear Base de Datos

1. En Supabase, ve a **SQL Editor** (en el menú lateral)
2. Click en **"New query"**
3. Abre el archivo `database/schema.sql` de tu proyecto
4. **Copia TODO el contenido** del archivo
5. Pégalo en el SQL Editor de Supabase
6. Click en **"Run"** (o presiona `Cmd+Enter`)
7. Deberías ver: ✅ "Success. No rows returned"

Esto creará:
- ✅ Tabla `users`
- ✅ Tabla `suppliers` (con datos de ejemplo)
- ✅ Tabla `orders`
- ✅ Tabla `salary_adjustments`
- ✅ Políticas de seguridad (RLS)
- ✅ Índices y triggers

---

## 👤 Paso 5: Crear Usuarios

### Opción A: Crear desde Authentication (Recomendado)

1. Ve a **Authentication** → **Users** en Supabase
2. Click en **"Add user"** → **"Create new user"**
3. Completa:
   - **Email**: admin@example.com
   - **Password**: (crea una contraseña)
   - **Auto Confirm User**: ✅ (márcalo)
4. Click en **"Create user"**
5. **Copia el User UID** (lo necesitarás en el siguiente paso)

### Opción B: Permitir registro público (para pruebas)

1. Ve a **Authentication** → **Settings**
2. Desactiva **"Enable email confirmations"** (solo para desarrollo)
3. Los usuarios podrán registrarse desde la app

---

## 📊 Paso 6: Insertar Usuarios en la Tabla `users`

1. Ve a **SQL Editor** en Supabase
2. Ejecuta este SQL (reemplaza con el UID que copiaste):

### Para Administrador:
```sql
INSERT INTO users (id, role, name, email)
VALUES (
  'uid-del-usuario-en-auth',  -- Reemplaza con el UID real
  'admin',
  'Carlos Rivas',
  'admin@example.com'
);
```

### Para Técnico:
```sql
INSERT INTO users (id, role, name, email)
VALUES (
  'uid-del-tecnico-en-auth',  -- Reemplaza con el UID real
  'technician',
  'Juan Pérez',
  'juan@example.com'
);
```

**Ejemplo completo:**
```sql
-- Crear admin
INSERT INTO users (id, role, name, email)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  'Carlos Rivas',
  'carlos@example.com'
);

-- Crear técnico
INSERT INTO users (id, role, name, email)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'technician',
  'Juan Pérez',
  'juan@example.com'
);
```

---

## ✅ Paso 7: Verificar Configuración

### Verificar tablas creadas:
1. Ve a **Table Editor** en Supabase
2. Deberías ver: `users`, `suppliers`, `orders`, `salary_adjustments`

### Verificar usuarios:
1. Ve a **Authentication** → **Users**
2. Deberías ver los usuarios creados

### Verificar variables de entorno:
```bash
# En tu terminal local
cd /Users/idocstore/Documents/app
cat .env.local
```

Deberías ver tus credenciales (sin exponerlas públicamente).

---

## 🧪 Paso 8: Probar la Conexión

1. Inicia el servidor:
```bash
npm run dev
```

2. Abre http://localhost:4321
3. Intenta hacer login con:
   - Email: admin@example.com (o el que creaste)
   - Password: (la que configuraste)

Si todo está bien, deberías ver el dashboard.

---

## 📋 Resumen de lo que Necesitas

✅ **De Supabase necesitas:**
1. `PUBLIC_SUPABASE_URL` - La URL de tu proyecto
2. `PUBLIC_SUPABASE_ANON_KEY` - La clave pública anon
3. Ejecutar el SQL de `database/schema.sql`
4. Crear usuarios en Authentication
5. Insertar registros en la tabla `users` con los mismos IDs

---

## ❓ Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que `.env.local` existe
- Verifica que tiene `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`
- Reinicia el servidor después de crear `.env.local`

### Error: "relation does not exist"
- No ejecutaste el SQL de `database/schema.sql`
- Ve a SQL Editor y ejecuta el script completo

### Error: "Invalid API key"
- Verifica que copiaste la clave **"anon public"** completa
- No debe tener espacios al inicio o final
- Debe empezar con `eyJ...`

### Error: "User not found" al hacer login
- Verifica que el usuario existe en Authentication
- Verifica que insertaste el registro en la tabla `users` con el mismo ID
- El ID debe ser exactamente igual al UID del usuario en Authentication

---

## 🔒 Seguridad

⚠️ **NUNCA compartas:**
- Tu `service_role` key (es secreta)
- Tu contraseña de base de datos
- Tu archivo `.env.local`

✅ **Puedes compartir:**
- Tu `anon public` key (es pública, pero úsala solo en frontend)
- Tu `PUBLIC_SUPABASE_URL` (es pública)

---

## 📞 Ayuda Adicional

Si tienes problemas:
1. Verifica la consola del navegador (F12)
2. Verifica los logs de Supabase (Dashboard → Logs)
3. Verifica que las políticas RLS están activas
















