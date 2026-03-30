-- Seed automático del catálogo jerárquico usando work_orders.device_model
-- Ejecutar DESPUÉS de create_device_catalog_items.sql

-- 1) Tipos base (los más atendidos)
insert into public.device_catalog_items (level, parent_id, type_key, item_key, label, description, sort_order, is_active)
select x.level, null::uuid, x.type_key, x.item_key, x.label, x.description, x.sort_order, true
from (
  values
    ('type', 'iphone', 'celular', 'Celular', 'Teléfonos móviles (iPhone/Android)', 1),
    ('type', 'macbook', 'notebook', 'Notebook', 'Laptops y notebooks', 2),
    ('type', 'apple_watch', 'smartwatch', 'Smartwatch', 'Relojes inteligentes', 3),
    ('type', 'ipad', 'tablet', 'Tablet', 'Tablets iPad/Android', 4)
) as x(level, type_key, item_key, label, description, sort_order)
where not exists (
  select 1
  from public.device_catalog_items d
  where d.level = x.level
    and d.item_key = x.item_key
    and d.parent_id is null
);

-- 2) Normalizar modelos crudos desde work_orders
with raw_models as (
  select distinct
    trim(device_model) as raw_model,
    lower(trim(regexp_replace(device_model, '\s+', ' ', 'g'))) as norm
  from public.work_orders
  where device_model is not null
    and trim(device_model) <> ''
),
classified as (
  select
    raw_model,
    norm,
    case
      when norm ~ '(watch|iwatch|reloj|fenix|gt2|gt 2|gt4|active 2)' then 'apple_watch'
      when norm ~ '(ipad|tablet|tab )' then 'ipad'
      when norm ~ '(macbook|notebook|laptop|lenovo|acer|asus|dell|hp|victus|omen|ideapad|swift|inspiron|pavilion)' then 'macbook'
      else 'iphone'
    end as type_key,
    case
      when norm ~ '(iphone|apple watch|macbook|ipad|airpods|ipod)' then 'apple'
      when norm ~ '(motorola|moto )' then 'motorola'
      when norm ~ '(xiaomi|redmi|poco|mi 10|mi 11|13c|14t)' then 'xiaomi'
      when norm ~ '(samsung|galaxy|sm-)' then 'samsung'
      when norm ~ '(huawei|honor)' then 'huawei'
      when norm ~ '(oppo)' then 'oppo'
      when norm ~ '(vivo)' then 'vivo'
      when norm ~ '(pixel|google)' then 'google'
      when norm ~ '(lenovo)' then 'lenovo'
      when norm ~ '(acer)' then 'acer'
      when norm ~ '(asus)' then 'asus'
      when norm ~ '(dell)' then 'dell'
      when norm ~ '(^hp| hp )' then 'hp'
      else 'other'
    end as brand_key,
    case
      when norm ~ '(iphone)' then 'iPhone'
      when norm ~ '(ipad)' then 'iPad'
      when norm ~ '(macbook)' then 'MacBook'
      when norm ~ '(apple watch|watch|iwatch)' then 'Apple Watch'
      when norm ~ '(samsung|galaxy)' and norm ~ '(s[0-9]{1,2})' then 'Serie S'
      when norm ~ '(samsung|galaxy)' and norm ~ '(a[0-9]{1,2})' then 'Serie A'
      when norm ~ '(samsung|galaxy)' and norm ~ '(note)' then 'Serie Note'
      when norm ~ '(samsung|galaxy)' and norm ~ '(tab)' then 'Serie Tab'
      when norm ~ '(redmi)' then 'Redmi'
      when norm ~ '(poco)' then 'POCO'
      when norm ~ '(xiaomi)' then 'Xiaomi'
      when norm ~ '(motorola|moto )' and norm ~ '(edge)' then 'Motorola Edge'
      when norm ~ '(motorola|moto )' and norm ~ '(g[0-9]{1,2})' then 'Moto G'
      when norm ~ '(huawei)' then 'Huawei'
      when norm ~ '(honor)' then 'Honor'
      else 'General'
    end as line_label,
    initcap(regexp_replace(norm, '\s+', ' ', 'g')) as model_label,
    case
      when norm ~ '(pro max)' then 'Pro Max'
      when norm ~ '(pro\+|pro plus)' then 'Pro Plus'
      when norm ~ '(ultra)' then 'Ultra'
      when norm ~ '(plus)' then 'Plus'
      when norm ~ '(^| )pro( |$)' then 'Pro'
      when norm ~ '(mini)' then 'Mini'
      when norm ~ '(^| )se( |$)' then 'SE'
      when norm ~ '(fe)' then 'FE'
      when norm ~ '(5g)' then '5G'
      when norm ~ '(4g)' then '4G'
      else null
    end as variant_label
  from raw_models
),
type_rows as (
  select id, item_key, type_key
  from public.device_catalog_items
  where level = 'type'
),
brand_source as (
  select distinct
    c.type_key,
    c.brand_key,
    case c.brand_key
      when 'apple' then 'Apple'
      when 'motorola' then 'Motorola'
      when 'xiaomi' then 'Xiaomi'
      when 'samsung' then 'Samsung'
      when 'huawei' then 'Huawei'
      when 'oppo' then 'Oppo'
      when 'vivo' then 'Vivo'
      when 'google' then 'Google'
      when 'lenovo' then 'Lenovo'
      when 'acer' then 'Acer'
      when 'asus' then 'Asus'
      when 'dell' then 'Dell'
      when 'hp' then 'HP'
      else 'Otros'
    end as brand_label
  from classified c
),
ins_brands as (
  insert into public.device_catalog_items (level, parent_id, type_key, item_key, label, description, sort_order, is_active)
  select
    'brand',
    t.id,
    b.type_key,
    b.brand_key,
    b.brand_label,
    'Marca detectada desde historial de órdenes',
    0,
    true
  from brand_source b
  join type_rows t on t.type_key = b.type_key
  where not exists (
    select 1 from public.device_catalog_items d
    where d.level = 'brand' and d.parent_id = t.id and d.item_key = b.brand_key
  )
  returning id
),
brand_rows as (
  select id, parent_id, type_key, item_key, label
  from public.device_catalog_items
  where level = 'brand'
),
line_source as (
  select distinct c.type_key, c.brand_key, c.line_label
  from classified c
),
ins_lines as (
  insert into public.device_catalog_items (level, parent_id, type_key, item_key, label, description, sort_order, is_active)
  select
    'line',
    b.id,
    l.type_key,
    lower(regexp_replace(l.line_label, '[^a-z0-9]+', '_', 'g')),
    l.line_label,
    'Línea/serie detectada desde historial',
    0,
    true
  from line_source l
  join brand_rows b on b.type_key = l.type_key and b.item_key = l.brand_key
  where not exists (
    select 1 from public.device_catalog_items d
    where d.level = 'line'
      and d.parent_id = b.id
      and d.item_key = lower(regexp_replace(l.line_label, '[^a-z0-9]+', '_', 'g'))
  )
  returning id
),
line_rows as (
  select id, parent_id, type_key, item_key, label
  from public.device_catalog_items
  where level = 'line'
),
model_source as (
  select distinct c.type_key, c.brand_key, c.line_label, c.model_label, c.variant_label
  from classified c
),
ins_models as (
  insert into public.device_catalog_items (level, parent_id, type_key, item_key, label, description, sort_order, is_active)
  select
    'model',
    l.id,
    m.type_key,
    left(lower(regexp_replace(m.model_label, '[^a-z0-9]+', '_', 'g')), 120),
    m.model_label,
    'Modelo importado automáticamente desde work_orders.device_model',
    0,
    true
  from model_source m
  join brand_rows b on b.type_key = m.type_key and b.item_key = m.brand_key
  join line_rows l on l.parent_id = b.id and l.label = m.line_label
  where not exists (
    select 1 from public.device_catalog_items d
    where d.level = 'model'
      and d.parent_id = l.id
      and d.item_key = left(lower(regexp_replace(m.model_label, '[^a-z0-9]+', '_', 'g')), 120)
  )
  returning id
),
model_rows as (
  select id, parent_id, type_key, label
  from public.device_catalog_items
  where level = 'model'
),
variant_source as (
  select distinct c.type_key, c.brand_key, c.line_label, c.model_label, c.variant_label
  from classified c
  where c.variant_label is not null
)
insert into public.device_catalog_items (level, parent_id, type_key, item_key, label, description, sort_order, is_active)
select
  'variant',
  m.id,
  v.type_key,
  lower(regexp_replace(v.variant_label, '[^a-z0-9]+', '_', 'g')),
  v.variant_label,
  'Variante importada automáticamente',
  0,
  true
from variant_source v
join brand_rows b on b.type_key = v.type_key and b.item_key = v.brand_key
join line_rows l on l.parent_id = b.id and l.label = v.line_label
join model_rows m on m.parent_id = l.id and m.label = v.model_label
where not exists (
  select 1 from public.device_catalog_items d
  where d.level = 'variant'
    and d.parent_id = m.id
    and d.item_key = lower(regexp_replace(v.variant_label, '[^a-z0-9]+', '_', 'g'))
);
