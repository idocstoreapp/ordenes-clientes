-- ============================================
-- Sistema de Gestión de Órdenes - Esquema de Base de Datos
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Este sistema usa la misma base de datos que sistema-reparaciones
-- pero con tablas adicionales para clientes, servicios, etc.

-- ============================================
-- 1. Tabla de Sucursales (Branches)
-- ============================================
-- NOTA: Si ya existe la tabla branches del sistema-reparaciones,
-- solo agregamos las columnas que faltan si no existen

-- Agregar columnas nuevas a branches si no existen (si la tabla ya existe)
DO $$ 
BEGIN
  -- Agregar logo_url si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='logo_url') THEN
    ALTER TABLE branches ADD COLUMN logo_url TEXT;
  END IF;
  
  -- Agregar razon_social si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='razon_social') THEN
    ALTER TABLE branches ADD COLUMN razon_social TEXT;
  END IF;
  
  -- Agregar email si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='branches' AND column_name='email') THEN
    ALTER TABLE branches ADD COLUMN email TEXT;
  END IF;
END $$;

-- Crear tabla branches solo si no existe (compatible con sistema-reparaciones)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  razon_social TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Tabla de Usuarios (extiende auth.users)
-- ============================================
-- Nota: Esta tabla debe existir si usas la misma BD que sistema-reparaciones
-- Si no existe, créala así:
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'encargado', 'recepcionista')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Tabla de Clientes (Customers)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+56',
  rut_document TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, phone)
);

-- ============================================
-- 4. Tabla de Servicios (Services)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar servicios comunes
INSERT INTO services (name, description) VALUES
  ('Cambio de pantalla', 'Reemplazo completo de pantalla'),
  ('Cambio de batería', 'Reemplazo de batería original'),
  ('Reparación de cámara', 'Reparación o reemplazo de módulo de cámara'),
  ('Reparación de conector de carga', 'Reparación o reemplazo de puerto de carga'),
  ('Reparación de botones', 'Reparación de botones físicos'),
  ('Reparación de altavoces', 'Reparación o reemplazo de altavoces'),
  ('Reparación de sensores', 'Reparación de sensores (Face ID, Touch ID, etc.)'),
  ('Reparación de placa madre', 'Reparación de placa lógica'),
  ('Limpieza general', 'Limpieza interna y externa del dispositivo'),
  ('Actualización de software', 'Actualización de sistema operativo')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. Tabla de Checklist Items por Tipo de Dispositivo
-- ============================================
CREATE TABLE IF NOT EXISTS device_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL CHECK (device_type IN ('iphone', 'ipad', 'macbook', 'apple_watch')),
  item_name TEXT NOT NULL,
  item_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_type, item_name)
);

-- Insertar checklist para iPhone
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('iphone', 'Cámara frontal', 1),
  ('iphone', 'Cámara trasera', 2),
  ('iphone', 'Señal', 3),
  ('iphone', 'Altavoces', 4),
  ('iphone', 'Face ID / Touch ID', 5),
  ('iphone', 'WiFi', 6),
  ('iphone', 'Bluetooth', 7),
  ('iphone', 'Sensores (Acelerómetro, Giroscopio)', 8),
  ('iphone', 'Botones (Volumen, Power, Home)', 9),
  ('iphone', 'Pantalla (Táctil, visual)', 10)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para iPad
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('ipad', 'Cámara frontal', 1),
  ('ipad', 'Cámara trasera', 2),
  ('ipad', 'WiFi', 3),
  ('ipad', 'Bluetooth', 4),
  ('ipad', 'Touch ID / Face ID', 5),
  ('ipad', 'Altavoces', 6),
  ('ipad', 'Puerto de carga (Lightning/USB-C)', 7),
  ('ipad', 'Pantalla (Táctil, visual)', 8)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para Apple Watch
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('apple_watch', 'Pantalla', 1),
  ('apple_watch', 'Corona Digital', 2),
  ('apple_watch', 'Botón lateral', 3),
  ('apple_watch', 'Sensores (Corazón, ECG)', 4),
  ('apple_watch', 'Cargador magnético', 5),
  ('apple_watch', 'Altavoz', 6),
  ('apple_watch', 'Micrófono', 7)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- Insertar checklist para MacBook
INSERT INTO device_checklist_items (device_type, item_name, item_order) VALUES
  ('macbook', 'Pantalla', 1),
  ('macbook', 'Teclado', 2),
  ('macbook', 'Trackpad', 3),
  ('macbook', 'Cámara', 4),
  ('macbook', 'Altavoces', 5),
  ('macbook', 'Puertos (USB-C, Thunderbolt, HDMI)', 6),
  ('macbook', 'Batería', 7),
  ('macbook', 'Ventiladores', 8)
ON CONFLICT (device_type, item_name) DO NOTHING;

-- ============================================
-- 6. Tabla de Órdenes de Trabajo (Work Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sucursal_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  -- Información del dispositivo
  device_type TEXT NOT NULL CHECK (device_type IN ('iphone', 'ipad', 'macbook', 'apple_watch')),
  device_model TEXT NOT NULL,
  device_serial_number TEXT,
  device_unlock_code TEXT, -- Código numérico de desbloqueo
  device_unlock_pattern JSONB, -- Patrón de desbloqueo como array de números [1,2,5,8,9]
  
  -- Problema y diagnóstico
  problem_description TEXT NOT NULL,
  checklist_data JSONB, -- Almacena el estado del checklist {item_name: "ok|damaged|replaced"}
  
  -- Servicios y costos
  total_repair_cost NUMERIC NOT NULL DEFAULT 0,
  replacement_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  
  -- Prioridad y fechas
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'urgente')),
  commitment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('en_proceso', 'por_entregar', 'entregada', 'rechazada', 'sin_solucion', 'garantia')),
  
  -- Pago
  payment_method TEXT CHECK (payment_method IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  receipt_number TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Garantía
  warranty_days INTEGER DEFAULT 30,
  warranty_expires_at DATE
);

-- ============================================
-- 7. Tabla de Relación Orden-Servicios
-- ============================================
CREATE TABLE IF NOT EXISTS order_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL, -- Se guarda el nombre por si se elimina el servicio
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. Tabla de Notas de Órdenes
-- ============================================
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'interno' CHECK (note_type IN ('interno', 'publico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. Índices para mejorar rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_sucursal ON work_orders(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_order_number ON work_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_order_services_order ON order_services(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);

-- ============================================
-- 10. Funciones y Triggers
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
DROP TRIGGER IF EXISTS calculate_warranty_expires_at_trigger ON work_orders;

-- Triggers para updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular warranty_expires_at
CREATE OR REPLACE FUNCTION calculate_warranty_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'entregada' AND NEW.warranty_expires_at IS NULL THEN
    NEW.warranty_expires_at = (NOW() + (NEW.warranty_days || ' days')::INTERVAL)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_warranty_expires_at_trigger
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  WHEN (NEW.status = 'entregada')
  EXECUTE FUNCTION calculate_warranty_expires_at();

-- ============================================
-- 11. Row Level Security (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar errores al re-ejecutar)
DROP POLICY IF EXISTS "branches_select_all" ON branches;
DROP POLICY IF EXISTS "branches_insert_admin" ON branches;
DROP POLICY IF EXISTS "branches_update_admin" ON branches;
DROP POLICY IF EXISTS "customers_select_all" ON customers;
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;
DROP POLICY IF EXISTS "services_select_all" ON services;
DROP POLICY IF EXISTS "services_insert_admin" ON services;
DROP POLICY IF EXISTS "device_checklist_items_select_all" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_insert_admin" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_update_admin" ON device_checklist_items;
DROP POLICY IF EXISTS "device_checklist_items_delete_admin" ON device_checklist_items;
DROP POLICY IF EXISTS "work_orders_select_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_authenticated" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_own_or_sucursal_or_admin" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_admin" ON work_orders;
DROP POLICY IF EXISTS "order_services_select_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_insert_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_services_update_authenticated" ON order_services;
DROP POLICY IF EXISTS "order_notes_select_authenticated" ON order_notes;
DROP POLICY IF EXISTS "order_notes_insert_authenticated" ON order_notes;

-- Políticas para branches (todos pueden leer)
CREATE POLICY "branches_select_all" ON branches FOR SELECT USING (true);
CREATE POLICY "branches_insert_admin" ON branches FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "branches_update_admin" ON branches FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para customers (todos pueden leer y crear)
CREATE POLICY "customers_select_all" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert_authenticated" ON customers FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update_authenticated" ON customers FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para services (todos pueden leer)
CREATE POLICY "services_select_all" ON services FOR SELECT USING (true);
CREATE POLICY "services_insert_admin" ON services FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para device_checklist_items (todos pueden leer, solo admins pueden modificar)
CREATE POLICY "device_checklist_items_select_all" ON device_checklist_items FOR SELECT USING (true);
CREATE POLICY "device_checklist_items_insert_admin" ON device_checklist_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "device_checklist_items_update_admin" ON device_checklist_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "device_checklist_items_delete_admin" ON device_checklist_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para work_orders
CREATE POLICY "work_orders_select_own_or_sucursal_or_admin" ON work_orders FOR SELECT
  USING (
    technician_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "work_orders_insert_authenticated" ON work_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "work_orders_update_own_or_sucursal_or_admin" ON work_orders FOR UPDATE
  USING (
    technician_id = auth.uid()
    OR sucursal_id IN (SELECT sucursal_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "work_orders_delete_admin" ON work_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para order_services
CREATE POLICY "order_services_select_authenticated" ON order_services FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "order_services_insert_authenticated" ON order_services FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "order_services_update_authenticated" ON order_services FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Políticas para order_notes
CREATE POLICY "order_notes_select_authenticated" ON order_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "order_notes_insert_authenticated" ON order_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este esquema está diseñado para trabajar junto con el sistema-reparaciones
--    Si ya existe la tabla 'users', no la recreará.
-- 2. Las sucursales se insertan automáticamente con las 7 ubicaciones.
-- 3. Los servicios comunes se insertan automáticamente.
-- 4. Los checklists por tipo de dispositivo se crean automáticamente.
-- 5. Asegúrate de tener usuarios creados en auth.users antes de usar el sistema.

