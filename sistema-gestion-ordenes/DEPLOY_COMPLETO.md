# Guía Completa: GitHub + Vercel Deploy

Esta guía te llevará paso a paso desde cero hasta tener tu aplicación funcionando en producción.

## 📋 Checklist Pre-Deploy

Antes de empezar, verifica:

- [ ] El proyecto funciona localmente (`npm run dev`)
- [ ] El build funciona sin errores (`npm run build`)
- [ ] Tienes una cuenta en [GitHub](https://github.com)
- [ ] Tienes una cuenta en [Vercel](https://vercel.com) (puedes usar GitHub para registrarte)
- [ ] Tienes tus API keys guardadas de forma segura (NO en el código)

## 🚀 Paso 1: Preparar el Proyecto

### 1.1 Verificar package.json

Tu `package.json` debe incluir:

```json
{
  "name": "sistema-gestion-ordenes",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "astro preview",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.1",
    "astro": "^4.15.0",
    "autoprefixer": "^10.4.20",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "jspdf": "^2.5.1",
    "qrcode": "^1.5.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "resend": "^6.6.0",
    "tailwindcss": "^3.4.14"
  },
  "devDependencies": {
    "@astrojs/react": "^3.6.2",
    "@astrojs/tailwind": "^5.1.3",
    "@types/node": "^20.12.12",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "postcss": "^8.4.47",
    "typescript": "^5.6.3"
  }
}
```

### 1.2 Verificar .gitignore

Asegúrate de que `.gitignore` incluya (ya lo revisamos arriba):
- `node_modules/`
- `.env.local`
- `.env`
- `.astro/`
- `dist/`

### 1.3 Verificar astro.config.mjs

Debe tener `output: 'hybrid'` para que funcionen las API routes:

```javascript
export default defineConfig({
  integrations: [react(), tailwind()],
  server: { port: 4321 },
  output: 'hybrid', // ← IMPORTANTE para API routes
  build: {
    assets: 'assets',
  },
});
```

### 1.4 Probar Build Local

```bash
npm run build
```

Si hay errores, corrígelos antes de continuar.

## 📤 Paso 2: Subir a GitHub

### 2.1 Inicializar Git (si no lo has hecho)

```bash
cd sistema-gestion-ordenes
git init
```

### 2.2 Agregar Archivos

```bash
# Ver qué se va a subir (verifica que .env.local NO esté)
git status

# Agregar todos los archivos
git add .

# Verificar nuevamente
git status
```

### 2.3 Primer Commit

```bash
git commit -m "Initial commit: Sistema de Gestión de Órdenes"
```

### 2.4 Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name**: `sistema-gestion-ordenes`
3. **Visibility**: Private (recomendado) o Public
4. **NO marques** ninguna opción (README, .gitignore, license)
5. Haz clic en **"Create repository"**

### 2.5 Conectar y Subir

```bash
# Reemplaza TU-USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU-USUARIO/sistema-gestion-ordenes.git
git branch -M main
git push -u origin main
```

**Si pide autenticación:**
- Usa un **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens)
- O configura **SSH keys**

### 2.6 Verificar en GitHub

Ve a tu repositorio y verifica que:
- ✅ Todos los archivos estén presentes
- ✅ `.env.local` NO esté visible
- ✅ `node_modules/` NO esté visible

## 🚢 Paso 3: Deploy a Vercel

### 3.1 Conectar con Vercel

1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Haz clic en **"Add New Project"**
4. Selecciona tu repositorio `sistema-gestion-ordenes`
5. Vercel detectará automáticamente que es un proyecto Astro

### 3.2 Configurar Variables de Entorno

En la pantalla de configuración del proyecto, ve a **Environment Variables** y agrega:

```
PUBLIC_SUPABASE_URL = tu_supabase_url
PUBLIC_SUPABASE_ANON_KEY = tu_supabase_anon_key
PUBLIC_SUPABASE_SERVICE_ROLE_KEY = tu_supabase_service_role_key
RESEND_API_KEY = tu_resend_api_key
```

**IMPORTANTE:**
- Marca las 3 opciones: **Production**, **Preview**, **Development**
- Obtén estos valores de:
  - **Supabase**: Dashboard → Settings → API
  - **Resend**: Dashboard → API Keys

### 3.3 Configuración del Build

Vercel debería detectar automáticamente:
- **Framework Preset**: Astro ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.vercel/output` (automático) ✅
- **Install Command**: `npm install` ✅

**No necesitas cambiar nada**, pero si quieres verificar: Settings → General → Build & Development Settings

### 3.4 Deploy

1. Haz clic en **"Deploy"**
2. Espera a que termine el build (2-5 minutos)
3. Obtendrás una URL como: `https://sistema-gestion-ordenes.vercel.app`

## ✅ Paso 4: Verificar el Deploy

### 4.1 Probar la Aplicación

1. Visita la URL de producción
2. Intenta iniciar sesión
3. Verifica funcionalidades principales:
   - ✅ Login funciona
   - ✅ Dashboard carga
   - ✅ Puedes crear órdenes
   - ✅ PDF se genera correctamente
   - ✅ Emails se envían (crea una orden de prueba)

### 4.2 Verificar Logs

Si hay errores:
1. Ve a Vercel Dashboard → Tu proyecto → **Deployments**
2. Haz clic en el deployment más reciente
3. Ve a **"Logs"** para ver errores
4. Ve a **"Functions"** para ver logs de API routes

### 4.3 Troubleshooting Común

#### Error: "Missing environment variables"
- Ve a **Settings → Environment Variables**
- Verifica que todas las variables estén agregadas
- Asegúrate de que estén marcadas para **Production**
- Haz un nuevo deploy (automático o manual)

#### Error: "API route not found"
- Verifica que `astro.config.mjs` tenga `output: 'hybrid'`
- Verifica que las rutas estén en `src/pages/api/`
- Revisa los logs en Vercel

#### Error: "Resend API key not found"
- Agrega `RESEND_API_KEY` en Vercel
- Haz un nuevo deploy

## 🔄 Actualizaciones Futuras

Para actualizar la aplicación en producción:

```bash
# 1. Hacer cambios localmente
# 2. Probar localmente
npm run dev

# 3. Verificar build
npm run build

# 4. Commit y push
git add .
git commit -m "Descripción de los cambios"
git push

# 5. Vercel detectará automáticamente y hará deploy
```

## 🔒 Seguridad

### Variables de Entorno en Vercel

- **NUNCA** subas `.env.local` a GitHub
- Todas las keys deben estar solo en Vercel
- Variables `PUBLIC_*` están disponibles en el cliente
- Variables sin `PUBLIC_` solo en el servidor (API routes)

### Qué NO Subir a GitHub

- ❌ `.env.local`
- ❌ `node_modules/` (ya en .gitignore)
- ❌ API keys hardcodeadas en el código
- ❌ Secrets de producción

## 📝 Resumen Rápido

```bash
# 1. Preparar
cd sistema-gestion-ordenes
npm run build  # Verificar que funciona

# 2. Git
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/sistema-gestion-ordenes.git
git push -u origin main

# 3. Vercel
# - Conectar repositorio
# - Agregar variables de entorno
# - Deploy

# 4. Actualizar (futuro)
git add .
git commit -m "Cambios"
git push  # Vercel deploya automáticamente
```

## 📚 Documentación Adicional

- [GitHub Setup](./GITHUB_SETUP.md) - Guía detallada de GitHub
- [Deploy Vercel](./DEPLOY_VERCEL.md) - Guía detallada de Vercel
- [Resend Setup](./RESEND_SETUP.md) - Configuración de emails
- [README](./README.md) - Documentación general del proyecto

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel
2. Verifica las variables de entorno
3. Asegúrate de que el build funciona localmente
4. Revisa la documentación de [Astro](https://docs.astro.build) y [Vercel](https://vercel.com/docs)

