import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import type { Customer, Service, DeviceChecklistItem, DeviceType } from "@/types";
import { detectDeviceType, getSmartSuggestions } from "@/lib/deviceDatabase";
import DeviceChecklist from "./DeviceChecklist";
import CustomerSearch from "./CustomerSearch";
import PatternDrawer from "./PatternDrawer";
import ServiceSelector from "./ServiceSelector";
import PDFPreview from "./PDFPreview";
import { generatePDFBlob } from "@/lib/generate-pdf-blob";

interface OrderFormProps {
  technicianId: string;
  onSaved: () => void;
}

export default function OrderForm({ technicianId, onSaved }: OrderFormProps) {
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
  const [loading, setLoading] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

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
      // Validar checklist primero antes de continuar
      // Si hay items en checklistData, todos deben tener un valor seleccionado
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

      // Obtener datos completos del usuario (incluyendo sucursal)
      const { data: tech, error: techError } = await supabase
        .from("users")
        .select(`
          sucursal_id,
          sucursal:branches(*)
        `)
        .eq("id", technicianId)
        .single();

      if (techError) throw techError;

      // La sucursal ya viene cargada desde la relación
      const branchData = (tech as any)?.sucursal || null;
      const sucursalId = tech?.sucursal_id || null;

      // Preparar datos de inserción
      // NOTA: Dejamos order_number como NULL para que el trigger de la BD lo genere automáticamente
      // Esto garantiza números únicos incluso con alta concurrencia
      const orderData: any = {
          order_number: null, // El trigger de BD lo generará automáticamente
          customer_id: selectedCustomer.id,
          technician_id: technicianId,
          sucursal_id: sucursalId,
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
        status: "en_proceso",
      };

      // Agregar device_unlock_pattern solo si existe la columna y hay un patrón
      if (unlockType === "pattern" && deviceUnlockPattern.length > 0) {
        orderData.device_unlock_pattern = deviceUnlockPattern;
      }

      // Crear la orden
      const { data: order, error: orderError } = await supabase
        .from("work_orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear servicios de la orden (guardar el valor del servicio)
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

      // Preparar orden para vista previa
      const orderWithRelations = {
        ...order,
        customer: selectedCustomer,
        sucursal: branchData,
      };
      
      // Enviar email al cliente con el PDF adjunto
      try {
        // Generar PDF
        const pdfBlob = await generatePDFBlob(
          orderWithRelations,
          selectedServices,
          serviceValue,
          replacementCost,
          warrantyDays,
          checklistData,
          []
        );

        // Convertir PDF a base64
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Remover el prefijo data:application/pdf;base64,
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        // Enviar email
        console.log("[ORDER FORM] Enviando email de creación de orden:", order.order_number);
        const emailResponse = await fetch('/api/send-order-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: selectedCustomer.email,
            customerName: selectedCustomer.name,
            orderNumber: order.order_number,
            pdfBase64: pdfBase64,
            branchName: branchData?.name,
            branchEmail: branchData?.email,
          }),
        });

        if (!emailResponse.ok) {
          let errorData: any = {};
          try {
            const text = await emailResponse.text();
            console.error("[ORDER FORM] Respuesta de error (texto):", text);
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
            console.error("[ORDER FORM] Error leyendo respuesta:", textError);
            errorData = { error: `Error ${emailResponse.status}: ${emailResponse.statusText}`, status: emailResponse.status };
          }
          console.error("[ORDER FORM] Error enviando email:", errorData);
          alert(`Orden creada exitosamente, pero hubo un error al enviar el email: ${errorData.error || 'Error desconocido'}\n\nDetalles: ${errorData.details || 'Sin detalles adicionales'}`);
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
            console.error("[ORDER FORM] Error leyendo respuesta exitosa:", textError);
            successData = { message: 'Email enviado (sin respuesta del servidor)' };
          }
          console.log("[ORDER FORM] Email enviado exitosamente:", successData);
        }
      } catch (emailError: any) {
        console.error("[ORDER FORM] Excepción al enviar email:", emailError);
        // No fallar la creación de la orden si el email falla
      }
      
      setCreatedOrder(orderWithRelations);
      setShowPDFPreview(true);
      alert("Orden creada exitosamente. Se abrirá la vista previa del PDF y se enviará un email al cliente.");
    } catch (error: any) {
      console.error("Error creando orden:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Nueva Orden de Trabajo</h2>

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
              // Pequeño delay para permitir que el click en la sugerencia se procese
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
                    e.preventDefault(); // Prevenir que onBlur se ejecute antes del click
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

      {/* Prioridad y Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label 
            htmlFor="commitment-date"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Fecha Compromiso
          </label>
          <div className="relative">
            <input
              id="commitment-date"
              type="date"
              className="w-full border border-slate-300 rounded-md px-3 py-2 cursor-pointer"
              value={commitmentDate}
              onChange={(e) => setCommitmentDate(e.target.value)}
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.showPicker) {
                  target.showPicker();
                }
              }}
              onClick={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.showPicker) {
                  target.showPicker();
                }
              }}
            />
          </div>
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
          onClick={onSaved}
          className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Crear Orden"}
        </button>
      </div>

      {showPDFPreview && createdOrder && (
        <PDFPreview
          order={createdOrder}
          services={selectedServices}
          serviceValue={serviceValue}
          replacementCost={replacementCost}
          warrantyDays={warrantyDays}
          checklistData={checklistData}
          notes={[]}
          onClose={() => {
            setShowPDFPreview(false);
            onSaved();
          }}
          onDownload={() => {
            setShowPDFPreview(false);
            onSaved();
          }}
        />
      )}
    </form>
  );
}

