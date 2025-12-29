# 🔗 Solución: Links de Bsale en Órdenes

## ✅ Cambios Implementados

### 1. Formato de URL Correcto
- **URL correcta**: `https://app2.bsale.cl/documents/show/{id}`
- La función `buildBsalePdfUrl()` ahora construye este formato
- La función `validateBsaleDocumentWithToken()` también construye este formato

### 2. Priorización de URLs
El código ahora prioriza en este orden:
1. **bsale_id** → Construye: `https://app2.bsale.cl/documents/show/{id}` (SIEMPRE)
2. **bsale_url** con formato correcto → Lo usa directamente
3. **bsale_url** con formato viejo → Lo ignora y construye uno nuevo si hay bsale_id
4. **Fallback** → URL de búsqueda

### 3. Componente de Actualización
- `UpdateBsaleUrls` actualiza **TODAS** las órdenes existentes
- Valida cada orden con Bsale
- Guarda `bsale_id` y construye `bsale_url` con el formato correcto

## 🚀 Cómo Actualizar las Órdenes Existentes

### Paso 1: Ejecutar Script SQL
```sql
-- Ejecuta en Supabase SQL Editor
-- database/add_bsale_id_field.sql
```

### Paso 2: Actualizar Todas las Órdenes
1. Ve al **Dashboard de Admin**
2. Busca la sección **"Actualizar URLs de Bsale para Órdenes Existentes"**
3. Haz clic en **"Actualizar Todas las Órdenes"**
4. Espera a que termine el proceso

### Paso 3: Verificar
- Las órdenes ahora tienen `bsale_id` guardado
- Las URLs tienen el formato: `https://app2.bsale.cl/documents/show/{id}`
- Los links funcionan correctamente

## 📋 Dónde Aparecen los Links

1. **OrdersTable (Técnicos y Admin)**:
   - Columna "Recibo" con hipervínculo
   - Debajo de la descripción del servicio

2. **AdminReports (Admin)**:
   - Columna "N° Recibo" con hipervínculo

## ⚠️ Nota Importante

Si las órdenes existentes tienen un `bsale_url` viejo guardado, necesitas ejecutar el componente `UpdateBsaleUrls` para actualizarlas. El código ahora prioriza `bsale_id` sobre `bsale_url`, pero si no hay `bsale_id`, usará el `bsale_url` viejo.

**Solución**: Ejecuta el componente de actualización para que todas las órdenes tengan `bsale_id` y el formato correcto de URL.








