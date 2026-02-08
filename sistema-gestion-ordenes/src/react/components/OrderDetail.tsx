import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkOrder, Service } from "@/types";
import { formatCLP } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import PatternViewer from "./PatternViewer";
import PDFPreview from "./PDFPreview";
import OrderNotes from "./OrderNotes";

interface OrderDetailProps {
  orderId: string;
  onClose: () => void;
}

export default function OrderDetail({ orderId, onClose }: OrderDetailProps) {
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [orderServices, setOrderServices] = useState<Array<{
    id: string;
    service_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    description?: string | null;
  }>>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [pdfOrderData, setPdfOrderData] = useState<{
    order: WorkOrder;
    services: Service[];
    orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string }>;
    serviceValue: number;
    replacementCost: number;
    warrantyDays: number;
    checklistData?: Record<string, 'ok' | 'damaged' | 'replaced'> | null;
    notes?: string[];
  } | null>(null);

  useEffect(() => {
    async function loadOrder() {
      // Cargar usuario actual
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentUserId(authUser.id);
      }

      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          customer:customers(*),
          technician:users(*),
          sucursal:branches(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Error cargando orden:", error);
      } else {
        setOrder(data);
      }
      setLoading(false);
    }

    async function loadServices() {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from("order_services")
          .select(`
            *,
            service:services(description)
          `)
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (servicesError) {
          console.error("Error cargando servicios:", servicesError);
        } else {
          // Agregar descripción a orderServices si está disponible
          const servicesWithDescription = (servicesData || []).map((os: any) => ({
            id: os.id,
            service_name: os.service_name,
            quantity: os.quantity || 1,
            unit_price: os.unit_price || 0,
            total_price: os.total_price || os.unit_price || 0,
            description: os.service?.description || null
          }));
          setOrderServices(servicesWithDescription);
        }
      } catch (error) {
        console.error("Error cargando servicios:", error);
      } finally {
        setLoadingServices(false);
      }
    }

    loadOrder();
    loadServices();
  }, [orderId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const patternArray = order.device_unlock_pattern as number[] | null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Detalle de Orden</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Mostrar responsable si existe */}
          {order.responsible_user_name && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Responsable de Recibir el Equipo:</span>{" "}
                <span className="text-slate-900">{order.responsible_user_name}</span>
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">N° de Orden</label>
              <p className="text-lg font-semibold text-slate-900">{order.order_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Estado</label>
              <p className="text-lg font-semibold text-slate-900">{order.status.replace("_", " ")}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Cliente</label>
            <p className="text-lg text-slate-900">{(order.customer as any)?.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Dispositivo</label>
            <p className="text-lg text-slate-900">{order.device_model}</p>
          </div>

          {order.device_serial_number && (
            <div>
              <label className="text-sm font-medium text-slate-600">Número de Serie</label>
              <p className="text-lg text-slate-900">{order.device_serial_number}</p>
            </div>
          )}

          {order.device_unlock_code && (
            <div>
              <label className="text-sm font-medium text-slate-600">Código de Desbloqueo</label>
              <p className="text-lg text-slate-900 font-mono">{order.device_unlock_code}</p>
            </div>
          )}

          {patternArray && patternArray.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Patrón de Desbloqueo</label>
              <div className="flex justify-center">
                <PatternViewer pattern={patternArray} size={200} />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-600">Descripción del Problema</label>
            <p className="text-slate-900 whitespace-pre-wrap">{order.problem_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Total</label>
              <p className="text-2xl font-bold text-brand">{formatCLP(order.total_repair_cost)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Fecha</label>
              <p className="text-lg text-slate-900">{formatDate(order.created_at)}</p>
            </div>
          </div>

          {/* Servicios de la orden */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Servicios</h3>
            {loadingServices ? (
              <p className="text-slate-600">Cargando servicios...</p>
            ) : orderServices.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700">Servicio</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-slate-700">Cantidad</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-slate-700">Precio Unit.</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderServices.map((service) => (
                        <tr key={service.id} className="border-b border-slate-100">
                          <td className="py-2 px-3">
                            <div>
                              <p className="font-medium text-slate-900">{service.service_name}</p>
                              {service.description && (
                                <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-2 px-3 text-slate-700">{service.quantity}</td>
                          <td className="text-right py-2 px-3 text-slate-700">{formatCLP(service.unit_price)}</td>
                          <td className="text-right py-2 px-3 font-semibold text-slate-900">{formatCLP(service.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300">
                        <td colSpan={3} className="text-right py-2 px-3 font-semibold text-slate-900">
                          Total Servicios:
                        </td>
                        <td className="text-right py-2 px-3 font-bold text-lg text-brand">
                          {formatCLP(orderServices.reduce((sum, s) => sum + s.total_price, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {order.replacement_cost && order.replacement_cost > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Costo de Repuestos:</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCLP(order.replacement_cost)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 italic">No hay servicios registrados para esta orden.</p>
            )}
          </div>

          {/* Notas de la orden */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <OrderNotes
              orderId={orderId}
              order={order}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={async () => {
              if (!order) return;
              try {
                // Cargar servicios de la orden con JOIN a services para obtener descripciones
                const { data: orderServices, error: servicesError } = await supabase
                  .from("order_services")
                  .select(`
                    *,
                    service:services(description)
                  `)
                  .eq("order_id", order.id);

                if (servicesError) throw servicesError;
                
                // Agregar descripción a orderServices si está disponible
                const orderServicesWithDescription = (orderServices || []).map((os: any) => ({
                  ...os,
                  description: os.service?.description || null
                }));

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

                // Cargar datos actualizados de la sucursal desde la base de datos
                // Esto asegura que el PDF siempre refleje los datos más recientes de la sucursal
                let branchData = null;
                if (order.sucursal_id) {
                  const { data: updatedBranch, error: branchError } = await supabase
                    .from("branches")
                    .select("*")
                    .eq("id", order.sucursal_id)
                    .single();
                  
                  if (!branchError && updatedBranch) {
                    branchData = updatedBranch;
                  } else if (order.sucursal) {
                    // Si falla la carga pero existe en la relación, usar la relación
                    branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
                  }
                } else if (order.sucursal) {
                  // Si no hay sucursal_id pero existe la relación, usar la relación
                  branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
                }

                // Calcular serviceValue: suma de todos los total_price de los servicios
                // Si no hay servicios guardados, usar labor_cost
                let serviceValue = order.labor_cost || 0;
                if (orderServicesWithDescription && orderServicesWithDescription.length > 0) {
                  serviceValue = orderServicesWithDescription.reduce((sum: number, os: any) => sum + (os.total_price || 0), 0);
                }

                const replacementCost = order.replacement_cost || 0;
                const warrantyDays = order.warranty_days || 30;
                const notes = (orderNotes || []).map((n: any) => n.note);

                // Crear orden con datos actualizados de sucursal
                const orderWithUpdatedBranch = {
                  ...order,
                  sucursal: branchData,
                };

                setPdfOrderData({
                  order: orderWithUpdatedBranch,
                  services,
                  orderServices: orderServicesWithDescription || undefined,
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
            }}
            className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
          >
            📄 Ver PDF
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
          >
            Cerrar
          </button>
        </div>

        {pdfOrderData && (
          <PDFPreview
            order={pdfOrderData.order}
            services={pdfOrderData.services}
            orderServices={pdfOrderData.orderServices}
            serviceValue={pdfOrderData.serviceValue}
            replacementCost={pdfOrderData.replacementCost}
            warrantyDays={pdfOrderData.warrantyDays}
            checklistData={pdfOrderData.checklistData}
            notes={pdfOrderData.notes}
            onClose={() => setPdfOrderData(null)}
            onDownload={() => setPdfOrderData(null)}
          />
        )}
      </div>
    </div>
  );
}

