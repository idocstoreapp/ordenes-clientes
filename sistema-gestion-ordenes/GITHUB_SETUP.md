# Guía para Subir el Proyecto a GitHub

## Paso 1: Verificar Archivos Importantes

### 1.1 Verificar .gitignore

Asegúrate de que tu `.gitignore` incluya:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
.vercel/
.output/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.production.local
.env.development.local

# Astro
.astro/

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
```

### 1.2 Verificar que NO subas archivos sensibles

**NO debes subir:**
- `.env.local` (contiene tus API keys)
- `.env` (si existe)
- `node_modules/` (ya está en .gitignore)

## Paso 2: Inicializar Git

Si aún no has inicializado Git en el proyecto:

```bash
cd sistema-gestion-ordenes
git init
```

## Paso 3: Agregar Archivos

```bash
# Ver qué archivos se van a agregar (revisa que NO aparezca .env.local)
git status

# Agregar todos los archivos
git add .

# Verificar nuevamente
git status
```

**IMPORTANTE:** Asegúrate de que `.env.local` NO aparezca en la lista de archivos a agregar.

## Paso 4: Primer Commit

```bash
git commit -m "Initial commit: Sistema de Gestión de Órdenes"
```

## Paso 5: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** en la esquina superior derecha
3. Selecciona **"New repository"**
4. Completa:
   - **Repository name**: `sistema-gestion-ordenes` (o el nombre que prefieras)
   - **Description**: "Sistema de gestión de órdenes de reparación de dispositivos"
   - **Visibility**: Elige **Private** (recomendado) o **Public**
   - **NO marques** "Add a README file" (ya tienes uno)
   - **NO marques** "Add .gitignore" (ya tienes uno)
   - **NO marques** "Choose a license"
5. Haz clic en **"Create repository"**

## Paso 6: Conectar con GitHub

GitHub te mostrará instrucciones. Usa estas si es la primera vez:

```bash
git remote add origin https://github.com/TU-USUARIO/sistema-gestion-ordenes.git
git branch -M main
git push -u origin main
```

**Nota:** Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub.

Si te pide autenticación:
- GitHub ya no acepta contraseñas para HTTPS
- Usa un **Personal Access Token** o **SSH**

### Opción A: Usar Personal Access Token

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos `repo`
3. Cuando git pida la contraseña, usa el token en lugar de tu contraseña

### Opción B: Usar SSH (Recomendado)

1. Si tienes una clave SSH configurada en GitHub:
   ```bash
   git remote set-url origin git@github.com:TU-USUARIO/sistema-gestion-ordenes.git
   git push -u origin main
   ```

## Paso 7: Verificar

Ve a tu repositorio en GitHub y verifica que:
- ✅ Todos los archivos estén presentes
- ✅ `.env.local` NO esté en el repositorio
- ✅ `node_modules/` NO esté en el repositorio
- ✅ El README se vea correctamente

## Actualizaciones Futuras

Para subir cambios nuevos:

```bash
# Ver qué archivos cambiaron
git status

# Agregar cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push
```

## Estructura del Repositorio

Tu repositorio debería verse así:

```
sistema-gestion-ordenes/
├── .gitignore
├── astro.config.mjs
├── package.json
├── package-lock.json
├── README.md
├── tailwind.config.cjs
├── tsconfig.json
├── vercel.json
├── database/
│   ├── schema.sql
│   ├── create_settings_table.sql
│   └── ...
├── src/
│   ├── layouts/
│   ├── pages/
│   ├── react/
│   ├── lib/
│   └── ...
└── (NO debe aparecer .env.local ni node_modules/)
```

## Seguridad

### ✅ Hacer (DO)

- Mantener el repositorio como **Private** si contiene lógica de negocio
- Usar variables de entorno en Vercel para secrets
- Documentar cómo configurar el proyecto sin exponer secrets

### ❌ No Hacer (DON'T)

- ❌ NUNCA subir `.env.local` a GitHub
- ❌ NUNCA hardcodear API keys en el código
- ❌ NUNCA subir `node_modules/` (ya está en .gitignore)
- ❌ NUNCA compartir `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` públicamente

## Troubleshooting

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/sistema-gestion-ordenes.git
```

### Error: "Authentication failed"
- Usa un Personal Access Token en lugar de contraseña
- O configura SSH keys

### Subí .env.local por error
1. Elimínalo del repositorio:
   ```bash
   git rm --cached .env.local
   git commit -m "Remove .env.local"
   git push
   ```
2. **IMPORTANTE:** Si ya está en GitHub, considera que está comprometido:
   - Cambia todas las API keys que estaban en ese archivo
   - Revoca y genera nuevas keys en Supabase y Resend

### Verificar que .env.local NO está en GitHub
```bash
git ls-files | grep .env
```
No debería mostrar `.env.local`

