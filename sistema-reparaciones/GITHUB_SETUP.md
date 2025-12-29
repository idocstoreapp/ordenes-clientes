# 🚀 Guía para Subir el Proyecto a GitHub

## ✅ Pasos Completados

1. ✅ Repositorio Git inicializado
2. ✅ Archivos agregados al staging
3. ✅ Commit inicial creado

## 📋 Próximos Pasos

### 1. Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Completa el formulario:
   - **Repository name**: `sistema-reparaciones` (o el nombre que prefieras)
   - **Description**: "Sistema de gestión de órdenes de reparación con dashboards para administradores y técnicos"
   - **Visibility**: 
     - 🔒 **Private** (recomendado si contiene información sensible)
     - 🌐 **Public** (si quieres que sea público)
   - ⚠️ **NO marques** "Initialize this repository with a README" (ya tenemos uno)
4. Haz clic en **"Create repository"**

### 2. Conectar el Repositorio Local con GitHub

Después de crear el repositorio, GitHub te mostrará instrucciones. Ejecuta estos comandos en tu terminal:

```bash
cd /Users/idocstore/Documents/app

# Agregar el repositorio remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/sistema-reparaciones.git

# O si prefieres usar SSH:
# git remote add origin git@github.com:TU_USUARIO/sistema-reparaciones.git

# Verificar que se agregó correctamente
git remote -v
```

### 3. Subir el Código a GitHub

```bash
# Cambiar a la rama main (si no estás ya en ella)
git branch -M main

# Subir el código
git push -u origin main
```

Si GitHub te pide autenticación:
- **HTTPS**: Te pedirá usuario y contraseña (o token de acceso personal)
- **SSH**: Debe funcionar automáticamente si tienes SSH configurado

### 4. Verificar en GitHub

1. Ve a tu repositorio en GitHub
2. Deberías ver todos tus archivos
3. Verifica que **NO** aparezcan archivos `.env` o `.env.local` (están en .gitignore)

## 🔒 Seguridad - Archivos que NO se Suben

Gracias al `.gitignore`, estos archivos **NO** se subirán a GitHub:
- ✅ `.env`
- ✅ `.env.local`
- ✅ `node_modules/`
- ✅ `.DS_Store`
- ✅ Archivos de build (`dist/`, `.output/`)

## ⚠️ IMPORTANTE - Antes de Subir

Verifica que **NO** tengas información sensible en el código:

1. **Service Role Keys**: Nunca deben estar en el código
2. **Tokens de Bsale**: Solo en `.env.local` (que no se sube)
3. **Credenciales de Supabase**: Solo en `.env.local`

## 📝 Comandos Útiles para el Futuro

```bash
# Ver estado de los archivos
git status

# Agregar cambios
git add .

# Crear commit
git commit -m "Descripción de los cambios"

# Subir cambios
git push

# Ver historial
git log --oneline

# Crear una nueva rama
git checkout -b nombre-de-rama

# Cambiar de rama
git checkout main
```

## 🆘 Solución de Problemas

### Error: "remote origin already exists"
```bash
# Eliminar el remoto existente
git remote remove origin

# Agregar el correcto
git remote add origin https://github.com/TU_USUARIO/sistema-reparaciones.git
```

### Error: "Authentication failed"
- Si usas HTTPS, necesitas un **Personal Access Token** en lugar de contraseña
- Ve a GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- O configura SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Error: "Permission denied"
- Verifica que tengas permisos de escritura en el repositorio
- Si es un repositorio de otra persona, necesitas hacer un Fork primero

## ✅ Listo!

Una vez que hayas hecho el push, tu código estará en GitHub y podrás:
- Compartirlo con tu equipo
- Hacer deploy automático (Vercel, Netlify, etc.)
- Trabajar con ramas y pull requests
- Mantener un historial de cambios

