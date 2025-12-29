# 🔧 Solución de Errores Comunes

## Error: "policy already exists"

Si obtienes el error:
```
ERROR: 42710: policy "branches_select_all" for table "branches" already exists
```

**Solución**: El schema.sql ha sido actualizado para eliminar políticas existentes antes de crearlas. Simplemente ejecuta el script completo nuevamente. Ahora incluye `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`.

Si el error persiste:
1. Ejecuta manualmente en Supabase SQL Editor:
```sql
DROP POLICY IF EXISTS "branches_select_all" ON branches;
DROP POLICY IF EXISTS "branches_insert_admin" ON branches;
DROP POLICY IF EXISTS "branches_update_admin" ON branches;
-- ... (repetir para todas las políticas que den error)
```

2. Luego ejecuta el schema.sql completo nuevamente.

## Error al ejecutar npm install

### Si ves errores de permisos:
```bash
# En Windows (PowerShell como Administrador)
npm install --force

# O limpia la caché
npm cache clean --force
npm install
```

### Si ves errores de dependencias:
```bash
# Elimina node_modules y package-lock.json
rm -rf node_modules package-lock.json

# En Windows PowerShell:
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Luego reinstala
npm install
```

### Si ves errores de versión de Node:
- Verifica que tienes Node.js 18 o superior: `node --version`
- Si no, descarga la última versión de [nodejs.org](https://nodejs.org)

### Si ves errores específicos de paquetes:
Comparte el error completo para poder ayudarte mejor. Los errores comunes son:
- Problemas con `jspdf` o `qrcode` - pueden requerir configuración adicional
- Problemas con `@astrojs/react` - verifica la versión de Astro

## Error: "Missing Supabase environment variables"

1. Verifica que el archivo `.env.local` existe en la raíz del proyecto
2. Verifica que las variables tienen los nombres exactos:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
3. Reinicia el servidor de desarrollo después de crear/modificar `.env.local`

## Error: "relation does not exist"

1. Verifica que ejecutaste el `schema.sql` completo
2. Verifica que estás usando el proyecto correcto de Supabase
3. Verifica en Supabase Dashboard → Table Editor que las tablas existen

## Error: "permission denied"

1. Verifica que las políticas RLS están configuradas (ejecuta el schema.sql)
2. Verifica que el usuario tiene el rol correcto en la tabla `users`
3. Verifica que estás autenticado correctamente



