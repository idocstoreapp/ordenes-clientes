-- ============================================
-- CORRECCIÓN: Consistencia entre número de sucursal y nombre
-- ============================================
-- Este script corrige las inconsistencias entre el número de sucursal asignado
-- y el nombre del local del técnico, basándose en el nombre del local.
-- ============================================

-- Primero, actualizar los nombres de las sucursales en la tabla branches
UPDATE branches SET name = 'Tienda Mall Trebol' WHERE name = 'Sucursal 1' OR name LIKE '%Mall Trebol%';
UPDATE branches SET name = 'Tienda Providencia' WHERE name = 'Sucursal 2' OR name LIKE '%Providencia%';
UPDATE branches SET name = 'Tienda Puente Alto' WHERE name = 'Sucursal 3' OR name LIKE '%Puente Alto%';
UPDATE branches SET name = 'Tienda Maipu' WHERE name = 'Sucursal 4' OR name LIKE '%Maipu%';
UPDATE branches SET name = 'Tienda Concepcion' WHERE name = 'Sucursal 5' OR name LIKE '%Concepcion%';
UPDATE branches SET name = 'Tienda Santiago' WHERE name = 'Sucursal 6' OR name LIKE '%Santiago%';
UPDATE branches SET name = 'Tienda Apumanque' WHERE name = 'Sucursal 7' OR name LIKE '%Apumanque%';

-- Corregir asignaciones de sucursal basándose en el nombre del local del técnico
-- Sucursal 1: Tienda Mall Trebol
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Mall Trebol' LIMIT 1)
WHERE local ILIKE '%Mall Trebol%' OR local ILIKE '%Trebol%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Mall Trebol' LIMIT 1));

-- Sucursal 2: Tienda Providencia
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Providencia' LIMIT 1)
WHERE local ILIKE '%Providencia%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Providencia' LIMIT 1));

-- Sucursal 3: Tienda Puente Alto
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Puente Alto' LIMIT 1)
WHERE local ILIKE '%Puente Alto%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Puente Alto' LIMIT 1));

-- Sucursal 4: Tienda Maipu
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Maipu' LIMIT 1)
WHERE local ILIKE '%Maipu%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Maipu' LIMIT 1));

-- Sucursal 5: Tienda Concepcion
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Concepcion' LIMIT 1)
WHERE local ILIKE '%Concepcion%' OR local ILIKE '%Concepción%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Concepcion' LIMIT 1));

-- Sucursal 6: Tienda Santiago
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Santiago' LIMIT 1)
WHERE local ILIKE '%Santiago%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Santiago' LIMIT 1))
AND local NOT ILIKE '%Puente Alto%' -- Excluir Puente Alto que también tiene "Santiago"
AND local NOT ILIKE '%Providencia%'; -- Excluir otros que puedan tener "Santiago"

-- Sucursal 7: Tienda Apumanque
UPDATE users 
SET sucursal_id = (SELECT id FROM branches WHERE name = 'Tienda Apumanque' LIMIT 1)
WHERE local ILIKE '%Apumanque%'
AND (sucursal_id IS NULL OR sucursal_id != (SELECT id FROM branches WHERE name = 'Tienda Apumanque' LIMIT 1));

-- Actualizar órdenes basándose en la sucursal del técnico
UPDATE orders o
SET sucursal_id = u.sucursal_id
FROM users u
WHERE o.technician_id = u.id
AND u.sucursal_id IS NOT NULL
AND (o.sucursal_id IS NULL OR o.sucursal_id != u.sucursal_id);

-- Verificar resultados
SELECT 
  u.id,
  u.name,
  u.local,
  b.name as sucursal_name,
  CASE 
    WHEN u.local ILIKE '%Mall Trebol%' OR u.local ILIKE '%Trebol%' THEN 'Tienda Mall Trebol'
    WHEN u.local ILIKE '%Providencia%' THEN 'Tienda Providencia'
    WHEN u.local ILIKE '%Puente Alto%' THEN 'Tienda Puente Alto'
    WHEN u.local ILIKE '%Maipu%' THEN 'Tienda Maipu'
    WHEN u.local ILIKE '%Concepcion%' OR u.local ILIKE '%Concepción%' THEN 'Tienda Concepcion'
    WHEN u.local ILIKE '%Santiago%' AND u.local NOT ILIKE '%Puente Alto%' AND u.local NOT ILIKE '%Providencia%' THEN 'Tienda Santiago'
    WHEN u.local ILIKE '%Apumanque%' THEN 'Tienda Apumanque'
    ELSE 'Sin coincidencia'
  END as local_esperado
FROM users u
LEFT JOIN branches b ON u.sucursal_id = b.id
WHERE u.role IN ('technician', 'encargado')
ORDER BY u.local, u.name;







