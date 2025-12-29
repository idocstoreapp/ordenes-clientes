export type Role = "admin" | "technician" | "encargado";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  last_name?: string | null;
  document_number?: string | null;
  email: string;
  avatar_url?: string | null;
  local?: string | null;
  sucursal_id?: string | null;
}

export interface Order {
  id: string;
  created_at: string;
  original_created_at?: string | null;
  order_number: string;
  technician_id: string;
  supplier_id?: string | null;
  device: string;
  service_description: string;
  replacement_cost: number;
  repair_cost: number;
  payment_method: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "";
  receipt_number?: string | null;
  receipt_url?: string | null; // URL del recibo ingresada manualmente
  status: "pending" | "paid" | "returned" | "cancelled";
  commission_amount: number;
  // Campos de semana de pago - se asignan cuando status = 'paid' y nunca se recalculan
  paid_at?: string | null; // Fecha en que la orden fue pagada
  payout_week?: number | null; // Número de semana (1-53) en que fue pagada
  payout_year?: number | null; // Año en que fue pagada
  // Campos de fecha de devolución/cancelación
  returned_at?: string | null; // Fecha y hora exacta en que la orden fue marcada como devuelta
  cancelled_at?: string | null; // Fecha y hora exacta en que la orden fue marcada como cancelada
  // Campos legacy (mantenidos para retrocompatibilidad, basados en created_at)
  week_start?: string | null;
  month?: number | null;
  year?: number | null;
  // Campo de sucursal
  sucursal_id?: string | null;
}

export interface OrderNote {
  id: string;
  order_id: string;
  technician_id?: string | null;
  note: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_info?: string | null;
  created_at: string;
}

export interface SalaryAdjustment {
  id: string;
  created_at: string;
  technician_id: string;
  type: "advance" | "discount";
  amount: number;
  note?: string | null;
  available_from?: string | null;
}

export interface SalaryAdjustmentApplication {
  id: string;
  adjustment_id: string;
  technician_id: string;
  applied_amount: number;
  week_start: string;
  created_at: string;
  created_by?: string | null;
}

export interface SalarySettlement {
  id: string;
  technician_id: string;
  week_start: string;
  amount: number;
  note?: string | null;
  context?: "technician" | "admin";
  payment_method?: "efectivo" | "transferencia" | "efectivo/transferencia" | null;
  details?: Record<string, any> | null;
  created_by?: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmallExpense {
  id: string;
  sucursal_id: string;
  user_id: string;
  tipo: "aseo" | "mercaderia" | "compras_pequenas";
  monto: number;
  fecha: string;
  descripcion?: string | null;
  created_at: string;
  branch?: Branch;
  user?: Profile;
}

export interface GeneralExpense {
  id: string;
  sucursal_id: string;
  user_id: string;
  tipo: "arriendo" | "internet" | "luz" | "agua" | "facturas" | "servicios";
  monto: number;
  fecha: string;
  descripcion?: string | null;
  created_at: string;
  branch?: Branch;
  user?: Profile;
}

export interface BranchExpensesSummary {
  branch_id: string;
  branch_name: string;
  total_small_expenses: number;
  total_general_expenses: number;
  total_repuestos: number;
  total_pagos_tecnicos: number;
  total_pagos_encargados: number;
  total_general: number;
}

