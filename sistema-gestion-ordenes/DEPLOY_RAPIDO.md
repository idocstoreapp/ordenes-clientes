# 🚀 Deploy Rápido: GitHub + Vercel

## Comandos Rápidos

### 1. Subir a GitHub

```bash
cd sistema-gestion-ordenes

# Si es la primera vez
git init
git add .
git commit -m "Initial commit: Sistema de Gestión de Órdenes"
git remote add origin https://github.com/TU-USUARIO/sistema-gestion-ordenes.git
git branch -M main
git push -u origin main

# Para actualizaciones futuras
git add .
git commit -m "Descripción de cambios"
git push
```

### 2. Deploy a Vercel

1. Ve a https://vercel.com
2. **Add New Project** → Selecciona tu repositorio
3. Agrega estas variables de entorno:

```
PUBLIC_SUPABASE_URL=tu_url
PUBLIC_SUPABASE_ANON_KEY=tu_key
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_key
RESEND_API_KEY=tu_resend_key
```

4. Haz clic en **Deploy**

## ✅ Verificaciones

### Antes de subir:
- [ ] `npm run build` funciona sin errores
- [ ] `.env.local` NO está en git (`git status` no debe mostrarlo)
- [ ] `package.json` tiene todos los scripts correctos

### En Vercel:
- [ ] Todas las variables de entorno están agregadas
- [ ] El build completa exitosamente
- [ ] La app funciona en producción

## 📝 Variables de Entorno Necesarias

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
PUBLIC_SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

**Obtener de:**
- Supabase: Dashboard → Settings → API
- Resend: Dashboard → API Keys

## ⚠️ Importante

- ❌ **NUNCA** subas `.env.local` a GitHub
- ✅ Todas las keys deben estar solo en Vercel
- ✅ `package.json` está correcto ✅
- ✅ `.gitignore` está correcto ✅

