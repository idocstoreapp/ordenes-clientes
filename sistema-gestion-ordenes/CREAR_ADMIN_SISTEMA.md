# 🔐 Crear Usuario Admin para el Sistema

## 📋 Objetivo

Crear un usuario administrador con email `admin@sistema.com` que pueda acceder a este sistema de gestión de órdenes.

## ✅ Paso 1: Crear Usuario en Supabase Authentication

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **Authentication** → **Users**
3. Haz clic en **"Add user"** o **"Create new user"**
4. Completa:
   - **Email**: `admin@sistema.com`
   - **Password**: Una contraseña segura (ej: `Admin123!` o la que prefieras)
   - **Auto Confirm User**: ✅ **Marca esta opción** (importante para que no necesite confirmar email)
5. Haz clic en **"Create user"**
6. **IMPORTANTE**: Copia el **User UID** que se muestra (lo necesitarás en el siguiente paso)

## ✅ Paso 2: Agregar Usuario a la Tabla `users`

1. Ve a **SQL Editor** en Supabase
2. Ejecuta esta consulta (reemplaza `USER_UID_AQUI` con el UID que copiaste):

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  'USER_UID_AQUI',  -- Pega aquí el User UID que copiaste
  'admin@sistema.com',
  'Administrador del Sistema',
  'admin'  -- Rol de administrador
);
```

### Ejemplo Completo

Si el User UID es `a1b2c3d4-e5f6-7890-abcd-ef1234567890`, ejecutarías:

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin@sistema.com',
  'Administrador del Sistema',
  'admin'
);
```

## ✅ Paso 3: Verificar que se Creó Correctamente

Ejecuta esta consulta para verificar:

```sql
SELECT id, email, name, role, created_at
FROM users
WHERE email = 'admin@sistema.com';
```

Deberías ver una fila con:
- `email`: `admin@sistema.com`
- `name`: `Administrador del Sistema`
- `role`: `admin`

## 🔑 Paso 4: Hacer Login

1. Ve a la página de login del sistema
2. Ingresa:
   - **Email**: `admin@sistema.com`
   - **Contraseña**: La contraseña que configuraste en el Paso 1
3. Haz clic en **"Entrar"**

## 🌐 Acceso a Ambos Sistemas

Si ambos sistemas (`sistema-gestion-ordenes` y `sistema-reparaciones`) comparten la misma base de datos de Supabase:

✅ **El mismo usuario `admin@sistema.com` puede acceder a ambos sistemas**

No necesitas crear usuarios separados. Solo necesitas:
1. Que el usuario exista en `auth.users` (Paso 1)
2. Que el usuario exista en la tabla `users` con el rol correcto (Paso 2)

## 🔍 Verificar Usuarios Existentes

Para ver todos los usuarios admin:

```sql
SELECT id, email, name, role, created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;
```

## 🆘 Problemas Comunes

### "Invalid login credentials"
- Verifica que el email y contraseña son correctos
- Verifica que el usuario existe en **Authentication → Users** en Supabase
- Verifica que el usuario está en la tabla `users` (ejecuta la consulta del Paso 3)

### "User not found" en el Dashboard
- Verifica que ejecutaste el `INSERT` en la tabla `users` (Paso 2)
- Verifica que el `id` en la tabla `users` coincide exactamente con el User UID de Authentication
- Verifica que el rol es `'admin'` (no `'Admin'` o `'ADMIN'`)

### No puedo ver todas las secciones
- Verifica que el rol es exactamente `'admin'` (minúsculas)
- Recarga la página después de crear el usuario
- Cierra sesión y vuelve a iniciar sesión

## 📝 Notas Importantes

1. **El ID debe coincidir exactamente**: El `id` en la tabla `users` DEBE ser exactamente el mismo que el `id` en `auth.users` (el User UID)

2. **Email único**: El email `admin@sistema.com` solo puede usarse una vez en `auth.users`

3. **Rol en minúsculas**: El rol debe ser exactamente `'admin'` (minúsculas)

4. **Auto Confirm**: Asegúrate de marcar "Auto Confirm User" al crear el usuario en Authentication

5. **Compartir entre sistemas**: Si ambos sistemas usan la misma base de datos, el mismo usuario puede acceder a ambos

## 🔄 Si Ya Existe un Usuario Admin

Si ya tienes un usuario admin pero con otro email, puedes:

### Opción A: Cambiar el Email del Usuario Existente

1. Ve a **Supabase Dashboard** → **Authentication** → **Users**
2. Busca tu usuario admin
3. Haz clic en el usuario
4. Cambia el email a `admin@sistema.com`
5. Actualiza también en la tabla `users`:

```sql
UPDATE users
SET email = 'admin@sistema.com'
WHERE email = 'email_anterior@ejemplo.com';
```

### Opción B: Crear un Nuevo Usuario Admin

Sigue los pasos 1-4 de esta guía para crear un nuevo usuario con `admin@sistema.com`

## ✅ Verificación Final

Después de crear el usuario, verifica que todo funciona:

1. ✅ Usuario existe en **Authentication → Users** con email `admin@sistema.com`
2. ✅ Usuario existe en tabla `users` con rol `'admin'`
3. ✅ Puedes hacer login con `admin@sistema.com` y tu contraseña
4. ✅ Puedes ver todas las secciones del sistema (Dashboard, Órdenes, Clientes, Sucursales, Usuarios, Configuración, etc.)

---

**¿Necesitas ayuda?** Verifica que seguiste todos los pasos y que los IDs coinciden correctamente.










