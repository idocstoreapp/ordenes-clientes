#!/bin/bash

# Script de instalación para macOS
echo "🚀 Instalando Sistema de Reparaciones..."
echo ""

# Verificar si Homebrew está instalado
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew no está instalado."
    echo "📦 Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Agregar Homebrew al PATH (para Apple Silicon)
    if [ -f /opt/homebrew/bin/brew ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    brew install node
else
    echo "✅ Node.js ya está instalado: $(node --version)"
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está disponible"
    exit 1
else
    echo "✅ npm está disponible: $(npm --version)"
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias del proyecto..."
npm install

echo ""
echo "✅ Instalación completada!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Crea un archivo .env.local con tus credenciales de Supabase:"
echo "   cp .env.local.example .env.local"
echo ""
echo "2. Edita .env.local y agrega tus credenciales de Supabase"
echo ""
echo "3. Ejecuta el servidor de desarrollo:"
echo "   npm run dev"
echo ""
















