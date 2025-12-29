# 🔐 Configurar Service Role Key en Vercel - Guía Rápida

## ⚠️ IMPORTANTE

Si tu aplicación está desplegada en **Vercel**, la variable `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` **DEBE** estar configurada en las variables de entorno de Vercel para que la gestión de usuarios funcione en producción.

## 🚀 Pasos Rápidos

### 1. Obtener el Service Role Key

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. En la sección **"Project API keys"**, busca **"service_role"**
5. Haz clic en el ícono de **copiar** (📋) para copiar la clave completa

⚠️ **La clave es muy larga** (empieza con `eyJ...`). Asegúrate de copiarla completa.

---

### 2. Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **Add New** o **Add**
5. Completa el formulario:
   - **Name:** `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (pega el service_role key que copiaste)
   - **Environment:** Marca **todas** las opciones:
     - ✅ **Production**
     - ✅ **Preview** 
     - ✅ **Development** (opcional)
6. Haz clic en **Save**

---

### 3. Redeploy (OBLIGATORIO)

⚠️ **Las variables de entorno solo se aplican después de un redeploy.**

Tienes dos opciones:

#### Opción A: Redeploy desde el Dashboard
1. Ve a **Deployments**
2. Haz clic en los tres puntos (⋯) del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine el deploy

#### Opción B: Push al repositorio
```bash
git commit --allow-empty -m "Trigger redeploy for service role key"
git push
```

---

## ✅ Verificación

Después del redeploy:

1. Abre tu aplicación en producción
2. Inicia sesión como administrador
3. Intenta crear un usuario
4. Si funciona, ¡todo está correcto! ✅

Si aún ves el error "Service role key no configurado":
- Verifica que la variable esté en Vercel (Settings → Environment Variables)
- Verifica que hiciste redeploy después de agregarla
- Verifica que el nombre de la variable sea exactamente `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (sin espacios)

---

## 🔍 Verificar Variables en Vercel

Para ver todas tus variables de entorno:

1. Ve a Vercel Dashboard → Tu Proyecto → **Settings** → **Environment Variables**
2. Deberías ver una lista con todas las variables
3. Busca `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` en la lista

Si no la ves, agrégala siguiendo los pasos anteriores.

---

## 📝 Variables Requeridas en Vercel

Para que la gestión de usuarios funcione completamente, necesitas estas variables:

- ✅ `PUBLIC_SUPABASE_URL` (obligatoria)
- ✅ `PUBLIC_SUPABASE_ANON_KEY` (obligatoria)
- ✅ `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (obligatoria para gestión de usuarios)

---

## 🆘 Problemas Comunes

### "Agregué la variable pero sigue sin funcionar"
**Solución:** Debes hacer **redeploy** después de agregar la variable. Las variables no se aplican automáticamente.

### "No sé dónde está el service_role key"
**Solución:** En Supabase Dashboard → Settings → API, busca la sección "Project API keys". Hay dos claves: "anon public" (la pública) y "service_role" (la secreta). Necesitas la segunda.

### "La variable está en .env.local pero no funciona en producción"
**Solución:** `.env.local` solo funciona en desarrollo local. Para producción en Vercel, **debes** agregar la variable en Vercel Dashboard.

---

## 📚 Referencias

- [Documentación de Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentación de Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin)

