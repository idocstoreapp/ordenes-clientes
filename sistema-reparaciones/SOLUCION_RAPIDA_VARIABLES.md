# ⚡ Solución Rápida: Variables Configuradas pero No Funcionan

## 🔴 Problema
Las variables están en `.env.local` y Vercel, pero el código sigue diciendo que no están.

## ✅ Soluciones Rápidas

### 1. En Desarrollo Local

#### A. Verificar el archivo `.env.local`

```bash
# Verifica que el archivo existe en la raíz del proyecto
ls -la .env.local

# Verifica el contenido (sin mostrar valores completos)
cat .env.local | grep PUBLIC_SUPABASE
```

**Debe mostrar:**
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### B. Verificar formato (sin espacios)

❌ **INCORRECTO:**
```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY = eyJ...  (espacios alrededor del =)
PUBLIC_SUPABASE_SERVICE_ROLE_KEY= eyJ...   (espacio después del =)
PUBLIC_SUPABASE_SERVICE_ROLE_KEY =eyJ...   (espacio antes del =)
```

✅ **CORRECTO:**
```
PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...     (sin espacios)
```

#### C. Reiniciar el servidor COMPLETAMENTE

```bash
# 1. Detén el servidor (Ctrl+C o Cmd+C)
# 2. Espera 2-3 segundos
# 3. Inicia de nuevo
npm run dev
```

**⚠️ IMPORTANTE:** En Astro/Vite, las variables de entorno solo se cargan al iniciar el servidor. Si agregaste la variable mientras el servidor estaba corriendo, DEBES reiniciarlo.

#### D. Verificar en la consola del navegador

1. Abre la consola (F12)
2. Busca el mensaje: `[supabase-admin] Debug info:`
3. Verifica que `hasServiceRoleKey: true`

Si dice `false`, la variable no se está leyendo correctamente.

---

### 2. En Vercel (Producción)

#### A. Verificar que la variable está configurada

1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**
2. Busca `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` en la lista
3. Verifica que:
   - ✅ El nombre es exactamente `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)
   - ✅ Está marcada para **Production**
   - ✅ El valor no tiene espacios al inicio o final

#### B. Hacer REDEPLOY (OBLIGATORIO)

⚠️ **Las variables de entorno en Vercel solo se aplican después de un redeploy.**

**Opción 1: Desde el Dashboard**
1. Ve a **Deployments**
2. Click en los tres puntos (⋯) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine (2-5 minutos)

**Opción 2: Desde Git**
```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

#### C. Verificar después del redeploy

1. Abre tu aplicación en producción
2. Abre la consola del navegador (F12)
3. Busca: `[supabase-admin] Debug info:`
4. Verifica que `hasServiceRoleKey: true`

---

## 🔍 Diagnóstico Avanzado

### Usar el Componente de Diagnóstico

1. Inicia sesión como administrador
2. Ve al **Panel del Administrador**
3. Busca la sección **"🔍 Diagnóstico de Configuración"**
4. Revisa toda la información mostrada

El diagnóstico mostrará:
- ✅ Si las variables están configuradas
- 📏 Longitud de la clave
- 🔍 Prefijo de la clave
- 📋 Todas las variables SUPABASE encontradas

### Verificar en la Consola

Abre la consola del navegador y ejecuta:

```javascript
// Ver todas las variables de entorno que contienen "SUPABASE"
Object.keys(import.meta.env).filter(k => k.includes('SUPABASE'))

// Verificar específicamente el Service Role Key
console.log('Service Role Key:', {
  exists: !!import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  length: import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  prefix: import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'missing'
});
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: "La variable está en .env.local pero no funciona"

**Causas posibles:**
1. ❌ El servidor no se reinició después de agregar la variable
2. ❌ El archivo está en la carpeta incorrecta (debe estar en la raíz)
3. ❌ Hay espacios en el formato
4. ❌ El nombre de la variable está mal escrito

**Solución:**
```bash
# 1. Verifica la ubicación
pwd  # Debe estar en la raíz del proyecto

# 2. Verifica el contenido
cat .env.local

# 3. Si hay problemas, recrea el archivo
rm .env.local
nano .env.local  # Agrega las variables sin espacios

# 4. Reinicia el servidor
npm run dev
```

### Problema: "La variable está en Vercel pero no funciona"

**Causas posibles:**
1. ❌ No se hizo redeploy después de agregar la variable
2. ❌ La variable no está marcada para Production
3. ❌ El nombre tiene un typo
4. ❌ El valor tiene espacios o caracteres invisibles

**Solución:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Elimina la variable `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` si existe
3. Agrega de nuevo con el valor correcto (copia y pega desde Supabase)
4. Marca Production, Preview y Development
5. **Haz redeploy** (esto es OBLIGATORIO)

### Problema: "El diagnóstico muestra longitud 0"

**Causa:** La variable está definida pero vacía o con espacios.

**Solución:**
```bash
# En desarrollo, verifica el contenido exacto
cat .env.local | grep SERVICE_ROLE

# Debe mostrar algo como:
# PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Si muestra espacios o está vacía, corrígela
```

### Problema: "El prefijo no es 'eyJ'"

**Causa:** Copiaste la clave incorrecta o hay caracteres extra.

**Solución:**
1. Ve a Supabase Dashboard → Settings → API
2. Busca **"service_role"** (NO "anon public")
3. Copia la clave completa (debe empezar con `eyJ`)
4. Pégala sin espacios en `.env.local` o Vercel
5. Reinicia/redeploy

---

## ✅ Checklist Final

Antes de reportar que no funciona, verifica:

- [ ] En desarrollo: `.env.local` existe en la raíz del proyecto
- [ ] En desarrollo: El formato es correcto (sin espacios)
- [ ] En desarrollo: Reinicié el servidor después de agregar la variable
- [ ] En desarrollo: La consola muestra `hasServiceRoleKey: true`
- [ ] En Vercel: La variable está en Environment Variables
- [ ] En Vercel: Está marcada para Production
- [ ] En Vercel: Hice redeploy después de agregar/modificar la variable
- [ ] En Vercel: La consola en producción muestra `hasServiceRoleKey: true`
- [ ] La clave tiene 200+ caracteres
- [ ] La clave empieza con `eyJ`
- [ ] El componente de diagnóstico muestra todo en verde ✅

---

## 🆘 Si Nada Funciona

1. **Verifica el componente de diagnóstico** - Te dirá exactamente qué está mal
2. **Revisa la consola del navegador** - Busca `[supabase-admin] Debug info:`
3. **Verifica que copiaste la clave correcta** - Debe ser "service_role", no "anon public"
4. **Intenta recrear la variable desde cero** - Elimínala y agrégala de nuevo

---

## 📞 Información para Debugging

Si necesitas ayuda, proporciona:

1. Lo que muestra el componente de diagnóstico
2. El output de `[supabase-admin] Debug info:` en la consola
3. Si estás en desarrollo o producción
4. Si reiniciaste/redeployaste después de agregar la variable

