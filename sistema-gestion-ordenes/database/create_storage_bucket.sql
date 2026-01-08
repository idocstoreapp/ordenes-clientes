-- Crear bucket de almacenamiento para PDFs de órdenes
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-pdfs',
  'order-pdfs',
  true, -- Público para que los links funcionen
  10485760, -- 10MB límite por archivo
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Crear política para permitir lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-pdfs');

-- Crear política para permitir subida de archivos (solo autenticados)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-pdfs' 
  AND auth.role() = 'authenticated'
);

-- Crear política para permitir actualización de archivos (solo autenticados)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'order-pdfs' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'order-pdfs' 
  AND auth.role() = 'authenticated'
);

-- Crear política para permitir eliminación de archivos (solo autenticados)
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-pdfs' 
  AND auth.role() = 'authenticated'
);








