alter table if exists public.models
  add column if not exists image_url text null;

alter table if exists public.variants
  add column if not exists image_url text null;
