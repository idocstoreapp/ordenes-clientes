-- ============================================================
-- NORMALIZED DEVICE CATALOG (Supabase / PostgreSQL)
-- Author: migration blueprint for messy `device_model` source
-- ============================================================
-- This script:
-- 1) Creates normalized tables
-- 2) Adds constraints/indexes
-- 3) Migrates data from raw table `device_model`
-- 4) Builds wizard-ready display_name
-- ============================================================

begin;

-- Optional but strongly recommended for text normalization/search
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- 1) Core normalized tables
-- ------------------------------------------------------------

create table if not exists public.device_types (
  id bigint generated always as identity primary key,
  code text not null unique, -- phone, tablet, laptop, console, wearable, other
  name text not null unique,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id bigint generated always as identity primary key,
  device_type_id bigint not null references public.device_types(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  logo_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_type_id, normalized_name)
);

create table if not exists public.product_lines (
  id bigint generated always as identity primary key,
  brand_id bigint not null references public.brands(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, normalized_name)
);

create table if not exists public.models (
  id bigint generated always as identity primary key,
  product_line_id bigint not null references public.product_lines(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_line_id, normalized_name)
);

create table if not exists public.variants (
  id bigint generated always as identity primary key,
  model_id bigint not null references public.models(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (model_id, normalized_name)
);

-- Materialized catalog row for wizard (all levels + display + image override)
create table if not exists public.device_catalog_items (
  id bigint generated always as identity primary key,
  device_type_id bigint not null references public.device_types(id) on delete restrict,
  brand_id bigint not null references public.brands(id) on delete restrict,
  product_line_id bigint not null references public.product_lines(id) on delete restrict,
  model_id bigint not null references public.models(id) on delete restrict,
  variant_id bigint null references public.variants(id) on delete set null,
  display_name text not null,
  image_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_type_id, brand_id, product_line_id, model_id, variant_id)
);

-- ------------------------------------------------------------
-- 2) Performance indexes (wizard + search)
-- ------------------------------------------------------------

create index if not exists idx_brands_device_type on public.brands(device_type_id) where is_active;
create index if not exists idx_lines_brand on public.product_lines(brand_id) where is_active;
create index if not exists idx_models_line on public.models(product_line_id) where is_active;
create index if not exists idx_variants_model on public.variants(model_id) where is_active;

create index if not exists idx_catalog_type_brand_line_model
  on public.device_catalog_items(device_type_id, brand_id, product_line_id, model_id)
  where is_active;

create index if not exists idx_catalog_display_trgm
  on public.device_catalog_items using gin (display_name gin_trgm_ops);

-- ------------------------------------------------------------
-- 3) updated_at trigger helper
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'device_types','brands','product_lines','models','variants','device_catalog_items'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I;', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at();', t, t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 4) Seed controlled vocab / base taxonomy
-- ------------------------------------------------------------

insert into public.device_types (code, name)
values
  ('phone', 'Celular'),
  ('tablet', 'Tablet'),
  ('laptop', 'Notebook'),
  ('console', 'Consola'),
  ('wearable', 'Smartwatch'),
  ('other', 'Otros')
on conflict (code) do update set name = excluded.name;

-- ------------------------------------------------------------
-- 5) Migration from messy source table `device_model`
-- IMPORTANT:
--   Assumes source table: public.device_model(raw_name text)
--   If your column has another name, replace src.raw_name below.
-- ------------------------------------------------------------

with src as (
  select trim(raw_name) as raw_name
  from public.device_model
  where raw_name is not null
    and trim(raw_name) <> ''
),
normalized as (
  select
    raw_name,
    lower(trim(regexp_replace(unaccent(raw_name), '\s+', ' ', 'g'))) as n
  from src
),
parsed as (
  select
    raw_name,
    n,
    case
      when n ~ '(watch|iwatch|reloj|fenix|gt2|gt4|active)' then 'wearable'
      when n ~ '(ipad|tablet|tab )' then 'tablet'
      when n ~ '(macbook|notebook|laptop|dell|hp|acer|asus|lenovo|victus|omen|ideapad|inspiron|zenbook)' then 'laptop'
      when n ~ '(ps4|ps5|playstation|nintendo|xbox|switch|control de play)' then 'console'
      else 'phone'
    end as device_type_code,
    case
      when n ~ '(iphone|apple watch|macbook|ipad|airpods|ipod)' then 'apple'
      when n ~ '(samsung|galaxy|sm-)' then 'samsung'
      when n ~ '(xiaomi|redmi|poco|mi 10|mi 11|mi 12|mi 13|14t|13c)' then 'xiaomi'
      when n ~ '(motorola|moto )' then 'motorola'
      when n ~ '(huawei|honor)' then 'huawei'
      when n ~ '(oppo)' then 'oppo'
      when n ~ '(vivo)' then 'vivo'
      when n ~ '(pixel|google)' then 'google'
      when n ~ '(lenovo)' then 'lenovo'
      when n ~ '(acer)' then 'acer'
      when n ~ '(asus)' then 'asus'
      when n ~ '(dell)' then 'dell'
      when n ~ '(^hp| hp )' then 'hp'
      when n ~ '(playstation|ps4|ps5)' then 'playstation'
      when n ~ '(nintendo|switch)' then 'nintendo'
      else 'other'
    end as brand_norm,
    case
      when n ~ '(iphone)' then 'iPhone'
      when n ~ '(ipad)' then 'iPad'
      when n ~ '(macbook)' then 'MacBook'
      when n ~ '(apple watch|watch|iwatch)' then 'Apple Watch'
      when n ~ '(samsung|galaxy)' and n ~ '(s[0-9]{1,2})' then 'Galaxy S'
      when n ~ '(samsung|galaxy)' and n ~ '(a[0-9]{1,2})' then 'Galaxy A'
      when n ~ '(samsung|galaxy)' and n ~ '(note)' then 'Galaxy Note'
      when n ~ '(samsung|galaxy)' and n ~ '(tab)' then 'Galaxy Tab'
      when n ~ '(redmi note)' then 'Redmi Note'
      when n ~ '(redmi)' then 'Redmi'
      when n ~ '(poco)' then 'POCO'
      when n ~ '(motorola|moto )' and n ~ '(edge)' then 'Moto Edge'
      when n ~ '(motorola|moto )' and n ~ '(g[0-9]{1,2})' then 'Moto G'
      when n ~ '(playstation|ps4|ps5)' then 'PlayStation'
      when n ~ '(nintendo|switch)' then 'Nintendo Switch'
      else 'General'
    end as line_name,
    -- model token (best effort)
    coalesce(
      (regexp_match(n, '(iphone\s*[0-9]{1,2}[a-z]?)'))[1],
      (regexp_match(n, '(s[0-9]{2}\+?|a[0-9]{2}|note\s*[0-9]{1,2}|z\s*(flip|fold)\s*[0-9]?)'))[1],
      (regexp_match(n, '(redmi\s*note\s*[0-9]{1,2}|redmi\s*[0-9]{1,2}[a-z]?|poco\s*[a-z0-9]+\s*pro?)'))[1],
      (regexp_match(n, '(macbook\s*(air|pro)?\s*[a-z0-9"]*)'))[1],
      initcap(n)
    ) as model_name,
    case
      when n ~ '(pro max)' then 'Pro Max'
      when n ~ '(pro plus|pro\+)' then 'Pro Plus'
      when n ~ '(ultra)' then 'Ultra'
      when n ~ '(^| )plus( |$)' then 'Plus'
      when n ~ '(^| )pro( |$)' then 'Pro'
      when n ~ '(mini)' then 'Mini'
      when n ~ '(^| )se( |$)' then 'SE'
      when n ~ '(^| )fe( |$)' then 'FE'
      else null
    end as variant_name
  from normalized
),
normed as (
  select distinct
    p.raw_name,
    p.device_type_code,
    p.brand_norm,
    initcap(replace(p.brand_norm, '_', ' ')) as brand_name,
    p.line_name,
    initcap(trim(regexp_replace(p.model_name, '\s+', ' ', 'g'))) as model_name,
    p.variant_name
  from parsed p
),
ins_brands as (
  insert into public.brands (device_type_id, name, normalized_name)
  select distinct
    dt.id,
    n.brand_name,
    lower(trim(n.brand_norm))
  from normed n
  join public.device_types dt on dt.code = n.device_type_code
  where not exists (
    select 1 from public.brands b
    where b.device_type_id = dt.id
      and b.normalized_name = lower(trim(n.brand_norm))
  )
  returning id
),
ins_lines as (
  insert into public.product_lines (brand_id, name, normalized_name)
  select distinct
    b.id,
    n.line_name,
    lower(trim(unaccent(n.line_name)))
  from normed n
  join public.device_types dt on dt.code = n.device_type_code
  join public.brands b
    on b.device_type_id = dt.id
   and b.normalized_name = lower(trim(n.brand_norm))
  where not exists (
    select 1 from public.product_lines pl
    where pl.brand_id = b.id
      and pl.normalized_name = lower(trim(unaccent(n.line_name)))
  )
  returning id
),
ins_models as (
  insert into public.models (product_line_id, name, normalized_name)
  select distinct
    pl.id,
    n.model_name,
    lower(trim(unaccent(n.model_name)))
  from normed n
  join public.device_types dt on dt.code = n.device_type_code
  join public.brands b
    on b.device_type_id = dt.id
   and b.normalized_name = lower(trim(n.brand_norm))
  join public.product_lines pl
    on pl.brand_id = b.id
   and pl.normalized_name = lower(trim(unaccent(n.line_name)))
  where not exists (
    select 1 from public.models m
    where m.product_line_id = pl.id
      and m.normalized_name = lower(trim(unaccent(n.model_name)))
  )
  returning id
),
ins_variants as (
  insert into public.variants (model_id, name, normalized_name)
  select distinct
    m.id,
    n.variant_name,
    lower(trim(unaccent(n.variant_name)))
  from normed n
  join public.device_types dt on dt.code = n.device_type_code
  join public.brands b
    on b.device_type_id = dt.id
   and b.normalized_name = lower(trim(n.brand_norm))
  join public.product_lines pl
    on pl.brand_id = b.id
   and pl.normalized_name = lower(trim(unaccent(n.line_name)))
  join public.models m
    on m.product_line_id = pl.id
   and m.normalized_name = lower(trim(unaccent(n.model_name)))
  where n.variant_name is not null
    and not exists (
      select 1 from public.variants v
      where v.model_id = m.id
        and v.normalized_name = lower(trim(unaccent(n.variant_name)))
    )
  returning id
)
insert into public.device_catalog_items (
  device_type_id, brand_id, product_line_id, model_id, variant_id, display_name, image_url
)
select distinct
  dt.id,
  b.id,
  pl.id,
  m.id,
  v.id,
  trim(
    concat_ws(' ',
      b.name,
      pl.name,
      m.name,
      coalesce(v.name, '')
    )
  ) as display_name,
  null::text as image_url
from normed n
join public.device_types dt on dt.code = n.device_type_code
join public.brands b
  on b.device_type_id = dt.id
 and b.normalized_name = lower(trim(n.brand_norm))
join public.product_lines pl
  on pl.brand_id = b.id
 and pl.normalized_name = lower(trim(unaccent(n.line_name)))
join public.models m
  on m.product_line_id = pl.id
 and m.normalized_name = lower(trim(unaccent(n.model_name)))
left join public.variants v
  on v.model_id = m.id
 and n.variant_name is not null
 and v.normalized_name = lower(trim(unaccent(n.variant_name)))
where not exists (
  select 1
  from public.device_catalog_items dci
  where dci.device_type_id = dt.id
    and dci.brand_id = b.id
    and dci.product_line_id = pl.id
    and dci.model_id = m.id
    and coalesce(dci.variant_id, -1) = coalesce(v.id, -1)
);

commit;

-- ------------------------------------------------------------
-- 6) Final query for display_name (wizard/selector)
-- ------------------------------------------------------------
-- select
--   dci.id,
--   dt.name as device_type,
--   b.name as brand,
--   pl.name as product_line,
--   m.name as model,
--   v.name as variant,
--   dci.display_name,
--   coalesce(dci.image_url, pl.image_url, b.logo_url, dt.image_url) as image_for_ui
-- from public.device_catalog_items dci
-- join public.device_types dt on dt.id = dci.device_type_id
-- join public.brands b on b.id = dci.brand_id
-- join public.product_lines pl on pl.id = dci.product_line_id
-- join public.models m on m.id = dci.model_id
-- left join public.variants v on v.id = dci.variant_id
-- where dci.is_active = true
-- order by dt.name, b.name, pl.name, m.name, v.name nulls first;
