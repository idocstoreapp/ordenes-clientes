-- ============================================
-- MIGRACIÓN: Agregar campos de semana de pago
-- ============================================
-- PROBLEMA DETECTADO:
-- El sistema estaba usando created_at para calcular semanas, pero las comisiones
-- deben asignarse según la fecha de pago (paid_at), no la fecha de creación.
-- 
-- SOLUCIÓN:
-- Agregar campos paid_at, payout_week, payout_year que se asignan cuando
-- la orden pasa a estado "paid" y nunca se recalculan dinámicamente.
-- ============================================

-- 1. Agregar nuevos campos a la tabla orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_week INTEGER,
  ADD COLUMN IF NOT EXISTS payout_year INTEGER;

-- 2. Crear índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_payout_week_year ON orders(payout_week, payout_year);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON orders(status, paid_at);

-- 3. Función para calcular semana de pago basándose en paid_at
-- La semana va de sábado (6) a viernes
-- IMPORTANTE: Debe coincidir con la lógica de calculatePayoutWeek() en src/lib/payoutWeek.ts
CREATE OR REPLACE FUNCTION calculate_payout_week(payment_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  payment_day_of_week INTEGER;
  days_to_saturday INTEGER;
  week_start_saturday DATE;
  year_start DATE;
  week_number INTEGER;
BEGIN
  -- Si no hay fecha de pago, retornar NULL
  IF payment_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener el día de la semana (0 = domingo, 6 = sábado)
  payment_day_of_week := EXTRACT(DOW FROM payment_date::DATE);
  
  -- Calcular días hacia atrás hasta el sábado anterior (inicio de semana)
  -- Si es sábado (6), no retroceder (0 días)
  -- Si es domingo (0), retroceder 1 día
  -- Si es lunes (1), retroceder 2 días
  -- etc.
  days_to_saturday := CASE 
    WHEN payment_day_of_week = 6 THEN 0  -- Es sábado
    WHEN payment_day_of_week = 0 THEN 1  -- Es domingo
    ELSE payment_day_of_week + 1  -- Lunes a viernes
  END;
  
  -- Calcular el sábado de inicio de la semana
  week_start_saturday := (payment_date::DATE - (days_to_saturday || ' days')::INTERVAL)::DATE;
  
  -- Calcular número de semana usando ISO week (que cuenta desde lunes)
  -- Ajustamos agregando 1 día para que el sábado se considere parte de la semana que empieza el lunes siguiente
  week_number := EXTRACT(WEEK FROM week_start_saturday + INTERVAL '1 day');
  
  RETURN week_number;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Función para calcular año de pago
CREATE OR REPLACE FUNCTION calculate_payout_year(payment_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
BEGIN
  IF payment_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(YEAR FROM payment_date);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Actualizar trigger para calcular payout_week y payout_year cuando se marca como pagada
CREATE OR REPLACE FUNCTION update_order_metadata()
RETURNS TRIGGER AS $$
DECLARE
  payment_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Mantener cálculos basados en created_at para week_start, month, year (retrocompatibilidad)
  NEW.week_start := DATE_TRUNC('week', NEW.created_at)::DATE;
  NEW.month := EXTRACT(MONTH FROM NEW.created_at)::INTEGER;
  NEW.year := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
  
  -- ⚠️ CAMBIO CRÍTICO: Calcular payout_week y payout_year basándose en paid_at cuando status = 'paid'
  IF NEW.status = 'paid' THEN
    -- Si no hay paid_at y estamos marcando como paid, usar NOW()
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := NOW();
    END IF;
    
    -- Calcular semana y año de pago (nunca se recalcularán después)
    NEW.payout_week := calculate_payout_week(NEW.paid_at);
    NEW.payout_year := calculate_payout_year(NEW.paid_at);
  ELSE
    -- Si no está pagada, limpiar paid_at y campos de payout
    NEW.paid_at := NULL;
    NEW.payout_week := NULL;
    NEW.payout_year := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Migración retrocompatible: calcular payout_week para órdenes existentes que ya están pagadas
-- Esto calcula la semana basándose en cuando se marcaron como paid (o created_at si no hay fecha clara)
UPDATE orders 
SET 
  paid_at = CASE 
    WHEN status = 'paid' AND paid_at IS NULL THEN created_at
    ELSE paid_at
  END,
  payout_week = CASE 
    WHEN status = 'paid' THEN calculate_payout_week(COALESCE(paid_at, created_at))
    ELSE NULL
  END,
  payout_year = CASE 
    WHEN status = 'paid' THEN calculate_payout_year(COALESCE(paid_at, created_at))
    ELSE NULL
  END
WHERE status = 'paid' AND (payout_week IS NULL OR payout_year IS NULL);

-- 7. Comentarios para documentar los campos
COMMENT ON COLUMN orders.paid_at IS 'Fecha y hora en que la orden fue marcada como pagada. Se usa para calcular payout_week y payout_year.';
COMMENT ON COLUMN orders.payout_week IS 'Número de semana (según año) en que la orden fue pagada. Se calcula una vez cuando status = paid y nunca se recalcula. Semana va de sábado a viernes.';
COMMENT ON COLUMN orders.payout_year IS 'Año en que la orden fue pagada. Se calcula una vez cuando status = paid y nunca se recalcula.';

