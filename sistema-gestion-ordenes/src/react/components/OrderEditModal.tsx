import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import type { WorkOrder, Customer, Service, DeviceType } from "@/types";
import { detectDeviceType, getSmartSuggestions } from "@/lib/deviceDatabase";
import DeviceChecklist from "./DeviceChecklist";
import CustomerSearch from "./CustomerSearch";
import PatternDrawer from "./PatternDrawer";
import ServiceSelector from "./ServiceSelector";

interface OrderEditModalProps {
  order: WorkOrder;
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderEditModal({ order, onClose, onSaved }: OrderEditModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>([]);
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const deviceSuggestionsRef = useRef<HTMLDivElement>(null);
  const [deviceSerial, setDeviceSerial] = useState("");
  const [unlockType, setUnlockType] = useState<"code" | "pattern" | "none">("none");
  const [deviceUnlockCode, setDeviceUnlockCode] = useState("");
  const [deviceUnlockPattern, setDeviceUnlockPattern] = useState<number[]>([]);
  const [showPatternDrawer, setShowPatternDrawer] = useState(false);
  const [problemDescription, setProblemDescription] = useState("");
  const [checklistData, setChecklistData] = useState<Record<string, "ok" | "damaged" | "replaced" | "no_probado">>({});
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [replacementCost, setReplacementCost] = useState(0);
  const [serviceValue, setServiceValue] = useState(0);
  const [priority, setPriority] = useState<"baja" | "media" | "urgente">("media");
  const [commitmentDate, setCommitmentDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [status, setStatus] = useState<string>("en_proceso");
  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

  // Cargar datos de la orden
  useEffect(() => {
    async function loadOrderData() {
      try {
        // Cargar servicios de la orden
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

        // Establecer valores iniciales
        setSelectedCustomer(order.customer as any as Customer);
        setDeviceType(order.device_type as DeviceType);
        setDeviceModel(order.device_model);
        setDeviceSerial(order.device_serial_number || "");
        setProblemDescription(order.problem_description);
        setChecklistData((order.checklist_data as Record<string, "ok" | "damaged" | "replaced" | "no_probado">) || {});
        setSelectedServices(services);
        setReplacementCost(order.replacement_cost || 0);
        setServiceValue(order.labor_cost || 0);
        setPriority(order.priority as "baja" | "media" | "urgente");
        setCommitmentDate(order.commitment_date ? new Date(order.commitment_date).toISOString().split('T')[0] : "");
        setWarrantyDays(order.warranty_days || 30);
        setStatus(order.status);

        // Configurar unlock code/pattern
        if (order.device_unlock_code) {
          setUnlockType("code");
          setDeviceUnlockCode(order.device_unlock_code);
        } else if (order.device_unlock_pattern && Array.isArray(order.device_unlock_pattern) && order.device_unlock_pattern.length > 0) {
          setUnlockType("pattern");
          setDeviceUnlockPattern(order.device_unlock_pattern as number[]);
        } else {
          setUnlockType("none");
        }
      } catch (error) {
        console.error("Error cargando datos de la orden:", error);
        alert("Error al cargar los datos de la orden");
      } finally {
        setLoadingOrder(false);
      }
    }

    loadOrderData();
  }, [order]);

  useEffect(() => {
    if (deviceModel) {
      const detected = detectDeviceType(deviceModel);
      setDeviceType(detected);
      const suggestions = getSmartSuggestions(deviceModel);
      setDeviceSuggestions(suggestions.slice(0, 5));
      setShowDeviceSuggestions(true);
    } else {
      setDeviceSuggestions([]);
      setShowDeviceSuggestions(false);
    }
  }, [deviceModel]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        deviceInputRef.current && 
        deviceSuggestionsRef.current &&
        !deviceInputRef.current.contains(event.target as Node) &&
        !deviceSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowDeviceSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !deviceModel || !problemDescription || selectedServices.length === 0 || serviceValue <= 0) {
      alert("Por favor completa todos los campos obligatorios (incluyendo valor del servicio)");
      return;
    }

    setLoading(true);

    try {
      // Validar checklist
      const checklistItemNames = Object.keys(checklistData);
      if (checklistItemNames.length > 0) {
        const missingItems: string[] = [];
        checklistItemNames.forEach((itemName) => {
          if (!checklistData[itemName] || checklistData[itemName] === "") {
            missingItems.push(itemName);
          }
        });

        if (missingItems.length > 0) {
          setLoading(false);
          alert(`Por favor selecciona una opción para todos los items del checklist. Faltan: ${missingItems.join(", ")}`);
          return;
        }
      }

      // Actualizar la orden
      const orderData: any = {
        customer_id: selectedCustomer.id,
        device_type: deviceType || "iphone",
        device_model: deviceModel,
        device_serial_number: deviceSerial || null,
        device_unlock_code: unlockType === "code" ? deviceUnlockCode : null,
        problem_description: problemDescription,
        checklist_data: checklistData,
        replacement_cost: replacementCost,
        labor_cost: serviceValue,
        total_repair_cost: replacementCost + serviceValue,
        priority,
        commitment_date: commitmentDate || null,
        warranty_days: warrantyDays,
        status: status as any,
      };

      // Agregar device_unlock_pattern solo si existe
      if (unlockType === "pattern" && deviceUnlockPattern.length > 0) {
        orderData.device_unlock_pattern = deviceUnlockPattern;
      } else {
        orderData.device_unlock_pattern = null;
      }

      // Actualizar la orden
      const { error: orderError } = await supabase
        .from("work_orders")
        .update(orderData)
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Eliminar servicios antiguos
      await supabase
        .from("order_services")
        .delete()
        .eq("order_id", order.id);

      // Crear nuevos servicios
      for (const service of selectedServices) {
        await supabase.from("order_services").insert({
          order_id: order.id,
          service_id: service.id,
          service_name: service.name,
          quantity: 1,
          unit_price: serviceValue,
          total_price: serviceValue,
        });
      }

      alert("Orden actualizada exitosamente");
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error actualizando orden:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loadingOrder) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-slate-600">Cargando datos de la orden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900">Editar Orden {order.order_number}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Selección de Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cliente *
            </label>
            <CustomerSearch
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
            />
          </div>

          {/* Información del Dispositivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dispositivo (Marca y Modelo) *
              </label>
              <input
                ref={deviceInputRef}
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                placeholder="Ej: iPhone 13 Pro Max"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                onFocus={() => {
                  if (deviceSuggestions.length > 0) {
                    setShowDeviceSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowDeviceSuggestions(false);
                  }, 200);
                }}
                required
              />
              {showDeviceSuggestions && deviceSuggestions.length > 0 && (
                <div 
                  ref={deviceSuggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                >
                  {deviceSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDeviceModel(suggestion);
                        setDeviceSuggestions([]);
                        setShowDeviceSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de Serie
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Código/Patrón de Desbloqueo
              </label>
              <div className="space-y-2">
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={unlockType}
                  onChange={(e) => {
                    const type = e.target.value as "code" | "pattern" | "none";
                    setUnlockType(type);
                    if (type === "pattern") {
                      setShowPatternDrawer(true);
                    } else {
                      setDeviceUnlockPattern([]);
                      if (type === "none") {
                        setDeviceUnlockCode("");
                      }
                    }
                  }}
                >
                  <option value="none">Sin código/patrón</option>
                  <option value="code">Código numérico</option>
                  <option value="pattern">Patrón de desbloqueo</option>
                </select>
                
                {unlockType === "code" && (
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-md px-3 py-2"
                    placeholder="Ej: 1234"
                    value={deviceUnlockCode}
                    onChange={(e) => setDeviceUnlockCode(e.target.value)}
                  />
                )}
                
                {unlockType === "pattern" && deviceUnlockPattern.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <p className="text-sm text-slate-600 mb-2">
                      Patrón guardado ({deviceUnlockPattern.length} puntos)
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPatternDrawer(true)}
                        className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100"
                      >
                        Cambiar Patrón
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeviceUnlockPattern([]);
                          setUnlockType("none");
                        }}
                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
                
                {unlockType === "pattern" && deviceUnlockPattern.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPatternDrawer(true)}
                    className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-md text-slate-600 hover:border-brand-light hover:text-brand-light transition-colors"
                  >
                    Dibujar Patrón
                  </button>
                )}
              </div>
            </div>
            
            {showPatternDrawer && (
              <PatternDrawer
                onPatternComplete={(pattern) => {
                  setDeviceUnlockPattern(pattern);
                  setShowPatternDrawer(false);
                }}
                onClose={() => setShowPatternDrawer(false)}
              />
            )}
          </div>

          {/* Checklist Dinámico */}
          {deviceType && (
            <DeviceChecklist
              deviceType={deviceType}
              checklistData={checklistData}
              onChecklistChange={setChecklistData}
            />
          )}

          {/* Descripción del Problema */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción del Problema *
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-md px-3 py-2 min-h-[100px]"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
          </div>

          {/* Servicios */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Servicios *
            </label>
            <ServiceSelector
              selectedServices={selectedServices}
              onServicesChange={setSelectedServices}
            />
          </div>

          {/* Costos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Costo Repuesto (CLP)
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formatCLPInput(replacementCost)}
                onChange={(e) => setReplacementCost(parseCLPInput(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valor del Servicio (CLP) *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formatCLPInput(serviceValue)}
                onChange={(e) => setServiceValue(parseCLPInput(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Prioridad, Estado y Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prioridad *
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                required
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado *
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="en_proceso">En Proceso</option>
                <option value="por_entregar">Por Entregar</option>
                <option value="entregada">Entregada</option>
                <option value="rechazada">Rechazada</option>
                <option value="sin_solucion">Sin Solución</option>
                <option value="garantia">Garantía</option>
              </select>
            </div>
            <div>
              <label 
                htmlFor="commitment-date"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Fecha Compromiso
              </label>
              <input
                id="commitment-date"
                type="date"
                className="w-full border border-slate-300 rounded-md px-3 py-2 cursor-pointer"
                value={commitmentDate}
                onChange={(e) => setCommitmentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Garantía (días)
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 30)}
                min="0"
              />
            </div>
          </div>

          {/* Total con desglose de IVA */}
          <div className="bg-slate-50 p-4 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP((replacementCost + serviceValue) / 1.19)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">IVA (19%):</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP((replacementCost + serviceValue) - ((replacementCost + serviceValue) / 1.19))}
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-700">Total:</span>
                <span className="text-2xl font-bold text-brand">
                  {formatCLP(replacementCost + serviceValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








