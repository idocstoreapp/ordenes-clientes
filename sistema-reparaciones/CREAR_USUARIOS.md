# Guía para Crear Usuarios desde el Dashboard

## 📋 Requisitos Previos

1. **Actualizar la tabla `users`** con los nuevos campos:
   - Ejecuta el script `database/update_users_table.sql` en el SQL Editor de Supabase
   - Esto agregará las columnas: `last_name`, `document_number`, `local`

2. **Configurar Service Role Key** (requerido para crear usuarios):
   - Ve a tu proyecto en Supabase
   - Ve a **Settings** → **API**
   - Copia el **`service_role` key** (⚠️ NUNCA lo compartas públicamente)
   - Agrega esta variable a tu archivo `.env.local`:
     ```
     PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
     ```
   - ⚠️ **IMPORTANTE**: En producción, considera usar Edge Functions en lugar de exponer el service_role key en el frontend.

## 🚀 Cómo Usar

1. **Inicia sesión como administrador** en el dashboard
2. En el panel de administrador, verás la sección **"Gestión de Usuarios"**
3. Haz clic en **"+ Crear Usuario"**
4. Completa el formulario:
   - **Nombre*** (obligatorio)
   - **Apellido** (opcional)
   - **Número de Documento** (opcional)
   - **Local*** (obligatorio) - Ej: "Local Centro", "Local Norte"
   - **Correo Electrónico*** (obligatorio)
   - **Contraseña*** (mínimo 6 caracteres)
   - **Rol*** - Selecciona "Técnico" o "Administrador"
5. Haz clic en **"Crear Usuario"**

## ✅ Verificación

Después de crear un usuario:
1. El usuario puede iniciar sesión inmediatamente con el correo y contraseña proporcionados
2. Verifica en Supabase:
   - **Authentication** → **Users**: Deberías ver el nuevo usuario
   - **Table Editor** → **users**: Deberías ver el registro con todos los datos

## 🔒 Seguridad

- ⚠️ Solo los usuarios con rol `admin` pueden crear usuarios
- ⚠️ El service_role key tiene permisos completos - nunca lo expongas públicamente
- ✅ Los usuarios creados tienen su email auto-confirmado
- ✅ Las contraseñas se almacenan de forma segura (hasheadas)

## 🛠️ Solución de Problemas

### Error: "Service role key no configurado"
- Verifica que agregaste `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` en `.env.local`
- Reinicia el servidor después de agregar la variable

### Error: "El correo electrónico ya está en uso"
- El correo ya existe en Supabase Auth
- Usa un correo diferente o elimina el usuario existente

### Error: "Solo los administradores pueden crear usuarios"
- Asegúrate de estar logueado como usuario con rol `admin`
- Verifica en la tabla `users` que tu usuario tiene `role = 'admin'`

### Los campos nuevos no aparecen
- Ejecuta el script `database/update_users_table.sql` en Supabase
- Verifica que las columnas se agregaron correctamente

## 📝 Notas

- Los usuarios creados pueden cambiar su contraseña desde la página de login (si implementas recuperación de contraseña)
- El campo "Local" es obligatorio para todos los usuarios
- Los campos opcionales (apellido, número de documento) pueden completarse después

