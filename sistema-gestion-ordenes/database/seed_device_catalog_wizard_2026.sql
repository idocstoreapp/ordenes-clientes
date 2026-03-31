-- Seed robusto para catálogo del wizard (normalizado)
-- Objetivo: insertar/mantener tipos, marcas, líneas, modelos, variantes y device_catalog_items.
-- Compatible con esquemas donde device_catalog_items también tiene columnas: level, sort_order, label.

begin;

-- 0) Asegurar tipos base del wizard (por si faltan o usan nombres antiguos)
insert into public.device_types (code, name)
values
  ('laptop', 'Notebook'),
  ('tablet', 'Tablet'),
  ('wearable', 'Smartwatch'),
  ('console', 'Consola'),
  ('other', 'Otros')
on conflict (code) do update
set name = excluded.name,
    updated_at = now();

-- 1) Dataset de entrada
create temporary table tmp_device_seed (
  requested_type text,
  brand_name text,
  line_name text,
  model_name text,
  variant_name text
) on commit drop;

insert into tmp_device_seed (requested_type, brand_name, line_name, model_name, variant_name)
values
  -- NOTEBOOK / LAPTOP
  ('laptop','Apple','MacBook Air','M1','13"'),
  ('laptop','Apple','MacBook Air','M2','13"'),
  ('laptop','Apple','MacBook Air','A1932',null),
  ('laptop','Apple','MacBook Air','A2179',null),
  ('laptop','Apple','MacBook Air','A1465',null),
  ('laptop','Apple','MacBook Air','A1466',null),
  ('laptop','Apple','MacBook Air','A1534',null),
  ('laptop','Apple','MacBook Pro','M1','13"'),
  ('laptop','Apple','MacBook Pro','A1278',null),
  ('laptop','Apple','MacBook Pro','A1707',null),
  ('laptop','Apple','MacBook Pro','A1708',null),
  ('laptop','Apple','MacBook Pro','A1989',null),
  ('laptop','Apple','MacBook Pro','A2141',null),
  ('laptop','Apple','MacBook Genérica','A1398',null),
  ('laptop','Apple','MacBook Genérica','A1502',null),
  ('laptop','Apple','MacBook Genérica','A2159',null),
  ('laptop','Apple','MacBook Genérica','A2337',null),
  ('laptop','Apple','MacBook Genérica','A2338',null),

  ('laptop','Lenovo','G','G470',null),
  ('laptop','Lenovo','IdeaPad','520s',null),
  ('laptop','Lenovo','IdeaPad','1 14ADA05',null),
  ('laptop','Lenovo','LOQ','15IAX9',null),

  ('laptop','HP','Pavilion','X360',null),
  ('laptop','HP','Pavilion','15',null),
  ('laptop','HP','Pavilion','Gamer',null),
  ('laptop','HP','Envy','Genérica',null),
  ('laptop','HP','Spectre','X360',null),

  ('laptop','Asus','Zenbook','13',null),
  ('laptop','Asus','ROG','FX517Z',null),
  ('laptop','Asus','Otros','E410M',null),

  ('laptop','Acer','Nitro','5',null),
  ('laptop','Acer','Swift','3',null),
  ('laptop','Acer','Genérica','N18Q13',null),

  ('laptop','Dell','Genérica','P101F',null),
  ('laptop','Huawei','Laptop','Dongguan',null),
  ('laptop','Chuwi','Notebook','Chuwi notebook',null),
  ('laptop','HP','Omen','Omen (HP gaming)',null),
  ('laptop','Otros','Gamer','M6',null),

  -- TABLET
  ('tablet','Apple','iPad','6ta generación',null),
  ('tablet','Apple','iPad','7ma generación',null),
  ('tablet','Apple','iPad','8va generación',null),
  ('tablet','Apple','iPad','9na generación',null),
  ('tablet','Apple','iPad','A2197',null),
  ('tablet','Apple','iPad','A2270',null),
  ('tablet','Apple','iPad','A2602',null),

  ('tablet','Apple','Air','1ra gen',null),
  ('tablet','Apple','Air','4ta gen',null),
  ('tablet','Apple','Air','5ta gen',null),
  ('tablet','Apple','Air','A1474',null),
  ('tablet','Apple','Air','A2316',null),

  ('tablet','Apple','Pro','11"',null),
  ('tablet','Apple','Pro','12.9"',null),
  ('tablet','Apple','Pro','A1876',null),
  ('tablet','Apple','Pro','A1980',null),
  ('tablet','Apple','Mini','6th gen',null),

  ('tablet','Samsung','Tab','S6 Lite',null),
  ('tablet','Samsung','Tab','S7 FE',null),
  ('tablet','Samsung','Tab','S8',null),
  ('tablet','Samsung','Tab','A7',null),
  ('tablet','Samsung','Tab','A9+',null),

  ('tablet','Lenovo','Tab','M8','4ta gen'),
  ('tablet','Lenovo','Tab','M9',null),
  ('tablet','Lenovo','Tab','M10','2da gen'),
  ('tablet','Lenovo','Tab','M10','3ra gen'),
  ('tablet','Lenovo','Tab','TB-X606F',null),
  ('tablet','Lenovo','Tab','X304F',null),
  ('tablet','Lenovo','Tab','P11',null),

  ('tablet','Huawei','Tablet','BH4-W09',null),
  ('tablet','Xiaomi','Pad','Pad Pro 12.1',null),
  ('tablet','SoyMomo','Tablet','Pro',null),
  ('tablet','Otros','Tablet gráfica','Genérica',null),

  -- SMARTWATCH
  ('wearable','Apple','Apple Watch','Series 1',null),
  ('wearable','Apple','Apple Watch','Series 3',null),
  ('wearable','Apple','Apple Watch','Series 4',null),
  ('wearable','Apple','Apple Watch','Series 5',null),
  ('wearable','Apple','Apple Watch','Series 6',null),
  ('wearable','Apple','Apple Watch','Series 7',null),
  ('wearable','Apple','Apple Watch','Series 8',null),
  ('wearable','Apple','Apple Watch','SE',null),
  ('wearable','Apple','Apple Watch','Series 1','38mm'),
  ('wearable','Apple','Apple Watch','Series 3','40mm'),
  ('wearable','Apple','Apple Watch','Series 4','42mm'),
  ('wearable','Apple','Apple Watch','Series 5','44mm'),
  ('wearable','Apple','Apple Watch','Series 6','45mm'),

  ('wearable','Samsung','Galaxy Watch','Galaxy Watch',null),
  ('wearable','Samsung','Galaxy Watch','Active 2',null),

  ('wearable','Huawei','Watch','GT2',null),
  ('wearable','Huawei','Watch','GT2e',null),
  ('wearable','Huawei','Watch','GT3 Pro',null),

  ('wearable','Garmin','Fenix','5X',null),
  ('wearable','Garmin','Fenix','3',null),

  ('wearable','Amazfit','GTS','GTS',null),
  ('wearable','Otros','Reloj inteligente','Genérico','49mm'),

  -- CONSOLAS / GAMING
  ('console','Sony','PlayStation','PlayStation 4','FAT'),
  ('console','Sony','PlayStation','PlayStation 4','Slim'),
  ('console','Sony','PlayStation','PlayStation 5',null),
  ('console','Microsoft','Xbox','Xbox One S',null),
  ('console','Nintendo','Switch','Switch',null),
  ('console','Nintendo','Wii','Wii',null),
  ('console','Accesorios gaming','Mandos','Mandos PS4',null),
  ('console','Accesorios gaming','Volante','G920',null),

  -- ACCESORIOS / AUDIO + OTROS
  ('other','Apple','AirPods','AirPods',null),
  ('other','JBL','Parlantes','Parlantes',null),
  ('other','Sony','Audífonos','Audífonos',null),
  ('other','Fantech','Audífonos','Fantech audífonos',null),
  ('other','Marley','EM-JA013','EM-JA013',null),
  ('other','Otros','Parlante','ShoqBox',null),

  ('other','Amazon','Lectores','Kindle',null),
  ('other','Otros','Electrónica variada','Monitor de bebé',null),
  ('other','Otros','Electrónica variada','Control de portón',null),
  ('other','Otros','Electrónica variada','SSD externo',null),
  ('other','Apple','Accesorios','Cargador MagSafe',null),
  ('other','Otros','Electrónica variada','Placa control grúa',null);

-- Limpieza de modelos “agrupados” (con slash) para permitir selección individual.
-- Se eliminan primero los items del catálogo que dependan de estos modelos.
delete from public.device_catalog_items dci
using public.models m
where dci.model_id = m.id
  and m.name in (
    'A1932 / A2179 / A1465 / A1466 / A1534',
    'A1278 / A1707 / A1708 / A1989 / A2141',
    'A1398 / A1502 / A2159 / A2337 / A2338',
    'A2197 / A2270 / A2602',
    'A1474 / A2316',
    'A1876 / A1980'
  );

delete from public.variants v
using public.models m
where v.model_id = m.id
  and m.name in (
    'A1932 / A2179 / A1465 / A1466 / A1534',
    'A1278 / A1707 / A1708 / A1989 / A2141',
    'A1398 / A1502 / A2159 / A2337 / A2338',
    'A2197 / A2270 / A2602',
    'A1474 / A2316',
    'A1876 / A1980'
  );

delete from public.models
where name in (
  'A1932 / A2179 / A1465 / A1466 / A1534',
  'A1278 / A1707 / A1708 / A1989 / A2141',
  'A1398 / A1502 / A2159 / A2337 / A2338',
  'A2197 / A2270 / A2602',
  'A1474 / A2316',
  'A1876 / A1980'
);

-- 2) Normalizar y resolver device_type_id de forma tolerante (code + name)
create temporary table tmp_norm as
select distinct
  s.requested_type,
  trim(s.brand_name) as brand_name,
  lower(trim(s.brand_name)) as brand_norm,
  trim(s.line_name) as line_name,
  lower(trim(s.line_name)) as line_norm,
  trim(s.model_name) as model_name,
  lower(trim(s.model_name)) as model_norm,
  nullif(trim(s.variant_name), '') as variant_name,
  case when nullif(trim(s.variant_name), '') is null then null else lower(trim(s.variant_name)) end as variant_norm
from tmp_device_seed s;

create temporary table tmp_type_map as
select
  n.requested_type,
  (
    select dt.id
    from public.device_types dt
    where dt.code = n.requested_type
       or lower(dt.name) = case n.requested_type
          when 'laptop' then 'notebook'
          when 'tablet' then 'tablet'
          when 'wearable' then 'smartwatch'
          when 'console' then 'consola'
          when 'other' then 'otros'
          else lower(n.requested_type)
        end
    order by case when dt.code = n.requested_type then 0 else 1 end
    limit 1
  ) as device_type_id
from (select distinct requested_type from tmp_norm) n;

-- Seguridad: si faltó mapear algún tipo, abortar con error explícito
DO $$
begin
  if exists (select 1 from tmp_type_map where device_type_id is null) then
    raise exception 'No se pudo resolver device_type_id para uno o más tipos en tmp_type_map';
  end if;
end $$;

-- 3) Brands
insert into public.brands (device_type_id, name, normalized_name)
select distinct tm.device_type_id, n.brand_name, n.brand_norm
from tmp_norm n
join tmp_type_map tm on tm.requested_type = n.requested_type
where not exists (
  select 1
  from public.brands b
  where b.device_type_id = tm.device_type_id
    and b.normalized_name = n.brand_norm
);

-- 4) Product lines
insert into public.product_lines (brand_id, name, normalized_name)
select distinct b.id, n.line_name, n.line_norm
from tmp_norm n
join tmp_type_map tm on tm.requested_type = n.requested_type
join public.brands b
  on b.device_type_id = tm.device_type_id
 and b.normalized_name = n.brand_norm
where not exists (
  select 1
  from public.product_lines pl
  where pl.brand_id = b.id
    and pl.normalized_name = n.line_norm
);

-- 5) Models
insert into public.models (product_line_id, name, normalized_name)
select distinct pl.id, n.model_name, n.model_norm
from tmp_norm n
join tmp_type_map tm on tm.requested_type = n.requested_type
join public.brands b
  on b.device_type_id = tm.device_type_id
 and b.normalized_name = n.brand_norm
join public.product_lines pl
  on pl.brand_id = b.id
 and pl.normalized_name = n.line_norm
where not exists (
  select 1
  from public.models m
  where m.product_line_id = pl.id
    and m.normalized_name = n.model_norm
);

-- 6) Variants
insert into public.variants (model_id, name, normalized_name)
select distinct m.id, n.variant_name, n.variant_norm
from tmp_norm n
join tmp_type_map tm on tm.requested_type = n.requested_type
join public.brands b
  on b.device_type_id = tm.device_type_id
 and b.normalized_name = n.brand_norm
join public.product_lines pl
  on pl.brand_id = b.id
 and pl.normalized_name = n.line_norm
join public.models m
  on m.product_line_id = pl.id
 and m.normalized_name = n.model_norm
where n.variant_name is not null
  and not exists (
    select 1
    from public.variants v
    where v.model_id = m.id
      and v.normalized_name = n.variant_norm
  );

-- 7) Device catalog items (incluyendo columnas extra level/label/sort_order)
insert into public.device_catalog_items (
  device_type_id,
  brand_id,
  product_line_id,
  model_id,
  variant_id,
  display_name,
  image_url,
  is_active,
  level,
  sort_order,
  label
)
select
  tm.device_type_id,
  b.id as brand_id,
  pl.id as product_line_id,
  m.id as model_id,
  v.id as variant_id,
  concat_ws(' · ',
    coalesce(dt.name, tm.requested_type),
    b.name,
    pl.name,
    m.name,
    v.name
  ) as display_name,
  null as image_url,
  true as is_active,
  'model'::text as level,
  '0'::text as sort_order,
  concat_ws(' ', b.name, pl.name, m.name, v.name) as label
from tmp_norm n
join tmp_type_map tm on tm.requested_type = n.requested_type
join public.device_types dt on dt.id = tm.device_type_id
join public.brands b
  on b.device_type_id = tm.device_type_id
 and b.normalized_name = n.brand_norm
join public.product_lines pl
  on pl.brand_id = b.id
 and pl.normalized_name = n.line_norm
join public.models m
  on m.product_line_id = pl.id
 and m.normalized_name = n.model_norm
left join public.variants v
  on v.model_id = m.id
 and v.normalized_name = n.variant_norm
where not exists (
  select 1
  from public.device_catalog_items dci
  where dci.device_type_id = tm.device_type_id
    and dci.brand_id = b.id
    and dci.product_line_id = pl.id
    and dci.model_id = m.id
    and dci.variant_id is not distinct from v.id
);

-- 8) Resumen útil (muestra lo que quedó disponible en wizard)
-- Puedes ejecutar estas consultas después del script en Supabase SQL editor:
-- select code, name from public.device_types where code in ('laptop','tablet','wearable','console','other');
-- select count(*) from public.device_catalog_items;
-- select dt.name as tipo, b.name as marca, pl.name as linea, m.name as modelo, v.name as variante
-- from public.device_catalog_items dci
-- join public.device_types dt on dt.id = dci.device_type_id
-- join public.brands b on b.id = dci.brand_id
-- join public.product_lines pl on pl.id = dci.product_line_id
-- join public.models m on m.id = dci.model_id
-- left join public.variants v on v.id = dci.variant_id
-- where b.name in ('Apple','Samsung','Lenovo','Sony','HP')
-- order by tipo, marca, linea, modelo
-- limit 200;

commit;
