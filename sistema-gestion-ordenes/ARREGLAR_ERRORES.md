# 🔧 Arreglar Errores Rápidamente

## ❌ Error 1: Missing Supabase environment variables

**Crea el archivo `.env.local`** en la raíz del proyecto con:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Obtén los valores de**: Supabase Dashboard → Settings → API

**Luego reinicia**: `npm run dev`

## ❌ Error 2: 404 del logo

**Ejecuta estos comandos en PowerShell**:

```powershell
cd sistema-gestion-ordenes

# Si el logo está en la raíz del proyecto:
if (Test-Path logo.png) {
    Copy-Item logo.png public\logo.png -Force
    Write-Host "Logo copiado correctamente"
} else {
    Write-Host "Logo no encontrado. Debes copiarlo manualmente a public\logo.png"
}
```

**O cópialo manualmente**:
- Ve a `sistema-gestion-ordenes\`
- Si existe `logo.png` en la raíz, cópialo a `public\logo.png`
- O copia el logo desde `sistema-reparaciones\public\logo.png` a `sistema-gestion-ordenes\public\logo.png`

**Luego reinicia**: `npm run dev`

## ✅ Verificación Final

```powershell
cd sistema-gestion-ordenes

# Verificar .env.local
Test-Path .env.local  # Debe ser True

# Verificar logo
Test-Path public\logo.png  # Debe ser True

# Si ambos son True, reinicia el servidor
npm run dev
```

---

**Después de esto, ambos errores deberían estar resueltos.**



