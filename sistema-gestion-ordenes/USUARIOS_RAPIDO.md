# 👤 Usuarios - Guía Rápida

## 🎯 ¿Con qué usuario puedo entrar?

### Opción 1: Usar Usuario Existente (Si ya tienes uno)

Si ya usas `sistema-reparaciones`, puedes usar **el mismo usuario y contraseña**.

1. Ve a `http://localhost:4321/login`
2. Ingresa el email y contraseña que usas en sistema-reparaciones
3. ¡Listo!

### Opción 2: Crear Usuario Nuevo

#### Paso Rápido:

1. **Supabase Dashboard** → **Authentication** → **Users** → **Add user**
   - Email: `admin@test.com`
   - Password: `123456` (o la que quieras)
   - ✅ Auto Confirm User
   - Copia el **User UID** que aparece

2. **Supabase Dashboard** → **SQL Editor** → Ejecuta:

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  'PEGA_EL_UID_AQUI',  -- El UID que copiaste
  'admin@test.com',
  'Usuario Administrador',
  'admin'  -- o 'technician', 'encargado', 'recepcionista'
);
```

3. **Login**: Ve a `http://localhost:4321/login` y usa:
   - Email: `admin@test.com`
   - Password: `123456` (o la que pusiste)

## 🔑 Roles Disponibles

- **`admin`** - Acceso completo
- **`technician`** - Crear y gestionar órdenes
- **`encargado`** - Ver órdenes de su sucursal
- **`recepcionista`** - Solo ver información

**Para más detalles**: Ver `CREAR_USUARIOS.md`



