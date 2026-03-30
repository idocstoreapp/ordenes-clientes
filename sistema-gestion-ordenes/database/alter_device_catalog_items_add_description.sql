-- Ejecutar solo si ya creaste la tabla device_catalog_items anteriormente
alter table if exists public.device_catalog_items
add column if not exists description text null;
