# 🍎 Guía de Instalación para macOS

## Opción 1: Instalación Automática (Recomendada)

Ejecuta el script de instalación:

```bash
./install.sh
```

Este script instalará Homebrew (si no lo tienes) y Node.js automáticamente.

## Opción 2: Instalación Manual con Homebrew

1. **Instalar Homebrew** (si no lo tienes):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. **Agregar Homebrew al PATH** (si usas Apple Silicon):
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

3. **Instalar Node.js**:
```bash
brew install node
```

4. **Verificar instalación**:
```bash
node --version
npm --version
```

## Opción 3: Instalación Directa desde nodejs.org

1. Ve a [https://nodejs.org/](https://nodejs.org/)
2. Descarga el instalador para macOS (versión LTS recomendada)
3. Ejecuta el instalador `.pkg`
4. Sigue las instrucciones del instalador

## Opción 4: Usando nvm (Node Version Manager)

1. **Instalar nvm**:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

2. **Cerrar y reabrir la terminal**, luego:
```bash
nvm install --lts
nvm use --lts
```

## Después de Instalar Node.js

Una vez que Node.js esté instalado:

1. **Instalar dependencias del proyecto**:
```bash
cd /Users/idocstore/Documents/app
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.local.example .env.local
```

Edita `.env.local` y agrega tus credenciales de Supabase:
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

3. **Ejecutar el servidor de desarrollo**:
```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:4321`

## Solución de Problemas

### Error: "command not found: node"
- Asegúrate de haber cerrado y reabierto la terminal después de instalar Node.js
- Verifica que Node.js esté en tu PATH: `echo $PATH`
- Si usaste Homebrew, ejecuta: `brew link node`

### Error: "Permission denied"
- Si tienes problemas de permisos, usa: `sudo npm install` (no recomendado)
- Mejor solución: arreglar permisos de npm: `mkdir ~/.npm-global && npm config set prefix '~/.npm-global'`

### Error: "EACCES: permission denied"
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zprofile
source ~/.zprofile
```

## Verificar que Todo Funciona

```bash
# Verificar Node.js
node --version  # Debería mostrar v18.x.x o superior

# Verificar npm
npm --version   # Debería mostrar 9.x.x o superior

# Verificar instalación de dependencias
ls node_modules  # Debería mostrar muchas carpetas

# Iniciar servidor
npm run dev     # Debería iniciar sin errores
```
















