# Guía rápida: imágenes y logos del Wizard de Dispositivos

## Dónde editar

### 1) Tipo de dispositivo (card inicial)
Archivo: `src/lib/deviceWizardData.ts`

- `DEVICE_TYPE_OPTIONS[].imageUrl`
- Ejemplo: Celular, Tablet, Notebook, Smartwatch

### 2) Logos de marcas (card de marcas)
Archivo: `src/lib/deviceWizardData.ts`

- `BRAND_LOGOS`
- Clave = `brand.key` detectada por reglas (`apple`, `samsung`, `xiaomi`, etc.)

### 3) Imagen/foto de la marca (card de marca completa)
Archivo: `src/lib/deviceWizardData.ts`

- `BRAND_IMAGE_CATALOG`

### 4) Imagen de línea/serie (iPhone / Serie S / Serie A / Redmi / MacBook, etc.)
Archivo: `src/lib/deviceWizardData.ts`

- `LINE_IMAGE_HINTS` (regex + `imageUrl`)

### 5) Imagen de modelo/variante
Archivo: `src/lib/deviceWizardData.ts`

- Función `getModelImage(model, brandKey?)`
- Actualmente usa `LINE_IMAGE_HINTS` + fallback de marca

## Dónde se renderizan en UI

Archivo: `src/react/components/OrderForm.tsx`

- Paso 1 (tipo): `option.imageUrl`
- Paso 2 (marca): `getBrandImage(brand.key)` + `brand.logoUrl`
- Paso 3 (línea): `series.imageUrl`
- Paso 4 (modelo/variante): `getModelImage(model, selectedBrandKey)`

## Recomendación para escalar a “muchísimas imágenes”

Cuando compartas dataset completo, migrar a BD con esta jerarquía:

1. `device_types`
2. `device_brands` (FK type)
3. `device_lines` (FK brand)
4. `device_models` (FK line)
5. `device_variants` (FK model)

Y cada nivel con campos de imagen:

- `image_url`
- `logo_url` (solo donde aplique)
- `display_order`
- `is_active`

Así dejas de mantener URLs en código y puedes editar todo desde panel admin.

## Seed automático desde historial real

Si ya tienes muchos modelos guardados en `work_orders.device_model`, ejecuta:

- `database/seed_device_catalog_from_work_orders.sql`

Este script crea/actualiza jerarquía base:

- tipo
- marca
- línea
- modelo
- variante

y luego podrás corregir textos/fotos exactas desde la pestaña **Dispositivos**.
