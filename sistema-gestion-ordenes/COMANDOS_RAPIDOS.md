# 🚀 Comandos Rápidos

## ⚠️ IMPORTANTE: Debes estar en el directorio correcto

**NUNCA ejecutes los comandos desde el directorio raíz `odenes.clientes`**

Siempre ejecuta los comandos desde dentro de `sistema-gestion-ordenes`:

```powershell
# 1. Cambiar al directorio del proyecto
cd sistema-gestion-ordenes

# 2. Instalar dependencias
npm install

# 3. Ejecutar en desarrollo
npm run dev
```

## 📋 Secuencia Completa de Comandos

### En PowerShell (Windows):

```powershell
# Ir al directorio del proyecto
cd C:\Users\Dell\Documents\odenes.clientes\sistema-gestion-ordenes

# Verificar que estás en el lugar correcto (deberías ver package.json)
dir package.json

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

### Si tienes problemas con npm install:

```powershell
# Limpiar e instalar
cd sistema-gestion-ordenes
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
```

## ✅ Verificación

Después de `npm install`, deberías ver:
- ✅ Carpeta `node_modules` creada
- ✅ Archivo `package-lock.json` creado
- ✅ Sin errores en la terminal

## 🎯 Después de Instalar

1. **Configurar variables de entorno**: Crear `.env.local` con las credenciales de Supabase
2. **Ejecutar schema SQL**: En Supabase SQL Editor, ejecutar `database/schema.sql`
3. **Ejecutar proyecto**: `npm run dev`
4. **Acceder**: Ir a `http://localhost:4321/login`

---

**Recuerda**: Siempre `cd sistema-gestion-ordenes` antes de ejecutar cualquier comando npm.



