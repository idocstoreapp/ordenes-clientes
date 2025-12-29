# 🔍 Diagnóstico de Service Role Key

## Problema: No puedo crear/editar/eliminar usuarios

Si ves el error "Service Role Key no configurado", sigue estos pasos para diagnosticar el problema.

## 🚀 Paso 1: Usar el Componente de Diagnóstico

He agregado un componente de diagnóstico en el Panel del Administrador que te mostrará exactamente qué está pasando:

1. Inicia sesión como administrador
2. Ve al **Panel del Administrador**
3. Busca la sección **"🔍 Diagnóstico de Configuración"** (aparece antes de "Gestión de Usuarios")
4. Revisa el estado de las variables de entorno

El diagnóstico te mostrará:
- ✅ Si `PUBLIC_SUPABASE_URL` está configurada
- ✅ Si `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` está configurada
- ✅ Si el cliente `supabaseAdmin` se creó correctamente
- 📏 Longitud del Service Role Key (debe ser 200+ caracteres)
- 🔍 Prefijo del Service Role Key (debe empezar con `eyJ`)

## 🔍 Paso 2: Verificar en la Consola del Navegador

Abre la consola del navegador (F12) y busca mensajes que empiecen con `[supabase-admin]`. Deberías ver algo como:

```
[supabase-admin] Debug info: {
  hasUrl: true,
  hasServiceRoleKey: false,  // ← Si es false, aquí está el problema
  urlLength: 45,
  serviceRoleKeyLength: 0,   // ← Debe ser 200+
  serviceRoleKeyPrefix: 'missing'
}
```

## 📋 Paso 3: Verificar Según tu Entorno

### Si estás en Desarrollo Local:

1. **Verifica que existe `.env.local`** en la raíz del proyecto:
   ```bash
   ls -la .env.local
   ```

2. **Verifica el contenido** (sin mostrar la clave completa):
   ```bash
   grep PUBLIC_SUPABASE_SERVICE_ROLE_KEY .env.local
   ```
   Deberías ver algo como:
   ```
   PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Verifica que no hay espacios** al inicio o final:
   - ❌ `PUBLIC_SUPABASE_SERVICE_ROLE_KEY= eyJ...` (espacio después del =)
   - ❌ `PUBLIC_SUPABASE_SERVICE_ROLE_KEY =eyJ...` (espacio antes del =)
   - ✅ `PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...` (sin espacios)

4. **Reinicia el servidor de desarrollo**:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

### Si estás en Vercel (Producción):

1. **Ve a Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**

2. **Busca `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`** en la lista

3. **Si NO está:**
   - Haz clic en **Add New**
   - Name: `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
   - Value: (pega tu service_role key completo)
   - Environment: Marca Production, Preview, Development
   - Save

4. **Si SÍ está pero no funciona:**
   - Verifica que el valor es correcto (debe empezar con `eyJ` y ser muy largo)
   - Verifica que está marcada para **Production**
   - **Haz redeploy** (esto es OBLIGATORIO):
     - Ve a **Deployments**
     - Click en los tres puntos (⋯) del último deployment
     - Selecciona **Redeploy**

## ✅ Verificación Final

Después de configurar correctamente:

1. **En desarrollo:** Reinicia el servidor y verifica en la consola que `hasServiceRoleKey: true`
2. **En Vercel:** Haz redeploy y espera a que termine
3. **En ambos:** Abre el Panel del Administrador y verifica que el diagnóstico muestra todo en verde ✅
4. **Prueba:** Intenta crear un usuario nuevo

## 🆘 Problemas Comunes

### "La variable está en .env.local pero no funciona"
- ✅ Verifica que reiniciaste el servidor después de agregarla
- ✅ Verifica que el archivo está en la raíz del proyecto (no en una subcarpeta)
- ✅ Verifica que no hay espacios extra
- ✅ Verifica que el nombre es exactamente `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)

### "La variable está en Vercel pero no funciona"
- ✅ Verifica que hiciste **redeploy** después de agregarla
- ✅ Verifica que está marcada para **Production**
- ✅ Verifica que el valor es correcto (copia y pega de nuevo desde Supabase)

### "El diagnóstico muestra que la clave es muy corta"
- ✅ Verifica que copiaste la clave **completa** desde Supabase
- ✅ La clave debe tener 200+ caracteres
- ✅ Debe empezar con `eyJ`

### "No veo el componente de diagnóstico"
- ✅ Asegúrate de estar logueado como **administrador**
- ✅ Refresca la página (Ctrl+Shift+R o Cmd+Shift+R)
- ✅ Verifica que estás en el Panel del Administrador

## 📝 Checklist Rápido

- [ ] El componente de diagnóstico muestra `✅ Configurado` para ambas variables
- [ ] La longitud del Service Role Key es 200+ caracteres
- [ ] El prefijo del Service Role Key empieza con `eyJ`
- [ ] El cliente `supabaseAdmin` está creado (`✅ Creado`)
- [ ] En desarrollo: `.env.local` existe y tiene la variable
- [ ] En desarrollo: Reinicié el servidor después de agregar la variable
- [ ] En Vercel: La variable está en Environment Variables
- [ ] En Vercel: Está marcada para Production
- [ ] En Vercel: Hice redeploy después de agregarla

## 🔗 Referencias

- [Configurar Service Role Key en Vercel](./CONFIGURAR_SERVICE_ROLE_VERCEL.md)
- [Solución de Errores de Usuarios](./SOLUCION_ERRORES_USUARIOS.md)
- [Variables de Entorno en Vercel](./VERCEL_ENV_VARIABLES.md)

