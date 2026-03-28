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

interface AdditionalDeviceData {
  device_type?: string;
  device_model?: string;
  device_serial_number?: string | null;
  device_unlock_code?: string | null;
  problem_description?: string;
  replacement_cost?: number;
  labor_cost?: number;
  selected_services?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
}

export default function OrderDetail({ orderId, onClose }: OrderDetailProps) {
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlockPattern, setShowUnlockPattern] = useState(false);
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

  const rawPattern = order.device_unlock_pattern as unknown;
  let patternArray: number[] = [];

  const parseDevicesData = (value: any): AdditionalDeviceData[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        console.warn("[OrderDetail] devices_data no parseable:", value);
      }
    }
    return [];
  };

  const additionalDevices: AdditionalDeviceData[] = parseDevicesData((order as any).devices_data);

  if (Array.isArray(rawPattern)) {
    patternArray = rawPattern
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 9);
  } else if (typeof rawPattern === "string" && rawPattern.trim()) {
    try {
      const parsed = JSON.parse(rawPattern);
      if (Array.isArray(parsed)) {
        patternArray = parsed
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item >= 1 && item <= 9);
      }
    } catch {
      patternArray = rawPattern
        .split("")
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 9);
    }
  }

  const hasUnlockPattern = patternArray.length > 0;
  const allDevices = [
    {
      label: "Equipo 1 (Principal)",
      device_type: order.device_type,
      device_model: order.device_model,
      device_serial_number: order.device_serial_number,
      device_unlock_code: order.device_unlock_code,
      problem_description: order.problem_description,
      replacement_cost: order.replacement_cost,
      labor_cost: order.labor_cost,
      selected_services: orderServices.map((service) => ({
        id: service.id,
        name: service.service_name,
        quantity: service.quantity,
        unit_price: service.unit_price,
        total_price: service.total_price,
      })),
    },
    ...additionalDevices.map((device, idx) => ({
      label: `Equipo ${idx + 2}`,
      ...device,
    })),
  ];

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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">Equipos en la Orden</label>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {allDevices.length} {allDevices.length === 1 ? "equipo" : "equipos"}
              </span>
            </div>

            {allDevices.map((device, idx) => (
              <div key={`${device.device_model || "equipo"}-${idx}`} className="border border-slate-200 rounded-md p-4 bg-slate-50">
                <h4 className="font-semibold text-slate-900 mb-3">{device.label}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Dispositivo</p>
                    <p className="text-slate-900">{device.device_model || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tipo</p>
                    <p className="text-slate-900 capitalize">{device.device_type || "N/A"}</p>
                  </div>
                </div>

                {device.device_serial_number && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500">Número de Serie</p>
                    <p className="text-slate-900">{device.device_serial_number}</p>
                  </div>
                )}

                {device.device_unlock_code && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500">Código de Desbloqueo</p>
                    <p className="text-slate-900 font-mono">{device.device_unlock_code}</p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Descripción del Problema</p>
                  <p className="text-slate-900 whitespace-pre-wrap">{device.problem_description || "Sin descripción"}</p>
                </div>

                {Array.isArray(device.selected_services) && device.selected_services.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1">Servicios</p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {device.selected_services.map((service, serviceIdx) => (
                        <li key={`${service.id || service.name || "servicio"}-${serviceIdx}`}>
                          {service.name || "Servicio"} x{service.quantity || 1} ({formatCLP(service.total_price || 0)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasUnlockPattern && (
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Patrón de Desbloqueo (Equipo 1)</label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowUnlockPattern((prev) => !prev)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
                >
                  {showUnlockPattern ? "Ocultar patrón" : "Ver patrón"}
                </button>
                {showUnlockPattern && (
                  <div className="flex justify-center">
                    <PatternViewer pattern={patternArray} size={200} />
                  </div>
                )}
              </div>
            </div>
          )}

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
                let { data: orderNotes, error: notesError } = await supabase
                  .from("work_order_notes")
                  .select("note")
                  .eq("order_id", order.id)
                  .order("created_at", { ascending: false });

                if (notesError) {
                  const missingTable = String(notesError.message || "").toLowerCase().includes("work_order_notes")
                    && (
                      String(notesError.message || "").toLowerCase().includes("could not find the table")
                      || String(notesError.message || "").toLowerCase().includes("schema cache")
                      || String(notesError.message || "").toLowerCase().includes("does not exist")
                    );
                  if (missingTable) {
                    const fallback = await supabase
                      .from("order_notes")
                      .select("note")
                      .eq("order_id", order.id)
                      .order("created_at", { ascending: false });
                    orderNotes = fallback.data;
                    notesError = fallback.error;
                  }
                }

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
