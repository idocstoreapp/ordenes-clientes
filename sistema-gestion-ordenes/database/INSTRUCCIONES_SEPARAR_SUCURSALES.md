# Instrucciones: Separar Sucursales de Usuarios

## 📋 Resumen

Las sucursales ahora tienen su propio sistema de autenticación completamente independiente de los usuarios del sistema (técnicos, encargados, etc.). Las sucursales pueden iniciar sesión usando su propio email y contraseña, sin necesidad de crear usuarios en `auth.users`.

## 🔧 Paso 1: Ejecutar Script SQL

### En Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `separar_sucursales_de_usuarios.sql`:

```sql
-- Script para separar completamente las sucursales de los usuarios
-- Las sucursales tendrán su propio sistema de autenticación independiente

-- ============================================
-- 1. Agregar columnas de autenticación a branches
-- ============================================

DO $$ 
BEGIN
  -- Agregar login_email si no existe (email para login de la sucursal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='login_email') THEN
    ALTER TABLE branches ADD COLUMN login_email TEXT UNIQUE;
  END IF;
  
  -- Agregar password_hash si no existe (hash de la contraseña para login)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='password_hash') THEN
    ALTER TABLE branches ADD COLUMN password_hash TEXT;
  END IF;
  
  -- Agregar is_active si no existe (para activar/desactivar login de sucursal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='is_active') THEN
    ALTER TABLE branches ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;
```

5. Haz clic en **Run** para ejecutar el script
6. Deberías ver un mensaje de éxito

## ✅ Paso 2: Configurar Credenciales de Sucursales

### Desde la Interfaz Web

1. Inicia sesión como **admin**
2. Ve a **Configuración** → **Sucursales**
3. Haz clic en **Editar** en la sucursal que quieres configurar
4. En la sección **"Credenciales de Acceso Web"**:
   - Ingresa el **Email para Login** (ej: `sucursal1@ejemplo.com`)
   - Ingresa la **Contraseña** (mínimo 6 caracteres)
5. Haz clic en **Actualizar Sucursal**

### Crear Nueva Sucursal con Credenciales

1. Ve a **Configuración** → **Sucursales**
2. Haz clic en **Nueva Sucursal**
3. Completa los datos de la sucursal
4. En **"Credenciales de Acceso Web"**:
   - Ingresa el **Email para Login**
   - Ingresa la **Contraseña**
5. Haz clic en **Crear Sucursal**

## 🔐 Paso 3: Iniciar Sesión como Sucursal

1. Ve a la página de login
2. Ingresa el **email de login de la sucursal** (el que configuraste en `login_email`)
3. Ingresa la **contraseña** de la sucursal
4. Haz clic en **Entrar**

El sistema detectará automáticamente si es una sucursal o un usuario normal.

## 📊 Diferencias Clave

### Antes (Sistema Anterior)
- Las sucursales creaban usuarios en `auth.users`
- Los usuarios de sucursales aparecían en la lista de usuarios
- Se mezclaban con técnicos y encargados

### Ahora (Sistema Nuevo)
- Las sucursales tienen `login_email` y `password_hash` directamente en `branches`
- **NO** se crean usuarios en `auth.users` para sucursales
- Las sucursales son completamente independientes
- Los técnicos/encargados siguen usando `auth.users` normalmente

## 🔍 Verificar Configuración

### Ver Sucursales con Credenciales Configuradas

```sql
SELECT 
  id,
  name,
  login_email,
  CASE 
    WHEN password_hash IS NOT NULL THEN 'Contraseña configurada'
    ELSE 'Sin contraseña'
  END as password_status,
  is_active
FROM branches
ORDER BY name;
```

### Activar/Desactivar Login de Sucursal

```sql
-- Desactivar login de una sucursal
UPDATE branches 
SET is_active = false 
WHERE id = 'ID_DE_LA_SUCURSAL';

-- Activar login de una sucursal
UPDATE branches 
SET is_active = true 
WHERE id = 'ID_DE_LA_SUCURSAL';
```

## ⚠️ Notas Importantes

1. **Email único**: El `login_email` debe ser único en toda la tabla `branches`
2. **Contraseña segura**: Usa contraseñas seguras (mínimo 6 caracteres, recomendado 8+)
3. **No mezclar**: Los emails de login de sucursales NO deben coincidir con emails de usuarios en `auth.users`
4. **Técnicos/Encargados**: Siguen usando el sistema normal de usuarios (`auth.users`) y pueden tener `sucursal_id` asignado
5. **Permisos**: Las sucursales tienen permisos por defecto para crear y editar órdenes, pero no pueden ver otras sucursales ni gestionar usuarios

## 🆘 Problemas Comunes

### "Esta sucursal no tiene contraseña configurada"
- Ve a Configuración → Sucursales → Editar
- Configura el email y contraseña en "Credenciales de Acceso Web"

### "Contraseña incorrecta"
- Verifica que estás usando el email correcto (`login_email`, no `email`)
- Verifica que la contraseña es correcta
- Si olvidaste la contraseña, un admin puede cambiarla desde la interfaz

### "No puedo iniciar sesión como sucursal"
- Verifica que `is_active = true` en la base de datos
- Verifica que el `login_email` está configurado
- Verifica que el `password_hash` no es NULL

## 🔄 Migración de Sucursales Existentes

Si tienes sucursales que ya tenían usuarios asociados:

1. **NO elimines** los usuarios existentes en `auth.users` (pueden ser técnicos)
2. Configura nuevas credenciales en `login_email` y `password_hash` para las sucursales
3. Las sucursales ahora usarán el nuevo sistema de autenticación
4. Los usuarios técnicos/encargados seguirán funcionando normalmente










