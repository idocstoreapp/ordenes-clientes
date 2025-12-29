#!/bin/bash

# Script para agregar Service Role Key a .env.local

echo "🔑 Agregar Service Role Key a .env.local"
echo "========================================"
echo ""

# Verificar que el archivo existe
if [ ! -f .env.local ]; then
    echo "❌ Error: El archivo .env.local no existe"
    exit 1
fi

echo "📋 Archivo .env.local actual:"
echo "----------------------------"
cat .env.local
echo ""
echo "----------------------------"
echo ""

# Pedir el service role key
echo "📝 Por favor, pega tu Service Role Key:"
echo "(Debe empezar con 'eyJ' y ser muy largo - 200+ caracteres)"
echo ""
read -r SERVICE_ROLE_KEY

# Validar que no esté vacío
if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: El Service Role Key está vacío"
    exit 1
fi

# Validar que empiece con eyJ
if [[ ! "$SERVICE_ROLE_KEY" =~ ^eyJ ]]; then
    echo "⚠️  Advertencia: El Service Role Key no empieza con 'eyJ'"
    echo "¿Estás seguro de que es la clave correcta? (service_role, no anon public)"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy] ]]; then
        echo "❌ Cancelado"
        exit 1
    fi
fi

# Verificar si la variable ya existe
if grep -q "PUBLIC_SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
    echo "✅ Variable encontrada, actualizando valor..."
    # Eliminar la línea existente (con o sin valor)
    sed -i.bak '/^PUBLIC_SUPABASE_SERVICE_ROLE_KEY=/d' .env.local
    # Eliminar también el comentario si existe
    sed -i.bak '/^# Service Role Key para gestión de usuarios/d' .env.local
fi

# Agregar la variable al final del archivo
echo "" >> .env.local
echo "# Service Role Key para gestión de usuarios" >> .env.local
echo "PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" >> .env.local

echo ""
echo "✅ Service Role Key agregado correctamente!"
echo ""
echo "📋 Archivo .env.local actualizado:"
echo "----------------------------"
cat .env.local
echo ""
echo "----------------------------"
echo ""
echo "⚠️  IMPORTANTE: Reinicia el servidor de desarrollo:"
echo "   1. Detén el servidor (Ctrl+C)"
echo "   2. Ejecuta: npm run dev"
echo ""

