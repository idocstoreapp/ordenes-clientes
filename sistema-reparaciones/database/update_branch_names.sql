-- ============================================
-- ACTUALIZACIÓN: Nombres correctos de sucursales
-- ============================================
-- Este script actualiza los nombres de las sucursales a los nombres correctos
-- y asegura que existan las 7 sucursales con los nombres correctos
-- ============================================

-- Paso 1: Actualizar sucursales existentes con nombres antiguos a nombres correctos
-- (Solo actualizar si el nombre correcto NO existe ya)

-- Sucursal 1 → Tienda Mall Trebol
UPDATE branches 
SET name = 'Tienda Mall Trebol', 
    address = COALESCE(address, 'Mall Trebol'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 1' OR name LIKE '%Sucursal 1%' OR name LIKE '%Mall Trebol%' OR name LIKE '%Trebol%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Mall Trebol');

-- Sucursal 2 → Tienda Providencia
UPDATE branches 
SET name = 'Tienda Providencia', 
    address = COALESCE(address, 'Providencia'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 2' OR name LIKE '%Sucursal 2%' OR name LIKE '%Providencia%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Providencia');

-- Sucursal 3 → Tienda Puente Alto
UPDATE branches 
SET name = 'Tienda Puente Alto', 
    address = COALESCE(address, 'Puente Alto'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 3' OR name LIKE '%Sucursal 3%' OR name LIKE '%Puente Alto%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Puente Alto');

-- Sucursal 4 → Tienda Maipu
UPDATE branches 
SET name = 'Tienda Maipu', 
    address = COALESCE(address, 'Maipu'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 4' OR name LIKE '%Sucursal 4%' OR name LIKE '%Maipu%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Maipu');

-- Sucursal 5 → Tienda Concepcion
UPDATE branches 
SET name = 'Tienda Concepcion', 
    address = COALESCE(address, 'Concepcion'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 5' OR name LIKE '%Sucursal 5%' OR name LIKE '%Concepcion%' OR name LIKE '%Concepción%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Concepcion');

-- Sucursal 6 → Tienda Santiago
UPDATE branches 
SET name = 'Tienda Santiago', 
    address = COALESCE(address, 'Santiago'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 6' OR name LIKE '%Sucursal 6%' OR name LIKE '%Santiago%')
AND name NOT LIKE '%Puente Alto%'
AND name NOT LIKE '%Providencia%'
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Santiago');

-- Sucursal 7 → Tienda Apumanque
UPDATE branches 
SET name = 'Tienda Apumanque', 
    address = COALESCE(address, 'Apumanque'),
    updated_at = NOW() 
WHERE (name = 'Sucursal 7' OR name LIKE '%Sucursal 7%' OR name LIKE '%Apumanque%')
AND NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Apumanque');

-- Paso 2: Insertar solo las sucursales que no existen
INSERT INTO branches (name, address) 
SELECT 'Tienda Mall Trebol', 'Mall Trebol'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Mall Trebol');

INSERT INTO branches (name, address) 
SELECT 'Tienda Providencia', 'Providencia'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Providencia');

INSERT INTO branches (name, address) 
SELECT 'Tienda Puente Alto', 'Puente Alto'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Puente Alto');

INSERT INTO branches (name, address) 
SELECT 'Tienda Maipu', 'Maipu'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Maipu');

INSERT INTO branches (name, address) 
SELECT 'Tienda Concepcion', 'Concepcion'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Concepcion');

INSERT INTO branches (name, address) 
SELECT 'Tienda Santiago', 'Santiago'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Santiago');

INSERT INTO branches (name, address) 
SELECT 'Tienda Apumanque', 'Apumanque'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'Tienda Apumanque');

-- Paso 3: Verificar que todas las sucursales tengan los nombres correctos
SELECT id, name, address, created_at FROM branches ORDER BY name;

