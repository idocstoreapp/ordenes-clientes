-- ============================================
-- Sistema de Reparaciones - Esquema de Base de Datos
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase

-- ============================================
-- 1. Tabla de Usuarios (extiende auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Tabla de Proveedores
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Tabla de Órdenes de Reparación
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_number TEXT NOT NULL,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  device TEXT NOT NULL,
  service_description TEXT NOT NULL,
  replacement_cost NUMERIC NOT NULL DEFAULT 0, -- F (Valor Repuesto)
  repair_cost NUMERIC NOT NULL DEFAULT 0,      -- G (Costo Reparación para EFECTIVO)
  payment_method TEXT NOT NULL DEFAULT '' CHECK (payment_method IN ('', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
  receipt_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'returned', 'cancelled')),
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  -- Campos adicionales para reportes
  week_start DATE,
  month INTEGER,
  year INTEGER
);

-- ============================================
-- 4. Tabla de Ajustes de Sueldo
-- ============================================
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('advance', 'discount')),
  amount NUMERIC NOT NULL,
  note TEXT
);

-- ============================================
-- 5. Índices para mejorar rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_technician ON orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_week_start ON orders(week_start);
CREATE INDEX IF NOT EXISTS idx_orders_month_year ON orders(month, year);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_technician ON salary_adjustments(technician_id);

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "users_select_own_or_admin"
  ON users FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Políticas para orders
CREATE POLICY "orders_select_own_or_admin"
  ON orders FOR SELECT
  USING (
    technician_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (technician_id = auth.uid());

CREATE POLICY "orders_update_own_or_admin"
  ON orders FOR UPDATE
  USING (
    technician_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Políticas para suppliers (todos pueden leer)
CREATE POLICY "suppliers_select_all"
  ON suppliers FOR SELECT
  USING (true);

-- Políticas para salary_adjustments
CREATE POLICY "salary_adjustments_select_own_or_admin"
  ON salary_adjustments FOR SELECT
  USING (
    technician_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "salary_adjustments_insert_own"
  ON salary_adjustments FOR INSERT
  WITH CHECK (technician_id = auth.uid());

-- ============================================
-- 7. Funciones auxiliares
-- ============================================

-- Función para actualizar week_start, month, year automáticamente
CREATE OR REPLACE FUNCTION update_order_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.week_start := DATE_TRUNC('week', NEW.created_at)::DATE;
  NEW.month := EXTRACT(MONTH FROM NEW.created_at)::INTEGER;
  NEW.year := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar metadata al insertar/actualizar
CREATE TRIGGER trigger_update_order_metadata
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_metadata();

-- ============================================
-- 8. Datos de ejemplo (opcional)
-- ============================================

-- Insertar algunos proveedores de ejemplo
INSERT INTO suppliers (name, contact_info) VALUES
  ('FIXELL', 'contacto@fixell.cl'),
  ('CRISTIAN AI', 'cristian@example.com'),
  ('TIENDA', 'tienda@example.com'),
  ('TechParts', 'info@techparts.cl'),
  ('Repuestos Móvil', 'ventas@repuestosmovil.cl'),
  ('Global Componentes', 'contacto@globalcomp.cl')
ON CONFLICT DO NOTHING;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Después de ejecutar este script, necesitas:
--    - Crear usuarios en Authentication de Supabase
--    - Insertar registros en la tabla 'users' con el mismo ID del usuario de auth
--    - Ejemplo:
--      INSERT INTO users (id, role, name, email) 
--      VALUES (
--        'uuid-del-usuario-en-auth',
--        'admin',
--        'Carlos Rivas',
--        'admin@example.com'
--      );
--
-- 2. Para crear un técnico:
--    INSERT INTO users (id, role, name, email) 
--    VALUES (
--      'uuid-del-usuario-en-auth',
--      'technician',
--      'Juan Pérez',
--      'juan@example.com'
--    );
--
-- 3. La comisión se calcula en el frontend según la fórmula:
--    - EFECTIVO: (costoReparacion - costoRepuesto) * 0.4
--    - TARJETA/TRANSFERENCIA: (totalCobrado - costoRepuesto) * 0.4
--
-- 4. El status 'paid' solo se asigna si hay receipt_number
--    Si no hay recibo, automáticamente es 'pending'

