-- Agrega soporte visual para servicios y categorías en configuración/UI
alter table if exists public.services
  add column if not exists category text,
  add column if not exists image_url text,
  add column if not exists category_image_url text;

create index if not exists idx_services_category on public.services(category);
