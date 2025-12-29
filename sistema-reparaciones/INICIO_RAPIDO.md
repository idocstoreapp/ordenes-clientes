# 🚀 Inicio Rápido - macOS

## ⚡ Instalación Rápida (3 pasos)

### Paso 1: Instalar Node.js

**Opción A - Más Rápida (Homebrew):**
```bash
# Si no tienes Homebrew, instálalo primero:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Luego instala Node.js:
brew install node
```

**Opción B - Más Simple (Descarga Directa):**
1. Ve a: https://nodejs.org/
2. Descarga el instalador para macOS (versión LTS)
3. Ejecuta el archivo `.pkg` descargado
4. Sigue las instrucciones del instalador

### Paso 2: Verificar Instalación

Abre una **nueva terminal** y ejecuta:
```bash
node --version
npm --version
```

Si ves números de versión, ¡está listo!

### Paso 3: Instalar y Ejecutar

```bash
# Ir al directorio del proyecto
cd /Users/idocstore/Documents/app

# Instalar dependencias
npm install

# Configurar variables de entorno (edita con tus credenciales de Supabase)
cp .env.local.example .env.local
# Abre .env.local y agrega tus credenciales

# Iniciar servidor
npm run dev
```

Abre tu navegador en: **http://localhost:4321**

---

## ❌ Si No Funciona

### Problema: "command not found: node"

**Solución:**
1. Cierra completamente la terminal
2. Abre una nueva terminal
3. Vuelve a intentar: `node --version`

Si aún no funciona:
```bash
# Para Apple Silicon (M1/M2/M3):
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Para Intel:
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Problema: "Permission denied"

```bash
# Arreglar permisos de npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

---

## 📝 Configuración de Supabase

1. Crea un proyecto en: https://supabase.com
2. Ve a Settings > API
3. Copia:
   - `URL` → `PUBLIC_SUPABASE_URL` en `.env.local`
   - `anon public` key → `PUBLIC_SUPABASE_ANON_KEY` en `.env.local`
4. Ve a SQL Editor y ejecuta el contenido de `database/schema.sql`
5. Crea usuarios en Authentication
6. Inserta registros en la tabla `users` con los mismos IDs

---

## ✅ Verificación Final

Todo debería funcionar si:
- ✅ `node --version` muestra una versión
- ✅ `npm --version` muestra una versión  
- ✅ `npm install` se ejecuta sin errores
- ✅ `npm run dev` inicia el servidor
- ✅ Puedes abrir http://localhost:4321 en el navegador
















