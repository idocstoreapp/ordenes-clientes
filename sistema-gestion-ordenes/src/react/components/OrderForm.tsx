import { useState, useEffect, useRef, Fragment } from "react";
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
import { uploadPDFToStorage } from "@/lib/upload-pdf";

interface OrderFormProps {
  technicianId: string;
  onSaved: () => void;
}

// Interfaz para un equipo individual
interface DeviceItem {
  id: string; // ID único para cada equipo
  deviceType: DeviceType | null;
  deviceModel: string;
  deviceSerial: string;
  unlockType: "code" | "pattern" | "none";
  deviceUnlockCode: string;
  deviceUnlockPattern: number[];
  problemDescription: string;
  checklistData: Record<string, "ok" | "damaged" | "replaced" | "no_probado">;
  selectedServices: Service[];
  replacementCost: number;
  serviceValue: number;
}

export default function OrderForm({ technicianId, onSaved }: OrderFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Estado para múltiples equipos - empezar con un equipo vacío
  const [devices, setDevices] = useState<DeviceItem[]>([
    {
      id: `device-${Date.now()}`,
      deviceType: null,
      deviceModel: "",
      deviceSerial: "",
      unlockType: "none",
      deviceUnlockCode: "",
      deviceUnlockPattern: [],
      problemDescription: "",
      checklistData: {},
      selectedServices: [],
      replacementCost: 0,
      serviceValue: 0,
    }
  ]);
  
  // Estados compartidos para toda la orden
  const [priority, setPriority] = useState<"baja" | "media" | "urgente">("media");
  const [commitmentDate, setCommitmentDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Protección contra múltiples submits
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [createdOrderServices, setCreatedOrderServices] = useState<Array<{ quantity: number; unit_price: number; total_price: number; service_name: string }>>([]);
  const [showDeviceCategoryModal, setShowDeviceCategoryModal] = useState<{ deviceId: string; deviceModel: string } | null>(null);
  const [pendingDeviceModel, setPendingDeviceModel] = useState("");
  
  // Referencias para sugerencias de dispositivos (una por equipo)
  const deviceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const deviceSuggestionsRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [deviceSuggestions, setDeviceSuggestions] = useState<Record<string, string[]>>({});
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState<Record<string, boolean>>({});
  const [showPatternDrawer, setShowPatternDrawer] = useState<{ deviceId: string } | null>(null);
  
  const MAX_DESCRIPTION_LENGTH = 500; // Límite máximo de caracteres para la descripción

  // Funciones auxiliares para manejar múltiples equipos
  const updateDevice = (deviceId: string, updates: Partial<DeviceItem>) => {
    setDevices(devices.map(device => 
      device.id === deviceId ? { ...device, ...updates } : device
    ));
  };

  const addNewDevice = () => {
    const newDevice: DeviceItem = {
      id: `device-${Date.now()}-${Math.random()}`,
      deviceType: null,
      deviceModel: "",
      deviceSerial: "",
      unlockType: "none",
      deviceUnlockCode: "",
      deviceUnlockPattern: [],
      problemDescription: "",
      checklistData: {},
      selectedServices: [],
      replacementCost: 0,
      serviceValue: 0,
    };
    setDevices([...devices, newDevice]);
  };

  const removeDevice = (deviceId: string) => {
    if (devices.length <= 1) {
      alert("Debe haber al menos un equipo en la orden");
      return;
    }
    setDevices(devices.filter(device => device.id !== deviceId));
  };

  // Detectar tipo de dispositivo cuando cambia el modelo de un equipo específico
  useEffect(() => {
    devices.forEach(device => {
      if (device.deviceModel) {
        const detected = detectDeviceType(device.deviceModel);
        if (detected && device.deviceType !== detected) {
          updateDevice(device.id, { deviceType: detected });
        }
        const suggestions = getSmartSuggestions(device.deviceModel);
        setDeviceSuggestions(prev => ({
          ...prev,
          [device.id]: suggestions.slice(0, 5)
        }));
        setShowDeviceSuggestions(prev => ({
          ...prev,
          [device.id]: true
        }));
      } else {
        setDeviceSuggestions(prev => ({
          ...prev,
          [device.id]: []
        }));
        setShowDeviceSuggestions(prev => ({
          ...prev,
          [device.id]: false
        }));
      }
    });
  }, [devices.map(d => d.deviceModel).join(',')]);

  // Cerrar sugerencias al hacer click fuera (para todos los equipos)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      devices.forEach(device => {
        const inputRef = deviceInputRefs.current[device.id];
        const suggestionsRef = deviceSuggestionsRefs.current[device.id];
        if (inputRef && suggestionsRef && 
            !inputRef.contains(event.target as Node) &&
            !suggestionsRef.contains(event.target as Node)) {
          setShowDeviceSuggestions(prev => ({ ...prev, [device.id]: false }));
        }
      });
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [devices.map(d => d.id).join(',')]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Protección contra múltiples submits
    if (isSubmitting || loading) {
      console.warn("Submit ya en progreso, ignorando llamada duplicada");
      return;
    }
    
    // Validar cliente
    if (!selectedCustomer) {
      alert("Por favor selecciona un cliente");
      return;
    }
    
    // Validar que todos los equipos tengan los campos obligatorios
    const invalidDevices: string[] = [];
    devices.forEach((device, index) => {
      if (!device.deviceModel || !device.problemDescription || device.selectedServices.length === 0 || device.serviceValue <= 0) {
        invalidDevices.push(`Equipo ${index + 1}`);
      }
      // Validar descripción
      if (device.problemDescription.length > MAX_DESCRIPTION_LENGTH) {
        invalidDevices.push(`Equipo ${index + 1} (descripción excede ${MAX_DESCRIPTION_LENGTH} caracteres)`);
      }
    });
    
    if (invalidDevices.length > 0) {
      alert(`Por favor completa todos los campos obligatorios para: ${invalidDevices.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Validar checklist para cada equipo
      const invalidChecklists: string[] = [];
      devices.forEach((device, index) => {
        const checklistItemNames = Object.keys(device.checklistData);
        if (checklistItemNames.length > 0) {
          const missingItems: string[] = [];
          checklistItemNames.forEach((itemName) => {
            if (!device.checklistData[itemName] || device.checklistData[itemName] === "") {
              missingItems.push(itemName);
            }
          });
          if (missingItems.length > 0) {
            invalidChecklists.push(`Equipo ${index + 1}: ${missingItems.join(", ")}`);
          }
        }
      });
      
      if (invalidChecklists.length > 0) {
        setLoading(false);
        alert(`Por favor selecciona una opción para todos los items del checklist.\n${invalidChecklists.join("\n")}`);
        return;
      }

      // Verificar si es una sucursal (no tiene usuario en auth.users)
      // Las sucursales tienen su sesión guardada en localStorage
      let isBranch = false;
      let sucursalId: string | null = null;
      let branchData = null;
      let actualTechnicianId: string | null = technicianId;

      // Verificar si hay sesión de sucursal en localStorage
      if (typeof window !== 'undefined') {
        const branchSessionStr = localStorage.getItem('branchSession');
        if (branchSessionStr) {
          try {
            const branchSession = JSON.parse(branchSessionStr);
            if (branchSession.type === 'branch' && branchSession.branchId === technicianId) {
              // Es una sucursal - usar el branchId como sucursal_id
              isBranch = true;
              sucursalId = branchSession.branchId;
              actualTechnicianId = null; // Las sucursales no tienen technician_id
              
              // Cargar datos completos de la sucursal
              const { data: branch, error: branchError } = await supabase
                .from("branches")
                .select("*")
                .eq("id", sucursalId)
                .single();
              
              if (!branchError && branch) {
                branchData = branch;
              }
            }
          } catch (e) {
            console.error("Error parseando branchSession:", e);
          }
        }
      }

      // Si no es sucursal, obtener datos del usuario normal
      if (!isBranch) {
        const { data: tech, error: techError } = await supabase
          .from("users")
          .select("sucursal_id")
          .eq("id", technicianId)
          .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

        if (techError) {
          // Si el error es porque no existe el usuario, podría ser una sucursal
          // Intentar verificar si es una sucursal por el ID
          const { data: branchCheck, error: branchCheckError } = await supabase
            .from("branches")
            .select("id")
            .eq("id", technicianId)
            .maybeSingle();
          
          if (!branchCheckError && branchCheck) {
            // Es una sucursal
            isBranch = true;
            sucursalId = technicianId;
            actualTechnicianId = null;
            
            // Cargar datos completos de la sucursal
            const { data: branch, error: branchError } = await supabase
              .from("branches")
              .select("*")
              .eq("id", sucursalId)
              .single();
            
            if (!branchError && branch) {
              branchData = branch;
            }
          } else {
            throw techError;
          }
        } else {
          sucursalId = tech?.sucursal_id || null;
          
          // Cargar datos completos de la sucursal por separado
          if (sucursalId) {
            const { data: branch, error: branchError } = await supabase
              .from("branches")
              .select("*")
              .eq("id", sucursalId)
              .single();
            
            if (!branchError && branch) {
              branchData = branch;
            }
          }
        }
      }

      // Crear una orden por cada equipo
      const createdOrders: any[] = [];
      
      for (const device of devices) {
        // Preparar datos de inserción para este equipo
        // NOTA: Dejamos order_number como NULL para que el trigger de la BD lo genere automáticamente
        const orderData: any = {
          order_number: null, // El trigger de BD lo generará automáticamente
          customer_id: selectedCustomer.id,
          technician_id: actualTechnicianId, // NULL para sucursales, technicianId para usuarios normales
          sucursal_id: sucursalId,
          device_type: device.deviceType || "iphone",
          device_model: device.deviceModel,
          device_serial_number: device.deviceSerial || null,
          device_unlock_code: device.unlockType === "code" ? device.deviceUnlockCode : null,
          problem_description: device.problemDescription,
          checklist_data: device.checklistData,
          replacement_cost: device.replacementCost,
          labor_cost: device.serviceValue,
          total_repair_cost: device.replacementCost + device.serviceValue,
          priority,
          commitment_date: commitmentDate || null,
          warranty_days: warrantyDays,
          status: "en_proceso",
        };

        // Agregar device_unlock_pattern solo si existe la columna y hay un patrón
        if (device.unlockType === "pattern" && device.deviceUnlockPattern.length > 0) {
          orderData.device_unlock_pattern = device.deviceUnlockPattern;
        }

        // Crear la orden para este equipo
        const { data: order, error: orderError } = await supabase
          .from("work_orders")
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;

        // Crear servicios de la orden (guardar el valor del servicio)
        for (const service of device.selectedServices) {
          await supabase.from("order_services").insert({
            order_id: order.id,
            service_id: service.id,
            service_name: service.name,
            quantity: 1,
            unit_price: device.serviceValue,
            total_price: device.serviceValue,
          });
        }

        createdOrders.push(order);
      }

      // Usar la primera orden creada para la vista previa del PDF
      const firstOrder = createdOrders[0];
      const firstDevice = devices[0];
      
      // Preparar orden para vista previa
      const orderWithRelations = {
        ...firstOrder,
        customer: selectedCustomer,
        sucursal: branchData,
      };
      
      // Construir orderServices para el PDF (misma estructura que se usa en otros lugares)
      // Incluir la descripción del servicio para que no se repita la descripción del problema
      const orderServicesForPDF = firstDevice.selectedServices.map(service => ({
        quantity: 1,
        unit_price: firstDevice.serviceValue,
        total_price: firstDevice.serviceValue,
        service_name: service.name,
        description: service.description || null, // Incluir descripción del servicio
      }));
      
      // Mostrar éxito inmediatamente
      // IMPORTANTE: Resetear isSubmitting ANTES de mostrar el preview para evitar duplicaciones
      setIsSubmitting(false);
      setLoading(false);
      
      setCreatedOrder(orderWithRelations);
      setCreatedOrderServices(orderServicesForPDF);
      setShowPDFPreview(true);
      const ordersCount = createdOrders.length;
      alert(`Se ${ordersCount === 1 ? 'creó' : 'crearon'} ${ordersCount} orden${ordersCount === 1 ? '' : 'es'} exitosamente. Se abrirá la vista previa del PDF del primer equipo.`);
      
      // Enviar email al cliente en segundo plano (no bloquear)
      // Usar setTimeout para que no bloquee la UI
      setTimeout(async () => {
        try {
          // Cargar datos actualizados de la sucursal por si fueron modificados
          let updatedBranchData = branchData;
          if (sucursalId) {
            const { data: updatedBranch } = await supabase
              .from("branches")
              .select("*")
              .eq("id", sucursalId)
              .single();
            
            if (updatedBranch) {
              updatedBranchData = updatedBranch;
            }
          }

          // Generar PDF con el mismo diseño que se usa en la vista previa (solo para el primer equipo)
          const pdfBlob = await generatePDFBlob(
            {
              ...orderWithRelations,
              sucursal: updatedBranchData,
            },
            firstDevice.selectedServices,
            firstDevice.serviceValue,
            firstDevice.replacementCost,
            warrantyDays,
            firstDevice.checklistData,
            [], // notes vacío para nueva orden
            orderServicesForPDF // Pasar orderServices para que el PDF tenga la misma información detallada
          );

          // Intentar subir PDF a Supabase Storage primero
          let pdfUrl: string | null = null;
          let pdfBase64: string | null = null;
          
          try {
            console.log("[ORDER FORM] Intentando subir PDF a Supabase Storage...");
            pdfUrl = await uploadPDFToStorage(pdfBlob, firstOrder.order_number);
            if (pdfUrl) {
              console.log("[ORDER FORM] PDF subido exitosamente a:", pdfUrl);
            } else {
              console.warn("[ORDER FORM] No se pudo subir PDF a Storage, usando base64 como fallback");
              // Si no se pudo subir, generar base64 como fallback
              pdfBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
              });
            }
          } catch (uploadError) {
            console.warn("[ORDER FORM] Error subiendo PDF a Storage, intentando adjuntar:", uploadError);
            // Si falla la subida, convertir a base64 como fallback
            try {
              pdfBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
              });
            } catch (base64Error) {
              console.error("[ORDER FORM] Error generando base64:", base64Error);
            }
          }
          
          // Asegurarse de que tenemos al menos uno de los dos
          if (!pdfUrl && !pdfBase64) {
            console.error("[ORDER FORM] No se pudo generar ni URL ni base64 del PDF");
            // Intentar generar base64 una vez más como último recurso
            try {
              pdfBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
              });
            } catch (finalError) {
              console.error("[ORDER FORM] Error final generando base64:", finalError);
            }
          }

          // Solo enviar email si tenemos PDF
          if (pdfUrl || pdfBase64) {
            // Enviar email solo para la primera orden
            console.log("[ORDER FORM] Enviando email de creación de orden:", firstOrder.order_number);
            const emailResponse = await fetch('/api/send-order-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: selectedCustomer.email,
                customerName: selectedCustomer.name,
                orderNumber: order.order_number,
                pdfBase64: pdfBase64, // Puede ser null si se subió a storage
                pdfUrl: pdfUrl, // URL del PDF si se subió exitosamente
                branchName: updatedBranchData?.name || branchData?.name,
                branchEmail: updatedBranchData?.email || branchData?.email,
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
              // No mostrar alerta aquí, solo loguear el error
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
          } else {
            console.warn("[ORDER FORM] No se pudo generar PDF para enviar por email");
          }
        } catch (emailError: any) {
          console.error("[ORDER FORM] Excepción al enviar email:", emailError);
          // No mostrar error al usuario, solo loguear
        }
      }, 100); // Pequeño delay para no bloquear la UI
    } catch (error: any) {
      console.error("Error creando orden:", error);
      alert(`Error: ${error.message}`);
      // Asegurar que se reseteen los estados incluso en caso de error
      setShowPDFPreview(false);
      setCreatedOrder(null);
      setCreatedOrderServices([]);
    } finally {
      // Asegurar que siempre se reseteen los estados
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  return (
    <Fragment>
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

      {/* Equipos - Mostrar cada equipo en una sección separada */}
      {devices.map((device, deviceIndex) => (
        <div key={device.id} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Equipo {deviceIndex + 1}
            </h3>
            {devices.length > 1 && (
              <button
                type="button"
                onClick={() => removeDevice(device.id)}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
              >
                🗑️ Eliminar Equipo
              </button>
            )}
          </div>

          {/* Información del Dispositivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Dispositivo (Marca y Modelo) *
          </label>
          <input
            ref={(el) => deviceInputRefs.current[device.id] = el}
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            placeholder="Ej: iPhone 13 Pro Max"
            value={device.deviceModel}
            onChange={(e) => updateDevice(device.id, { deviceModel: e.target.value })}
            onFocus={() => {
              if (deviceSuggestions[device.id]?.length > 0) {
                setShowDeviceSuggestions(prev => ({ ...prev, [device.id]: true }));
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setShowDeviceSuggestions(prev => ({ ...prev, [device.id]: false }));
              }, 200);
            }}
            required
          />
          {showDeviceSuggestions[device.id] && deviceSuggestions[device.id]?.length > 0 && (
            <div 
              ref={(el) => deviceSuggestionsRefs.current[device.id] = el}
              className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {deviceSuggestions[device.id].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    updateDevice(device.id, { deviceModel: suggestion });
                    setDeviceSuggestions(prev => ({ ...prev, [device.id]: [] }));
                    setShowDeviceSuggestions(prev => ({ ...prev, [device.id]: false }));
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
            value={device.deviceSerial}
            onChange={(e) => updateDevice(device.id, { deviceSerial: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Código/Patrón de Desbloqueo
          </label>
          <div className="space-y-2">
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={device.unlockType}
              onChange={(e) => {
                const type = e.target.value as "code" | "pattern" | "none";
                if (type === "pattern") {
                  setShowPatternDrawer({ deviceId: device.id });
                } else {
                  updateDevice(device.id, { 
                    unlockType: type,
                    deviceUnlockPattern: [],
                    deviceUnlockCode: type === "none" ? "" : device.deviceUnlockCode
                  });
                }
              }}
            >
              <option value="none">Sin código/patrón</option>
              <option value="code">Código numérico</option>
              <option value="pattern">Patrón de desbloqueo</option>
            </select>
            
            {device.unlockType === "code" && (
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                placeholder="Ej: 1234"
                value={device.deviceUnlockCode}
                onChange={(e) => updateDevice(device.id, { deviceUnlockCode: e.target.value })}
              />
            )}
            
            {device.unlockType === "pattern" && device.deviceUnlockPattern.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-sm text-slate-600 mb-2">
                  Patrón guardado ({device.deviceUnlockPattern.length} puntos)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPatternDrawer({ deviceId: device.id })}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100"
                  >
                    Cambiar Patrón
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateDevice(device.id, { deviceUnlockPattern: [], unlockType: "none" });
                    }}
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
            
            {device.unlockType === "pattern" && device.deviceUnlockPattern.length === 0 && (
              <button
                type="button"
                onClick={() => setShowPatternDrawer({ deviceId: device.id })}
                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-md text-slate-600 hover:border-brand-light hover:text-brand-light transition-colors"
              >
                Dibujar Patrón
              </button>
            )}
          </div>
        </div>
        
        {showPatternDrawer?.deviceId === device.id && (
          <PatternDrawer
            onPatternComplete={(pattern) => {
              updateDevice(device.id, { deviceUnlockPattern: pattern });
              setShowPatternDrawer(null);
            }}
            onClose={() => setShowPatternDrawer(null)}
          />
        )}
      </div>

          {/* Modal para seleccionar categoría de dispositivo */}
          {showDeviceCategoryModal?.deviceId === device.id && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Agregar Nuevo Dispositivo
                </h3>
                <p className="text-slate-600 mb-4">
                  El dispositivo <strong>"{showDeviceCategoryModal.deviceModel || device.deviceModel}"</strong> no está en el listado.
                  Por favor, selecciona la categoría del dispositivo:
                </p>
                <div className="space-y-2 mb-6">
                  <button
                    onClick={() => {
                      updateDevice(device.id, { deviceType: "iphone" });
                      setShowDeviceCategoryModal(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
                  >
                    <span className="font-medium">📱 Celular</span>
                    <p className="text-sm text-slate-600">iPhone, Android, etc.</p>
                  </button>
                  <button
                    onClick={() => {
                      updateDevice(device.id, { deviceType: "ipad" });
                      setShowDeviceCategoryModal(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
                  >
                    <span className="font-medium">📱 Tablet</span>
                    <p className="text-sm text-slate-600">iPad, Android Tablet, etc.</p>
                  </button>
                  <button
                    onClick={() => {
                      updateDevice(device.id, { deviceType: "macbook" });
                      setShowDeviceCategoryModal(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
                  >
                    <span className="font-medium">💻 Notebook / Laptop</span>
                    <p className="text-sm text-slate-600">MacBook, Windows Laptop, etc.</p>
                  </button>
                  <button
                    onClick={() => {
                      updateDevice(device.id, { deviceType: "apple_watch" });
                      setShowDeviceCategoryModal(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
                  >
                    <span className="font-medium">⌚ Smartwatch</span>
                    <p className="text-sm text-slate-600">Apple Watch, Android Watch, etc.</p>
                  </button>
                  <button
                    onClick={() => {
                      updateDevice(device.id, { deviceType: "iphone" });
                      setShowDeviceCategoryModal(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
                  >
                    <span className="font-medium">🔧 Otro</span>
                    <p className="text-sm text-slate-600">Otro tipo de dispositivo</p>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowDeviceCategoryModal(null);
                  }}
                  className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botón para agregar categoría si no se detectó tipo */}
          {device.deviceModel && !device.deviceType && showDeviceCategoryModal?.deviceId !== device.id && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800 mb-2">
                No se detectó la categoría del dispositivo. Para mostrar el checklist, selecciona la categoría:
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowDeviceCategoryModal({ deviceId: device.id, deviceModel: device.deviceModel });
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
              >
                ➕ Agregar Nuevo Dispositivo
              </button>
            </div>
          )}

          {/* Checklist Dinámico */}
          {device.deviceType && (
            <DeviceChecklist
              deviceType={device.deviceType}
              checklistData={device.checklistData}
              onChecklistChange={(newChecklist) => updateDevice(device.id, { checklistData: newChecklist })}
            />
          )}

          {/* Descripción del Problema */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción del Problema * (Máximo {MAX_DESCRIPTION_LENGTH} caracteres)
            </label>
            <textarea
              className={`w-full border rounded-md px-3 py-2 min-h-[100px] ${
                device.problemDescription.length > MAX_DESCRIPTION_LENGTH
                  ? "border-red-500 bg-red-50"
                  : "border-slate-300"
              }`}
              value={device.problemDescription}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue.length <= MAX_DESCRIPTION_LENGTH) {
                  updateDevice(device.id, { problemDescription: newValue });
                }
              }}
              maxLength={MAX_DESCRIPTION_LENGTH}
              required
            />
            <div className="mt-1 flex justify-between items-center">
              <span className={`text-xs ${
                device.problemDescription.length > MAX_DESCRIPTION_LENGTH
                  ? "text-red-600 font-semibold"
                  : device.problemDescription.length > MAX_DESCRIPTION_LENGTH * 0.9
                  ? "text-amber-600"
                  : "text-slate-500"
              }`}>
                {device.problemDescription.length > MAX_DESCRIPTION_LENGTH
                  ? `⚠️ Excede el límite por ${device.problemDescription.length - MAX_DESCRIPTION_LENGTH} caracteres`
                  : `${device.problemDescription.length} / ${MAX_DESCRIPTION_LENGTH} caracteres`}
              </span>
            </div>
          </div>

          {/* Servicios */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Servicios *
            </label>
            <ServiceSelector
              selectedServices={device.selectedServices}
              onServicesChange={(services) => updateDevice(device.id, { selectedServices: services })}
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
                value={formatCLPInput(device.replacementCost)}
                onChange={(e) => updateDevice(device.id, { replacementCost: parseCLPInput(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valor del Servicio (CLP) *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formatCLPInput(device.serviceValue)}
                onChange={(e) => updateDevice(device.id, { serviceValue: parseCLPInput(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Total para este equipo */}
          <div className="bg-slate-50 p-4 rounded space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP((device.replacementCost + device.serviceValue) / 1.19)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">IVA (19%):</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP(device.replacementCost + device.serviceValue - (device.replacementCost + device.serviceValue) / 1.19)}
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-700">Total Equipo {deviceIndex + 1}:</span>
                <span className="text-xl font-bold text-brand">
                  {formatCLP(device.replacementCost + device.serviceValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Botón para agregar otro equipo */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={addNewDevice}
          className="px-6 py-3 bg-brand-light text-white rounded-md hover:bg-brand-dark font-medium flex items-center gap-2"
        >
          ➕ Agregar Otro Equipo
        </button>
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

      {/* Total General - Suma de todos los equipos */}
      {(() => {
        const totalReplacementCost = devices.reduce((sum, device) => sum + device.replacementCost, 0);
        const totalServiceValue = devices.reduce((sum, device) => sum + device.serviceValue, 0);
        const totalGeneral = totalReplacementCost + totalServiceValue;
        
        return (
          <div className="bg-slate-50 p-4 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal General:</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP(totalGeneral / 1.19)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">IVA (19%):</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP(totalGeneral - (totalGeneral / 1.19))}
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-700">Total General ({devices.length} {devices.length === 1 ? 'equipo' : 'equipos'}):</span>
                <span className="text-2xl font-bold text-brand">
                  {formatCLP(totalGeneral)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

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
          disabled={loading || isSubmitting || devices.some(device => device.problemDescription.length > MAX_DESCRIPTION_LENGTH)}
          className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || isSubmitting ? "Guardando..." : `Crear ${devices.length === 1 ? 'Orden' : `${devices.length} Órdenes`}`}
        </button>
      </div>
    </form>

    {/* PDFPreview fuera del formulario para evitar que los botones disparen el submit */}
    {/* Mostrar preview solo del primer equipo */}
    {showPDFPreview && createdOrder && devices.length > 0 && (
      <PDFPreview
        order={createdOrder}
        services={devices[0].selectedServices}
        orderServices={createdOrderServices}
        serviceValue={devices[0].serviceValue}
        replacementCost={devices[0].replacementCost}
        warrantyDays={warrantyDays}
        checklistData={devices[0].checklistData}
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
    </Fragment>
  );
}

