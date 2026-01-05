# 📦 Configurar Supabase Storage para PDFs

Para que el sistema pueda subir PDFs y enviar links de descarga en los emails, necesitas configurar un bucket en Supabase Storage.

## Pasos para Configurar

### 1. Crear el Bucket en Supabase

1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. En el menú lateral, ve a **Storage**
3. Click en **"New bucket"**
4. Configura:
   - **Name**: `order-pdfs`
   - **Public bucket**: ✅ **Marcar como público** (importante para que los links funcionen)
   - **File size limit**: `10 MB` (o el que prefieras)
   - **Allowed MIME types**: `application/pdf`
5. Click en **"Create bucket"**

### 2. Configurar Políticas de Acceso

1. En Storage, click en el bucket `order-pdfs`
2. Ve a la pestaña **"Policies"**
3. Ejecuta el script SQL que está en `database/create_storage_bucket.sql`:

   - Ve a **SQL Editor** en Supabase
   - Abre el archivo `database/create_storage_bucket.sql`
   - Copia y pega el contenido
   - Click en **"Run"**

   O configura manualmente las políticas:

   **Política 1: Lectura Pública**
   - Click en **"New Policy"**
   - Selecciona **"For SELECT"**
   - Nombre: `Public Access`
   - Policy definition:
     ```sql
     (bucket_id = 'order-pdfs')
     ```

   **Política 2: Subida de Archivos (Autenticados)**
   - Click en **"New Policy"**
   - Selecciona **"For INSERT"**
   - Nombre: `Authenticated users can upload`
   - Policy definition:
     ```sql
     (bucket_id = 'order-pdfs' AND auth.role() = 'authenticated')
     ```

   **Política 3: Actualización (Autenticados)**
   - Click en **"New Policy"**
   - Selecciona **"For UPDATE"**
   - Nombre: `Authenticated users can update`
   - Policy definition:
     ```sql
     (bucket_id = 'order-pdfs' AND auth.role() = 'authenticated')
     ```

   **Política 4: Eliminación (Autenticados)**
   - Click en **"New Policy"**
   - Selecciona **"For DELETE"**
   - Nombre: `Authenticated users can delete`
   - Policy definition:
     ```sql
     (bucket_id = 'order-pdfs' AND auth.role() = 'authenticated')
     ```

## ✅ Verificación

Después de configurar:

1. Crea una orden de prueba
2. El sistema intentará subir el PDF a Supabase Storage
3. Si tiene éxito, el email incluirá un botón para descargar el PDF
4. Si falla la subida, intentará adjuntar el PDF (puede fallar si es muy grande)

## 🔍 Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket se llame exactamente `order-pdfs`
- Verifica que el bucket esté creado en Supabase Storage

### Error: "Permission denied"
- Verifica que las políticas estén configuradas correctamente
- Asegúrate de que el bucket sea público para lectura

### El PDF no se descarga
- Verifica que el bucket sea público
- Verifica que la URL generada sea accesible

## 📝 Notas

- Los PDFs se almacenan en la carpeta `orders/` dentro del bucket
- Los archivos se nombran como: `orden-{NUMERO_ORDEN}-{TIMESTAMP}.pdf`
- Si el PDF es muy grande y falla la subida, el sistema intentará adjuntarlo (puede fallar con "Request Entity Too Large")
- El sistema siempre intentará subir primero a Storage, y solo adjuntará si falla




