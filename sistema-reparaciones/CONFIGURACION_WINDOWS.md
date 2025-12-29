# 🪟 Configuración Rápida para Windows

## ⚡ Pasos Rápidos (5 minutos)

### Paso 1: Crear archivo de variables de entorno

1. En la raíz del proyecto, crea un archivo llamado `.env.local`
2. Copia el contenido de `.env.local.example` o crea el archivo con este contenido:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 2: Obtener credenciales de Supabase

**Si ya tienes un proyecto de Supabase:**
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

**Si NO tienes un proyecto de Supabase:**
1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto (tardará 2-3 minutos)
3. Sigue los pasos anteriores para obtener las credenciales

### Paso 3: Configurar la base de datos

1. En Supabase, ve a **SQL Editor** (en el menú lateral)
2. Click en **"New query"**
3. Abre el archivo `database/schema.sql` de este proyecto
4. Copia TODO el contenido y pégalo en el SQL Editor
5. Click en **"Run"** (o presiona F5)
6. Deberías ver: ✅ "Success. No rows returned"

### Paso 4: Crear usuarios para iniciar sesión

#### Opción A: Crear desde Authentication (Recomendado)

1. En Supabase, ve a **Authentication** → **Users**
2. Click en **"Add user"** → **"Create new user"**
3. Completa:
   - **Email**: admin@example.com (o el que prefieras)
   - **Password**: (crea una contraseña)
   - **Auto Confirm User**: ✅ (márcalo)
4. Click en **"Create user"**
5. **Copia el User UID** (lo necesitarás en el siguiente paso)

#### Opción B: Insertar usuario directamente en la tabla

1. Ve a **SQL Editor** en Supabase
2. Ejecuta este SQL (reemplaza con tus datos):

```sql
-- Primero, crea el usuario en Authentication (Opción A)
-- Luego, inserta en la tabla users con el mismo ID

INSERT INTO users (id, role, name, email)
VALUES (
  'uid-del-usuario-copiado',  -- Reemplaza con el UID que copiaste
  'admin',                    -- o 'technician' para técnico
  'Tu Nombre',
  'tu@email.com'
);
```

**Ejemplo completo para crear un admin:**
```sql
INSERT INTO users (id, role, name, email)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  'Administrador',
  'admin@example.com'
);
```

### Paso 5: Reiniciar el servidor

1. Si el servidor está corriendo, deténlo (Ctrl+C)
2. Espera 2-3 segundos
3. Inicia de nuevo:
```bash
npm run dev
```

### Paso 6: Probar el inicio de sesión

1. Abre http://localhost:4321
2. Intenta iniciar sesión con:
   - Email: el que creaste (ej: admin@example.com)
   - Password: la contraseña que configuraste

---

## ✅ Checklist de Verificación

Antes de probar, verifica que:

- [ ] El archivo `.env.local` existe en la raíz del proyecto
- [ ] `.env.local` tiene `PUBLIC_SUPABASE_URL` (empieza con `https://`)
- [ ] `.env.local` tiene `PUBLIC_SUPABASE_ANON_KEY` (empieza con `eyJ`)
- [ ] `.env.local` tiene `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (empieza con `eyJ`)
- [ ] Ejecutaste el SQL de `database/schema.sql` en Supabase
- [ ] Creaste al menos un usuario en Authentication
- [ ] Insertaste el usuario en la tabla `users` con el mismo ID
- [ ] Reiniciaste el servidor después de crear `.env.local`

---

## 🔍 Verificar que Funciona

### En la consola del navegador (F12):

1. Abre http://localhost:4321
2. Presiona F12 para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. No deberías ver errores de "Missing Supabase environment variables"

### Si ves errores:

- **"Missing Supabase environment variables"**: 
  - Verifica que `.env.local` existe y tiene las variables correctas
  - Reinicia el servidor completamente

- **"Invalid API key"**:
  - Verifica que copiaste las claves completas (son muy largas)
  - No debe haber espacios alrededor del `=`

- **"User not found"** al hacer login:
  - Verifica que el usuario existe en Authentication
  - Verifica que insertaste el registro en la tabla `users` con el mismo ID

---

## 📝 Notas Importantes

1. **Formato del archivo `.env.local`**:
   - ❌ NO dejes espacios: `PUBLIC_SUPABASE_URL = https://...`
   - ✅ Correcto: `PUBLIC_SUPABASE_URL=https://...`
   - ❌ NO uses comillas: `PUBLIC_SUPABASE_URL="https://..."`
   - ✅ Correcto: `PUBLIC_SUPABASE_URL=https://...`

2. **Reiniciar el servidor**:
   - Las variables de entorno solo se cargan al iniciar el servidor
   - Si agregas o modificas `.env.local`, DEBES reiniciar

3. **Seguridad**:
   - ❌ NUNCA subas `.env.local` a Git (ya está en `.gitignore`)
   - ❌ NUNCA compartas tu `SERVICE_ROLE_KEY` públicamente

---

## 🆘 Si Aún No Funciona

1. Verifica la consola del navegador (F12) para ver errores específicos
2. Verifica que el servidor se reinició después de crear `.env.local`
3. Verifica que las claves de Supabase son correctas (cópialas de nuevo)
4. Revisa `CONFIGURACION_SUPABASE.md` para más detalles

