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
import { uploadPDFToStorage } from "@/lib/upload-pdf";

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
  const [createdOrderServices, setCreatedOrderServices] = useState<Array<{ quantity: number; unit_price: number; total_price: number; service_name: string }>>([]);
  const [showDeviceCategoryModal, setShowDeviceCategoryModal] = useState(false);
  const [pendingDeviceModel, setPendingDeviceModel] = useState("");

  useEffect(() => {
    if (deviceModel) {
      const detected = detectDeviceType(deviceModel);
      if (detected) {
        setDeviceType(detected);
        setShowDeviceCategoryModal(false);
      } else {
        // Si no se detecta el tipo pero hay texto, permitir continuar sin tipo
        // El usuario puede seleccionar la categoría manualmente
        setDeviceType(null);
      }
      const suggestions = getSmartSuggestions(deviceModel);
      setDeviceSuggestions(suggestions.slice(0, 5));
      setShowDeviceSuggestions(true);
    } else {
      setDeviceSuggestions([]);
      setShowDeviceSuggestions(false);
      setDeviceType(null);
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

      // Preparar datos de inserción
      // NOTA: Dejamos order_number como NULL para que el trigger de la BD lo genere automáticamente
      // Esto garantiza números únicos incluso con alta concurrencia
      const orderData: any = {
          order_number: null, // El trigger de BD lo generará automáticamente
          customer_id: selectedCustomer.id,
          technician_id: actualTechnicianId, // NULL para sucursales, technicianId para usuarios normales
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
      
      // Construir orderServices para el PDF (misma estructura que se usa en otros lugares)
      const orderServicesForPDF = selectedServices.map(service => ({
        quantity: 1,
        unit_price: serviceValue,
        total_price: serviceValue,
        service_name: service.name,
      }));
      
      // Mostrar éxito inmediatamente
      setCreatedOrder(orderWithRelations);
      setCreatedOrderServices(orderServicesForPDF);
      setShowPDFPreview(true);
      alert("Orden creada exitosamente. Se abrirá la vista previa del PDF.");
      
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

          // Generar PDF con el mismo diseño que se usa en la vista previa
          const pdfBlob = await generatePDFBlob(
            {
              ...orderWithRelations,
              sucursal: updatedBranchData,
            },
            selectedServices,
            serviceValue,
            replacementCost,
            warrantyDays,
            checklistData,
            [], // notes vacío para nueva orden
            orderServicesForPDF // Pasar orderServices para que el PDF tenga la misma información detallada
          );

          // Intentar subir PDF a Supabase Storage primero
          let pdfUrl: string | null = null;
          let pdfBase64: string | null = null;
          
          try {
            console.log("[ORDER FORM] Intentando subir PDF a Supabase Storage...");
            pdfUrl = await uploadPDFToStorage(pdfBlob, order.order_number);
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

      {/* Modal para seleccionar categoría de dispositivo */}
      {showDeviceCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Agregar Nuevo Dispositivo
            </h3>
            <p className="text-slate-600 mb-4">
              El dispositivo <strong>"{pendingDeviceModel || deviceModel}"</strong> no está en el listado.
              Por favor, selecciona la categoría del dispositivo:
            </p>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => {
                  setDeviceType("iphone");
                  setShowDeviceCategoryModal(false);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
              >
                <span className="font-medium">📱 Celular</span>
                <p className="text-sm text-slate-600">iPhone, Android, etc.</p>
              </button>
              <button
                onClick={() => {
                  setDeviceType("ipad");
                  setShowDeviceCategoryModal(false);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
              >
                <span className="font-medium">📱 Tablet</span>
                <p className="text-sm text-slate-600">iPad, Android Tablet, etc.</p>
              </button>
              <button
                onClick={() => {
                  setDeviceType("macbook");
                  setShowDeviceCategoryModal(false);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
              >
                <span className="font-medium">💻 Notebook / Laptop</span>
                <p className="text-sm text-slate-600">MacBook, Windows Laptop, etc.</p>
              </button>
              <button
                onClick={() => {
                  setDeviceType("apple_watch");
                  setShowDeviceCategoryModal(false);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
              >
                <span className="font-medium">⌚ Smartwatch</span>
                <p className="text-sm text-slate-600">Apple Watch, Android Watch, etc.</p>
              </button>
              <button
                onClick={() => {
                  // Para "Otro", usar un tipo genérico o permitir crear uno nuevo
                  // Por ahora usaremos "iphone" como base pero el usuario puede agregar items personalizados
                  setDeviceType("iphone");
                  setShowDeviceCategoryModal(false);
                }}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md text-left transition-colors"
              >
                <span className="font-medium">🔧 Otro</span>
                <p className="text-sm text-slate-600">Otro tipo de dispositivo</p>
              </button>
            </div>
            <button
              onClick={() => {
                setShowDeviceCategoryModal(false);
                setPendingDeviceModel("");
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botón para agregar categoría si no se detectó tipo */}
      {deviceModel && !deviceType && !showDeviceCategoryModal && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800 mb-2">
            No se detectó la categoría del dispositivo. Para mostrar el checklist, selecciona la categoría:
          </p>
          <button
            onClick={() => {
              setPendingDeviceModel(deviceModel);
              setShowDeviceCategoryModal(true);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
          >
            ➕ Agregar Nuevo Dispositivo
          </button>
        </div>
      )}

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
          orderServices={createdOrderServices}
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

