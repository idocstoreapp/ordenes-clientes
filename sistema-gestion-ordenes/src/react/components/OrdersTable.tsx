import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkOrder, Service, Customer, User } from "@/types";
import { formatCLP } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { hasPermission } from "@/lib/permissions";
import OrderDetail from "./OrderDetail";
import PDFPreview from "./PDFPreview";
import CustomerEditModal from "./CustomerEditModal";
import { generatePDFBlob } from "@/lib/generate-pdf-blob";

interface OrdersTableProps {
  technicianId?: string;
  isAdmin?: boolean;
  user?: User;
  onNewOrder?: () => void;
}

export default function OrdersTable({ technicianId, isAdmin = false, user, onNewOrder }: OrdersTableProps) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pdfOrderData, setPdfOrderData] = useState<{
    order: WorkOrder;
    services: Service[];
    serviceValue: number;
    replacementCost: number;
    warrantyDays: number;
    checklistData?: Record<string, 'ok' | 'damaged' | 'replaced'> | null;
    notes?: string[];
  } | null>(null);

  useEffect(() => {
    loadOrders();
  }, [technicianId, statusFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from("work_orders")
        .select(`
          *,
          customer:customers(*),
          technician:users(*),
          sucursal:branches(*)
        `)
        .order("created_at", { ascending: false });

      // Filtrar órdenes según permisos y rol
      // Solo admin puede ver todas las órdenes (isAdmin=true solo para admin)
      // Los demás usuarios solo ven órdenes de su sucursal o las que crearon
      if (!isAdmin) {
        if (user?.sucursal_id) {
          // Si tiene sucursal_id, filtrar por sucursal (usuarios de sucursal)
          query = query.eq("sucursal_id", user.sucursal_id);
        } else if (technicianId) {
          // Si tiene technician_id pero no sucursal_id, filtrar por técnico
          query = query.eq("technician_id", technicianId);
        }
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error cargando órdenes:", error);
    } finally {
      setLoading(false);
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "bg-red-500";
      case "media":
        return "bg-yellow-500";
      case "baja":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "Urgente";
      case "media":
        return "Media";
      case "baja":
        return "Baja";
      default:
        return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "en_proceso":
        return "En Proceso";
      case "por_entregar":
        return "Por Entregar";
      case "entregada":
        return "Entregada";
      case "rechazada":
        return "Rechazada";
      case "sin_solucion":
        return "Sin Solución";
      case "garantia":
        return "Garantía";
      default:
        return status.replace("_", " ");
    }
  };

  async function handleStatusChange(orderId: string, newStatus: string) {
    // Verificar permiso para modificar órdenes
    if (!hasPermission(user, "modify_orders") && !isAdmin) {
      alert("No tienes permisos para modificar órdenes");
      return;
    }

    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);

      if (error) throw error;

      // Obtener la orden actualizada con relaciones
      const order = orders.find(o => o.id === orderId);
      
      // Si el estado cambió a "por_entregar" y hay cliente con email, enviar notificación
      if (newStatus === 'por_entregar') {
        console.log("[ORDERS TABLE] Estado cambiado a 'por_entregar' para orden:", order?.order_number);
        console.log("[ORDERS TABLE] Datos del cliente:", {
          hasCustomer: !!order?.customer,
          hasEmail: !!order?.customer?.email,
          email: order?.customer?.email ? `${order.customer.email.substring(0, 3)}***` : 'no disponible'
        });
        
        if (!order?.customer) {
          console.warn("[ORDERS TABLE] No se puede enviar email: la orden no tiene cliente asociado");
        } else if (!order.customer.email) {
          console.warn("[ORDERS TABLE] No se puede enviar email: el cliente no tiene email configurado");
        } else {
          console.log("[ORDERS TABLE] Enviando email de notificación para orden:", order.order_number);
          console.log("[ORDERS TABLE] URL completa:", window.location.origin + '/api/send-order-email');
          console.log("[ORDERS TABLE] Datos a enviar:", {
            to: order.customer.email,
            orderNumber: order.order_number,
            emailType: 'ready_for_pickup'
          });
          try {
          const emailResponse = await fetch('/api/send-order-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: order.customer.email,
              customerName: order.customer.name,
              orderNumber: order.order_number,
              branchName: order.sucursal?.name,
              branchEmail: order.sucursal?.email,
              emailType: 'ready_for_pickup',
            }),
          });

          if (!emailResponse.ok) {
            let errorData: any = {};
            try {
              const text = await emailResponse.text();
              console.error("[ORDERS TABLE] Respuesta de error (texto):", text);
              if (text) {
                try {
                  errorData = JSON.parse(text);
                } catch (parseError) {
                  errorData = { error: text || 'Error desconocido', status: emailResponse.status };
                }
              } else {
                errorData = { error: `Error ${emailResponse.status}: ${emailResponse.statusText}`, status: emailResponse.status };
              }
            } catch (textError) {
              console.error("[ORDERS TABLE] Error leyendo respuesta:", textError);
              errorData = { error: `Error ${emailResponse.status}: ${emailResponse.statusText}`, status: emailResponse.status };
            }
            console.error("[ORDERS TABLE] Error enviando email de notificación:", errorData);
            alert(`Orden actualizada, pero hubo un error al enviar el email: ${errorData.error || 'Error desconocido'}\n\nDetalles: ${errorData.details || 'Sin detalles adicionales'}\n\nEmail de origen usado: ${errorData.from || 'No especificado'}`);
          } else {
            let successData: any = {};
            try {
              const text = await emailResponse.text();
              if (text) {
                try {
                  successData = JSON.parse(text);
                } catch (parseError) {
                  successData = { message: text || 'Email enviado' };
                }
              }
            } catch (textError) {
              console.error("[ORDERS TABLE] Error leyendo respuesta exitosa:", textError);
              successData = { message: 'Email enviado (sin respuesta del servidor)' };
            }
            console.log("[ORDERS TABLE] ========================================");
            console.log("[ORDERS TABLE] ✅ EMAIL ENVIADO EXITOSAMENTE");
            console.log("[ORDERS TABLE] Email ID:", successData.emailId || 'N/A');
            console.log("[ORDERS TABLE] Mensaje:", successData.message || 'Email enviado');
            console.log("[ORDERS TABLE] Timestamp:", successData.timestamp || new Date().toISOString());
            console.log("[ORDERS TABLE] ========================================");
            alert(`✅ Orden actualizada y email de notificación enviado a ${order.customer.email}`);
          }
        } catch (emailError: any) {
          console.error("[ORDERS TABLE] Excepción al enviar email de notificación:", emailError);
          alert(`⚠️ Orden actualizada, pero hubo un error al enviar el email: ${emailError.message || 'Error de red'}\n\nRevisa la consola para más detalles.`);
          // No fallar el cambio de estado si el email falla
        }
        }
      }

      // Actualizar estado local
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));
      
      setEditingStatus(null);
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert("Error al actualizar el estado de la orden");
    }
  }

  async function handleViewPDF(order: WorkOrder) {
    try {
      // Cargar servicios de la orden
      const { data: orderServices, error: servicesError } = await supabase
        .from("order_services")
        .select("*")
        .eq("order_id", order.id);

      if (servicesError) throw servicesError;

      // Cargar notas de la orden
      const { data: orderNotes, error: notesError } = await supabase
        .from("order_notes")
        .select("note")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Convertir order_services a servicios
      const services: Service[] = (orderServices || []).map((os: any) => ({
        id: os.service_id || os.id,
        name: os.service_name,
        description: null,
        default_price: os.unit_price || 0,
        created_at: os.created_at || new Date().toISOString(),
      }));

      // Calcular serviceValue: suma de todos los total_price de los servicios
      // Si no hay servicios guardados, usar labor_cost
      let serviceValue = order.labor_cost || 0;
      if (orderServices && orderServices.length > 0) {
        serviceValue = orderServices.reduce((sum: number, os: any) => sum + (os.total_price || 0), 0);
      }

      const replacementCost = order.replacement_cost || 0;
      const warrantyDays = order.warranty_days || 30;
      const notes = (orderNotes || []).map((n: any) => n.note);

      setPdfOrderData({
        order,
        services,
        orderServices: orderServices || undefined,
        serviceValue,
        replacementCost,
        warrantyDays,
        checklistData: order.checklist_data as Record<string, 'ok' | 'damaged' | 'replaced'> | null,
        notes: notes.length > 0 ? notes : undefined,
      });
    } catch (error) {
      console.error("Error cargando datos para PDF:", error);
      alert("Error al cargar los datos del PDF");
    }
  }

  async function handleSendWhatsApp(order: WorkOrder) {
    if (!order.customer) {
      alert("No hay información del cliente");
      return;
    }

    try {
      // Cargar datos necesarios para el PDF
      const { data: orderServices, error: servicesError } = await supabase
        .from("order_services")
        .select("*")
        .eq("order_id", order.id);

      if (servicesError) throw servicesError;

      // Convertir order_services a servicios
      const services: Service[] = (orderServices || []).map((os: any) => ({
        id: os.service_id || os.id,
        name: os.service_name,
        description: null,
        default_price: os.unit_price || 0,
        created_at: os.created_at || new Date().toISOString(),
      }));

      let serviceValue = order.labor_cost || 0;
      if (orderServices && orderServices.length > 0) {
        serviceValue = orderServices.reduce((sum: number, os: any) => sum + (os.total_price || 0), 0);
      }

      const replacementCost = order.replacement_cost || 0;
      const warrantyDays = order.warranty_days || 30;

      // Generar PDF
      const pdfBlob = await generatePDFBlob(
        order,
        services,
        serviceValue,
        replacementCost,
        warrantyDays,
        order.checklist_data as Record<string, 'ok' | 'damaged' | 'replaced'> | null,
        undefined
      );

      // Descargar PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `orden-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      // Preparar número de teléfono
      const phone = order.customer.phone_country_code
        ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
        : "56" + order.customer.phone.replace(/\D/g, "");

      // Mensaje para WhatsApp
      const message = encodeURIComponent(
        `Hola ${order.customer.name},\n\nTe envío el PDF de tu orden ${order.order_number}.\n\nPor favor adjunta el archivo PDF que se descargó automáticamente.\n\nSaludos,\niDocStore`
      );

      // Abrir WhatsApp Web
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

      // Nota al usuario
      setTimeout(() => {
        alert("El PDF se ha descargado. Por favor arrástralo a WhatsApp Web para enviarlo.");
      }, 500);
    } catch (error) {
      console.error("Error enviando por WhatsApp:", error);
      alert("Error al generar el PDF para WhatsApp");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-900">Órdenes de Trabajo</h2>
        <div className="flex gap-2">
          {onNewOrder && (
            <button
              onClick={onNewOrder}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors font-medium"
            >
              ➕ Nueva Orden
            </button>
          )}
          <select
            className="border border-slate-300 rounded-md px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="en_proceso">En Proceso</option>
            <option value="por_entregar">Por Entregar</option>
            <option value="entregada">Entregada</option>
            <option value="rechazada">Rechazada</option>
            <option value="sin_solucion">Sin Solución</option>
            <option value="garantia">Garantía</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-slate-600 text-center py-8">No hay órdenes registradas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">N° Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Dispositivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Prioridad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-slate-50"
                >
                  <td 
                    className="px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const customer = order.customer as any as Customer;
                        if (customer) {
                          setEditingCustomer(customer);
                        }
                      }}
                      className="text-brand-light hover:text-brand-dark hover:underline cursor-pointer font-medium"
                      title="Click para editar cliente"
                    >
                      {(order.customer as any)?.name || "N/A"}
                    </button>
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-slate-700 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {order.device_model}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${getPriorityColor(order.priority)}`}></span>
                      <span className="text-slate-700">{getPriorityText(order.priority)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingStatus === order.id ? (
                      <select
                        className={`text-xs font-medium rounded-full border ${getStatusColor(order.status)} px-2 py-1`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        onBlur={() => setEditingStatus(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="en_proceso">En Proceso</option>
                        <option value="por_entregar">Por Entregar</option>
                        <option value="entregada">Entregada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="sin_solucion">Sin Solución</option>
                        <option value="garantia">Garantía</option>
                      </select>
                    ) : (
                      <span 
                        className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(order.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStatus(order.id);
                        }}
                        title="Clic para cambiar estado"
                      >
                        {getStatusText(order.status)}
                      </span>
                    )}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {formatCLP(order.total_repair_cost, { withLabel: false })}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-slate-600 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPDF(order);
                        }}
                        className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors"
                        title="Ver PDF"
                      >
                        📄 PDF
                      </button>
                      {order.customer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(order);
                          }}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                          title="Enviar por WhatsApp"
                        >
                          📱 WhatsApp
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetail 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}

      {pdfOrderData && (
        <PDFPreview
          order={pdfOrderData.order}
          services={pdfOrderData.services}
          serviceValue={pdfOrderData.serviceValue}
          replacementCost={pdfOrderData.replacementCost}
          warrantyDays={pdfOrderData.warrantyDays}
          checklistData={pdfOrderData.checklistData}
          notes={pdfOrderData.notes}
          onClose={() => setPdfOrderData(null)}
          onDownload={() => setPdfOrderData(null)}
        />
      )}

      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={(updatedCustomer) => {
            // Actualizar el cliente en todas las órdenes que lo referencian
            setOrders(orders.map(order => {
              if ((order.customer as any)?.id === updatedCustomer.id) {
                return { ...order, customer: updatedCustomer };
              }
              return order;
            }));
            setEditingCustomer(null);
            loadOrders(); // Recargar para asegurar consistencia
          }}
        />
      )}
    </div>
  );
}

