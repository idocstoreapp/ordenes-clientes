import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Customer, WorkOrder, User } from "@/types";
import { formatDate } from "@/lib/date";
import { getCountryByDialCode } from "@/lib/countries";
import { formatCLP } from "@/lib/currency";
import { hasPermission } from "@/lib/permissions";
import CustomerEditModal from "./CustomerEditModal";

interface CustomersListProps {
  user?: User;
}

export default function CustomersList({ user }: CustomersListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [customerOrders, setCustomerOrders] = useState<Record<string, WorkOrder[]>>({});
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      // Verificar permiso para ver clientes (solo admin o con permiso explícito)
      if (!hasPermission(user, "view_all_business_orders")) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerOrders(customerId: string) {
    if (customerOrders[customerId]) return; // Ya cargado

    try {
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          sucursal:branches(*)
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerOrders({ ...customerOrders, [customerId]: data || [] });
    } catch (error) {
      console.error("Error cargando órdenes del cliente:", error);
    }
  }

  function toggleCustomerExpanded(customerId: string) {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
      loadCustomerOrders(customerId);
    }
    setExpandedCustomers(newExpanded);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_proceso":
        return "bg-blue-100 text-blue-800";
      case "por_entregar":
        return "bg-yellow-100 text-yellow-800";
      case "entregada":
        return "bg-green-100 text-green-800";
      case "rechazada":
        return "bg-red-100 text-red-800";
      case "garantia":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-900">Clientes</h2>
        <input
          type="text"
          placeholder="Buscar cliente..."
          className="border border-slate-300 rounded-md px-3 py-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-slate-600 text-center py-8">
          {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">RUT/Documento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha Registro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Historial</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredCustomers.map((customer) => {
                const country = getCountryByDialCode(customer.phone_country_code || "+56");
                const isExpanded = expandedCustomers.has(customer.id);
                const orders = customerOrders[customer.id] || [];
                
                return (
                  <>
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleCustomerExpanded(customer.id)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {country?.flag} {customer.phone_country_code || "+56"} {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer.rut_document || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer.address || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(customer.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                            {orders.length} {orders.length === 1 ? "orden" : "órdenes"}
                          </span>
                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors"
                            title="Editar cliente"
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-slate-50">
                          <div className="ml-4">
                            <h4 className="font-semibold text-slate-900 mb-3">Historial de Órdenes</h4>
                            {orders.length === 0 ? (
                              <p className="text-slate-600">Este cliente no tiene órdenes registradas</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-white">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">N° Orden</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Dispositivo</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Estado</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Total</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Fecha</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase">Sucursal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-slate-200">
                                    {orders.map((order) => (
                                      <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm font-medium text-slate-900">{order.order_number}</td>
                                        <td className="px-3 py-2 text-sm text-slate-700">{order.device_model}</td>
                                        <td className="px-3 py-2">
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status.replace("_", " ")}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-sm font-medium text-slate-900">
                                          {formatCLP(order.total_repair_cost, { withLabel: false })}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600">{formatDate(order.created_at)}</td>
                                        <td className="px-3 py-2 text-sm text-slate-700">
                                          {(order.sucursal as any)?.name || "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={(updatedCustomer) => {
            setCustomers(customers.map(c => 
              c.id === updatedCustomer.id ? updatedCustomer : c
            ));
            setEditingCustomer(null);
            loadCustomers(); // Recargar para asegurar consistencia
          }}
        />
      )}
    </div>
  );
}

