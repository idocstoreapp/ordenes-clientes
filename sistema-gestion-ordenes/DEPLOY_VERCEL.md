# Guía para Deploy a Vercel

## Paso 1: Preparar el Proyecto para GitHub

### 1.1 Verificar .gitignore

Asegúrate de que tu `.gitignore` incluya:
- `node_modules/`
- `.env.local`
- `.env`
- `.astro/`
- `dist/`

### 1.2 Inicializar Git (si no lo has hecho)

```bash
cd sistema-gestion-ordenes
git init
git add .
git commit -m "Initial commit: Sistema de Gestión de Órdenes"
```

### 1.3 Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
2. No inicialices con README, .gitignore o licencia (ya los tienes)
3. Copia la URL del repositorio (ej: `https://github.com/tu-usuario/sistema-gestion-ordenes.git`)

### 1.4 Conectar con GitHub

```bash
git remote add origin https://github.com/tu-usuario/sistema-gestion-ordenes.git
git branch -M main
git push -u origin main
```

## Paso 2: Deploy a Vercel

### 2.1 Conectar Repositorio con Vercel

1. Ve a [Vercel](https://vercel.com) e inicia sesión (puedes usar GitHub)
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Astro

### 2.2 Configurar Variables de Entorno

En la configuración del proyecto en Vercel, ve a **Settings → Environment Variables** y agrega:

#### Variables Requeridas:

```
PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key_aqui
RESEND_API_KEY=tu_resend_api_key_aqui
```

**Importante:**
- Todas las variables deben estar marcadas para los 3 ambientes: **Production**, **Preview**, y **Development**
- `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` es sensible, nunca la compartas públicamente
- `RESEND_API_KEY` también es sensible

### 2.3 Configuración del Build

Vercel debería detectar automáticamente:
- **Framework Preset**: Astro
- **Build Command**: `npm run build`
- **Output Directory**: `.vercel/output` (Astro lo maneja automáticamente)
- **Install Command**: `npm install`

**No necesitas cambiar nada**, pero si quieres verificar, ve a **Settings → General → Build & Development Settings**

### 2.4 Deploy

1. Haz clic en **"Deploy"**
2. Vercel construirá y desplegará tu aplicación
3. Una vez completado, obtendrás una URL como: `https://sistema-gestion-ordenes.vercel.app`

## Paso 3: Verificar el Deploy

### 3.1 Verificar que la App Funciona

1. Visita la URL de producción
2. Intenta iniciar sesión
3. Verifica que todas las funcionalidades funcionen correctamente

### 3.2 Verificar Variables de Entorno

Si hay errores relacionados con variables de entorno:
1. Ve a **Settings → Environment Variables**
2. Verifica que todas las variables estén agregadas
3. Asegúrate de que estén marcadas para **Production**
4. Haz un nuevo deploy después de agregar/editar variables

### 3.3 Verificar API Routes

Para que las API routes funcionen (como `/api/send-order-email`), asegúrate de que:
- `astro.config.mjs` tenga `output: 'hybrid'` ✅ (ya lo tiene)
- El build se complete sin errores

## Paso 4: Configurar Dominio Personalizado (Opcional)

1. Ve a **Settings → Domains**
2. Agrega tu dominio
3. Sigue las instrucciones para configurar los registros DNS

## Actualizaciones Futuras

Para actualizar la aplicación:
1. Haz cambios en tu código local
2. Haz commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push
   ```
3. Vercel detectará automáticamente el push y hará un nuevo deploy

## Notas Importantes

### Variables de Entorno

- **NUNCA** subas `.env.local` a GitHub
- Todas las variables sensibles deben estar solo en Vercel
- Las variables que empiezan con `PUBLIC_` están disponibles en el cliente
- Las que NO empiezan con `PUBLIC_` solo están disponibles en el servidor (API routes)

### Build Errors

Si encuentras errores en el build:
1. Revisa los logs en Vercel
2. Asegúrate de que `package.json` tenga todas las dependencias
3. Verifica que `astro.config.mjs` esté correcto
4. Asegúrate de que todas las importaciones estén correctas

### API Routes

Las API routes (como `/api/send-order-email.ts`) funcionan en Vercel gracias a:
- `output: 'hybrid'` en `astro.config.mjs`
- Vercel detecta automáticamente las rutas en `src/pages/api/`

## Troubleshooting

### Error: "Missing environment variables"
- Verifica que todas las variables estén en Vercel
- Asegúrate de hacer un nuevo deploy después de agregar variables

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que el build funciona localmente primero (`npm run build`)

### Error: "API route not found"
- Verifica que `output: 'hybrid'` esté en `astro.config.mjs`
- Asegúrate de que las rutas estén en `src/pages/api/`

### Error: "Resend API key not found"
- Agrega `RESEND_API_KEY` en Vercel Environment Variables
- Haz un nuevo deploy

## Enlaces Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Astro](https://docs.astro.build/en/getting-started/)
- [Deploy de Astro en Vercel](https://docs.astro.build/en/guides/deploy/vercel/)

