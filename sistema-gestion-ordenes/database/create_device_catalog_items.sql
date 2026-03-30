-- Catálogo jerárquico para wizard de dispositivos
-- Ejecutar en Supabase SQL Editor

create table if not exists public.device_catalog_items (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid null references public.device_catalog_items(id) on delete cascade,
  level text not null check (level in ('type', 'brand', 'line', 'model', 'variant')),
  type_key text null,
  item_key text not null,
  label text not null,
  description text null,
  image_url text null,
  logo_url text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, item_key, parent_id)
);

create index if not exists idx_device_catalog_items_level on public.device_catalog_items(level);
create index if not exists idx_device_catalog_items_parent on public.device_catalog_items(parent_id);
create index if not exists idx_device_catalog_items_type_key on public.device_catalog_items(type_key);

create or replace function public.update_device_catalog_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_device_catalog_items_updated_at on public.device_catalog_items;
create trigger trg_device_catalog_items_updated_at
before update on public.device_catalog_items
for each row execute procedure public.update_device_catalog_items_updated_at();

alter table public.device_catalog_items enable row level security;

drop policy if exists "Authenticated users can read device catalog items" on public.device_catalog_items;
create policy "Authenticated users can read device catalog items"
on public.device_catalog_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert device catalog items" on public.device_catalog_items;
create policy "Authenticated users can insert device catalog items"
on public.device_catalog_items
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update device catalog items" on public.device_catalog_items;
create policy "Authenticated users can update device catalog items"
on public.device_catalog_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete device catalog items" on public.device_catalog_items;
create policy "Authenticated users can delete device catalog items"
on public.device_catalog_items
for delete
to authenticated
using (true);
