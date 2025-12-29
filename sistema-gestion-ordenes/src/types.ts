// Tipos TypeScript para el sistema

export interface UserPermissions {
  use_admin_panel?: boolean;
  use_statistics_panel?: boolean;
  modify_orders?: boolean;
  edit_product_stock?: boolean;
  delete_orders?: boolean;
  use_branch_panel?: boolean;
  view_all_business_orders?: boolean;
  edit_view_cost_price?: boolean;
  create_orders?: boolean;
  close_day?: boolean;
}

export interface User {
  id: string;
  role: 'admin' | 'technician' | 'encargado' | 'recepcionista';
  name: string;
  email: string;
  avatar_url?: string | null;
  sucursal_id?: string | null;
  permissions?: UserPermissions | null;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  logo_url?: string | null;
  razon_social?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  // Campos de autenticación independiente de usuarios
  login_email?: string | null;
  password_hash?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone_country_code: string;
  rut_document?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  default_price: number;
  created_at: string;
}

export interface DeviceChecklistItem {
  id: string;
  device_type: string; // Ahora permite cualquier tipo de dispositivo
  item_name: string;
  item_order: number;
}

export interface WorkOrder {
  id: string;
  order_number: string;
  customer_id: string;
  technician_id?: string | null;
  sucursal_id?: string | null;
  device_type: string; // Ahora permite cualquier tipo de dispositivo
  device_model: string;
  device_serial_number?: string | null;
  device_unlock_code?: string | null; // Código numérico
  device_unlock_pattern?: number[] | null; // Patrón como array [1,2,5,8,9]
  problem_description: string;
  checklist_data?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null;
  total_repair_cost: number;
  replacement_cost: number;
  labor_cost: number;
  priority: 'baja' | 'media' | 'urgente';
  commitment_date?: string | null;
  created_at: string;
  updated_at: string;
  status: 'en_proceso' | 'por_entregar' | 'entregada' | 'rechazada' | 'sin_solucion' | 'garantia';
  payment_method?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | null;
  receipt_number?: string | null;
  receipt_url?: string | null;
  paid_at?: string | null;
  warranty_days: number;
  warranty_expires_at?: string | null;
  // Relaciones
  customer?: Customer;
  technician?: User;
  sucursal?: Branch;
}

export interface OrderService {
  id: string;
  order_id: string;
  service_id?: string | null;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  service?: Service;
}

export interface OrderNote {
  id: string;
  order_id: string;
  user_id?: string | null;
  note: string;
  note_type: 'interno' | 'publico';
  created_at: string;
  user?: User;
}

export type DeviceType = string; // Ahora permite cualquier tipo de dispositivo
export type OrderStatus = 'en_proceso' | 'por_entregar' | 'entregada' | 'rechazada' | 'sin_solucion' | 'garantia';
export type Priority = 'baja' | 'media' | 'urgente';
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

