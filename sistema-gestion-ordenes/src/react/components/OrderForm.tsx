import { useState, useEffect, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import type { Customer, Service, DeviceChecklistItem, DeviceType, User } from "@/types";
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
  serviceValue: number; // DEPRECADO: mantener por compatibilidad, usar servicePrices en su lugar
  servicePrices: Record<string, number>; // Mapa de precios: serviceId -> price
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
      serviceValue: 0, // DEPRECADO
      servicePrices: {}, // Mapa de precios por servicio
    }
  ]);
  
  // Estados compartidos para toda la orden
  const [priority, setPriority] = useState<"baja" | "media" | "urgente">("media");
  const [commitmentDate, setCommitmentDate] = useState("");
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [responsibleUserId, setResponsibleUserId] = useState<string>(""); // Encargado responsable (obligatorio para sucursales)
  const [responsibleUsers, setResponsibleUsers] = useState<User[]>([]); // Lista de encargados de la sucursal
  const [loadingResponsibleUsers, setLoadingResponsibleUsers] = useState(false);
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

  // Función helper para calcular el total de servicios de un equipo
  const getDeviceServiceTotal = (device: DeviceItem): number => {
    return device.selectedServices.reduce((sum, service) => {
      const price = device.servicePrices[service.id] || 0;
      return sum + price;
    }, 0);
  };

  // Funciones auxiliares para manejar múltiples equipos
  const updateDevice = (deviceId: string, updates: Partial<DeviceItem>) => {
    setDevices(prevDevices => 
      prevDevices.map(device => 
        device.id === deviceId ? { ...device, ...updates } : device
      )
    );
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
      serviceValue: 0, // DEPRECADO
      servicePrices: {}, // Mapa de precios por servicio
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

  // Cargar encargados de la sucursal cuando es una sucursal
  useEffect(() => {
    async function loadResponsibleUsers() {
      // Verificar si es una sucursal
      if (typeof window === 'undefined') return;
      
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          // Si hay sesión de sucursal, cargar encargados de esa sucursal
          if (branchSession.type === 'branch' && branchSession.branchId) {
            const sucursalId = branchSession.branchId;
            console.log("[OrderForm] Cargando encargados para sucursal:", sucursalId);
            
            setLoadingResponsibleUsers(true);
            
            // Primero, verificar todos los encargados para debug
            const { data: allEncargados } = await supabase
              .from("users")
              .select("id, name, role, sucursal_id")
              .eq("role", "encargado");
            console.log("[OrderForm] DEBUG - Todos los encargados en el sistema:", allEncargados);
            console.log("[OrderForm] DEBUG - Buscando encargados con sucursal_id:", sucursalId);
            console.log("[OrderForm] DEBUG - Tipo de sucursalId:", typeof sucursalId);
            
            // Cargar usuarios encargados asignados a esta sucursal
            const { data, error } = await supabase
              .from("users")
              .select("*")
              .eq("role", "encargado")
              .eq("sucursal_id", sucursalId)
              .order("name");

            if (error) {
              console.error("[OrderForm] Error cargando encargados:", error);
              console.error("[OrderForm] Detalles del error:", JSON.stringify(error, null, 2));
              setResponsibleUsers([]);
            } else {
              console.log("[OrderForm] Encargados encontrados para sucursal", sucursalId, ":", data?.length || 0);
              if (data && data.length > 0) {
                console.log("[OrderForm] Encargados encontrados:", data.map(u => ({ 
                  id: u.id, 
                  name: u.name, 
                  sucursal_id: u.sucursal_id,
                  sucursal_id_type: typeof u.sucursal_id
                })));
              } else {
                // Si no hay encargados, mostrar información de debug
                console.warn("[OrderForm] No se encontraron encargados para sucursal:", sucursalId);
                if (allEncargados && allEncargados.length > 0) {
                  console.warn("[OrderForm] Pero hay encargados en el sistema con estos sucursal_id:", 
                    allEncargados.map(u => ({ name: u.name, sucursal_id: u.sucursal_id, sucursal_id_type: typeof u.sucursal_id }))
                  );
                }
              }
              setResponsibleUsers(data || []);
            }
            setLoadingResponsibleUsers(false);
          }
        } catch (error) {
          console.error("[OrderForm] Error parseando sesión de sucursal:", error);
          setLoadingResponsibleUsers(false);
        }
      }
    }

    loadResponsibleUsers();
  }, [technicianId]);

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
    const invalidDevices: Array<{ equipo: string; campos: string[] }> = [];
    devices.forEach((device, index) => {
      const equipoNum = index + 1;
      const camposFaltantes: string[] = [];
      
      // Validar modelo del dispositivo (no vacío y no solo espacios)
      if (!device.deviceModel || !device.deviceModel.trim()) {
        camposFaltantes.push("Dispositivo (Marca y Modelo)");
      }
      
      // Validar descripción del problema (no vacío y no solo espacios)
      if (!device.problemDescription || !device.problemDescription.trim()) {
        camposFaltantes.push("Descripción del Problema");
      }
      
      // Validar descripción no exceda el límite
      if (device.problemDescription && device.problemDescription.length > MAX_DESCRIPTION_LENGTH) {
        camposFaltantes.push(`Descripción excede ${MAX_DESCRIPTION_LENGTH} caracteres`);
      }
      
      // Validar servicios seleccionados
      if (!device.selectedServices || device.selectedServices.length === 0) {
        camposFaltantes.push("Servicios");
      }
      
      // Validar que cada servicio tenga un precio válido
      const serviciosSinPrecio: string[] = [];
      device.selectedServices.forEach(service => {
        const precio = device.servicePrices[service.id];
        if (!precio || precio <= 0 || isNaN(precio)) {
          serviciosSinPrecio.push(service.name);
        }
      });
      if (serviciosSinPrecio.length > 0) {
        camposFaltantes.push(`Precios de servicios: ${serviciosSinPrecio.join(", ")}`);
      }
      
      if (camposFaltantes.length > 0) {
        invalidDevices.push({
          equipo: `Equipo ${equipoNum}`,
          campos: camposFaltantes
        });
      }
    });
    
    if (invalidDevices.length > 0) {
      const mensaje = invalidDevices.map(item => 
        `${item.equipo}: ${item.campos.join(", ")}`
      ).join("\n");
      alert(`Por favor completa todos los campos obligatorios:\n\n${mensaje}`);
      return;
    }

    // Validar encargado responsable si es una sucursal
    if (typeof window !== 'undefined') {
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          if (branchSession.type === 'branch' && branchSession.branchId) {
            // Es una sucursal - validar que se haya seleccionado un encargado
            if (!responsibleUserId || responsibleUserId.trim() === "") {
              alert("Por favor selecciona al responsable de recibir el equipo. Este campo es obligatorio.");
              return;
            }
          }
        } catch (error) {
          console.error("Error validando sesión de sucursal:", error);
        }
      }
    }

    // Validar checklist para cada equipo (ANTES de establecer estados de carga)
    const invalidChecklists: string[] = [];
    devices.forEach((device, index) => {
      const checklistItemNames = Object.keys(device.checklistData);
      if (checklistItemNames.length > 0) {
        const missingItems: string[] = [];
        checklistItemNames.forEach((itemName) => {
          const value = device.checklistData[itemName];
          if (!value || value === "") {
            missingItems.push(itemName);
          }
        });
        if (missingItems.length > 0) {
          invalidChecklists.push(`Equipo ${index + 1}: ${missingItems.join(", ")}`);
        }
      }
    });
    
    if (invalidChecklists.length > 0) {
      alert(`Por favor selecciona una opción para todos los items del checklist.\n${invalidChecklists.join("\n")}`);
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {

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
            if (branchSession.type === 'branch' && branchSession.branchId) {
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

      // === CREAR UNA SOLA ORDEN CON TODOS LOS EQUIPOS ===
      // El primer equipo es el principal (se almacena en campos normales)
      // Los equipos adicionales se almacenan en devices_data (JSONB)
      const firstDevice = devices[0];
      
      // Calcular totales combinados de todos los equipos
      const totalReplacementCost = devices.reduce((sum, d) => sum + d.replacementCost, 0);
      const totalLaborCost = devices.reduce((sum, d) => sum + getDeviceServiceTotal(d), 0);
      const totalRepairCost = totalReplacementCost + totalLaborCost;
      
      // Preparar equipos adicionales (desde el segundo en adelante) para almacenar en JSONB
      const additionalDevices = devices.slice(1).map(device => ({
        device_type: device.deviceType || "iphone",
        device_model: device.deviceModel,
        device_serial_number: device.deviceSerial || null,
        device_unlock_code: device.unlockType === "code" ? device.deviceUnlockCode : null,
        device_unlock_pattern: device.unlockType === "pattern" && device.deviceUnlockPattern.length > 0 
          ? device.deviceUnlockPattern 
          : null,
        problem_description: device.problemDescription,
        checklist_data: device.checklistData || {},
        replacement_cost: device.replacementCost,
        labor_cost: getDeviceServiceTotal(device),
        selected_services: device.selectedServices.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || null,
          quantity: 1,
          unit_price: device.servicePrices[s.id] || 0,
          total_price: device.servicePrices[s.id] || 0,
        })),
      }));

      // Preparar datos de inserción para la orden única
      // NOTA: Dejamos order_number como NULL para que el trigger de la BD lo genere automáticamente
      const orderData: any = {
        order_number: null, // El trigger de BD lo generará automáticamente
        customer_id: selectedCustomer.id,
        technician_id: actualTechnicianId, // NULL para sucursales, technicianId para usuarios normales
        sucursal_id: sucursalId,
        // Datos del primer equipo (equipo principal)
        device_type: firstDevice.deviceType || "iphone",
        device_model: firstDevice.deviceModel,
        device_serial_number: firstDevice.deviceSerial || null,
        device_unlock_code: firstDevice.unlockType === "code" ? firstDevice.deviceUnlockCode : null,
        problem_description: firstDevice.problemDescription,
        checklist_data: firstDevice.checklistData,
        // Totales combinados de todos los equipos
        replacement_cost: totalReplacementCost,
        labor_cost: totalLaborCost,
        total_repair_cost: totalRepairCost,
        priority,
        commitment_date: commitmentDate || null,
        warranty_days: warrantyDays,
        status: "en_proceso",
        // Almacenar equipos adicionales en JSONB (si hay más de un equipo)
        // Nota: Si el campo devices_data no existe en la BD, simplemente no se guardará
        // pero el código seguirá funcionando con all_devices en memoria
        ...(additionalDevices.length > 0 ? { devices_data: additionalDevices } : {}),
        // Agregar encargado responsable si está seleccionado (obligatorio para sucursales)
        ...(responsibleUserId ? { responsible_user_id: responsibleUserId } : {}),
      };

      // Agregar device_unlock_pattern solo si existe la columna y hay un patrón
      if (firstDevice.unlockType === "pattern" && firstDevice.deviceUnlockPattern.length > 0) {
        orderData.device_unlock_pattern = firstDevice.deviceUnlockPattern;
      }

      // Crear la orden única
      const { data: order, error: orderError } = await supabase
        .from("work_orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear servicios de la orden para TODOS los equipos
      // Servicios del primer equipo
      console.log("[OrderForm] Guardando servicios del primer equipo:", {
        order_id: order.id,
        servicios_count: firstDevice.selectedServices.length,
        servicios: firstDevice.selectedServices.map(s => ({ id: s.id, name: s.name, price: firstDevice.servicePrices[s.id] || 0 })),
        servicePrices: firstDevice.servicePrices,
      });
      
      // Validar que hay servicios antes de guardar
      if (!firstDevice.selectedServices || firstDevice.selectedServices.length === 0) {
        console.warn("[OrderForm] ADVERTENCIA: El primer equipo no tiene servicios seleccionados. No se guardarán servicios en order_services.");
      } else {
        for (const service of firstDevice.selectedServices) {
          const servicePrice = firstDevice.servicePrices[service.id] || 0;
          
          // Validar que el precio sea válido
          if (!servicePrice || servicePrice <= 0 || isNaN(servicePrice)) {
            console.error(`[OrderForm] Error: El servicio ${service.name} no tiene un precio válido (${servicePrice}). Saltando...`);
            continue;
          }
          
          const { data: insertedData, error: insertError } = await supabase.from("order_services").insert({
            order_id: order.id,
            service_id: service.id,
            service_name: service.name,
            quantity: 1,
            unit_price: servicePrice,
            total_price: servicePrice,
            // NOTA: La tabla order_services NO tiene columna 'description'
          }).select();
          
          if (insertError) {
            console.error(`[OrderForm] Error guardando servicio ${service.name}:`, insertError);
            // No lanzar error, solo registrar para no bloquear el proceso
          } else {
            console.log(`[OrderForm] Servicio guardado exitosamente: ${service.name} (precio: ${servicePrice})`, insertedData);
          }
        }
      }

      // Servicios de los equipos adicionales (almacenados en devices_data)
      for (const additionalDevice of additionalDevices) {
        for (const service of additionalDevice.selected_services) {
          await supabase.from("order_services").insert({
            order_id: order.id,
            service_id: service.id,
            service_name: service.name,
            quantity: 1,
            unit_price: service.unit_price,
            total_price: service.total_price,
            // NOTA: La tabla order_services NO tiene columna 'description'
          });
        }
      }

      const createdOrders = [order]; // Array con una sola orden

      // Usar la orden creada para la vista previa del PDF (una sola orden con todos los equipos)
      const createdOrder = createdOrders[0];
      
      // Preparar orden para vista previa con todos los equipos
      // DEBUG: Verificar servicios antes de construir all_devices
      console.log("[OrderForm] Construyendo all_devices. Total equipos:", devices.length);
      devices.forEach((device, index) => {
        console.log(`[OrderForm] Equipo ${index + 1}:`, {
          id: device.id,
          model: device.deviceModel,
          selectedServices_count: device.selectedServices.length,
          selectedServices: device.selectedServices,
          servicePrices: device.servicePrices,
        });
      });
      
      const orderWithRelations = {
        ...createdOrder,
        customer: selectedCustomer,
        sucursal: branchData,
        // Incluir información de todos los equipos para el PDF
        all_devices: devices.map((device, index) => {
          const deviceServices = device.selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || null,
            quantity: 1,
            unit_price: device.servicePrices[s.id] || 0,
            total_price: device.servicePrices[s.id] || 0,
          }));
          
          console.log(`[OrderForm] Equipo ${index + 1} - Servicios mapeados:`, deviceServices);
          
          return {
            index: index + 1,
            device_type: device.deviceType || "iphone",
            device_model: device.deviceModel,
            device_serial_number: device.deviceSerial || null,
            device_unlock_code: device.unlockType === "code" ? device.deviceUnlockCode : null,
            device_unlock_pattern: device.unlockType === "pattern" && device.deviceUnlockPattern.length > 0 
              ? device.deviceUnlockPattern 
              : null,
            problem_description: device.problemDescription,
            checklist_data: device.checklistData || {},
            replacement_cost: device.replacementCost,
            labor_cost: getDeviceServiceTotal(device),
            selected_services: deviceServices,
          };
        }),
      };
      
      console.log("[OrderForm] all_devices construido:", orderWithRelations.all_devices);
      
      // Construir orderServices para el PDF (todos los servicios de todos los equipos)
      // Incluir la descripción del servicio para que no se repita la descripción del problema
      const orderServicesForPDF: Array<{
        quantity: number;
        unit_price: number;
        total_price: number;
        service_name: string;
        description?: string | null;
      }> = [];
      
      // Agregar servicios de todos los equipos
      devices.forEach(device => {
        device.selectedServices.forEach(service => {
          const servicePrice = device.servicePrices[service.id] || 0;
          orderServicesForPDF.push({
            quantity: 1,
            unit_price: servicePrice,
            total_price: servicePrice,
            service_name: service.name,
            description: service.description || null,
          });
        });
      });
      
      // Mostrar éxito inmediatamente
      // IMPORTANTE: Resetear isSubmitting ANTES de mostrar el preview para evitar duplicaciones
      setIsSubmitting(false);
      setLoading(false);
      
      setCreatedOrder(orderWithRelations);
      setCreatedOrderServices(orderServicesForPDF);
      setShowPDFPreview(true);
      const devicesCount = devices.length;
      alert(`Orden creada exitosamente con ${devicesCount} equipo${devicesCount === 1 ? '' : 's'}. Se abrirá la vista previa del PDF.`);
      
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

          // Generar PDF con el mismo diseño que se usa en la vista previa (todos los equipos)
          // Recopilar todos los servicios de todos los equipos
          const allServices = devices.flatMap(device => device.selectedServices);
          
          const pdfBlob = await generatePDFBlob(
            {
              ...orderWithRelations,
              sucursal: updatedBranchData,
            },
            allServices,
            totalLaborCost, // Total de servicios de todos los equipos
            totalReplacementCost, // Total de repuestos de todos los equipos
            warrantyDays,
            firstDevice.checklistData, // Checklist del primer equipo (para compatibilidad)
            [], // notes vacío para nueva orden
            orderServicesForPDF // Pasar orderServices para que el PDF tenga la misma información detallada
          );

          // Intentar subir PDF a Supabase Storage primero
          let pdfUrl: string | null = null;
          let pdfBase64: string | null = null;
          
          try {
            console.log("[ORDER FORM] Intentando subir PDF a Supabase Storage...");
            pdfUrl = await uploadPDFToStorage(pdfBlob, createdOrder.order_number);
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
            // Enviar email para la orden creada
            console.log("[ORDER FORM] Enviando email de creación de orden:", createdOrder.order_number);
            const emailResponse = await fetch('/api/send-order-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: selectedCustomer.email,
                customerName: selectedCustomer.name,
                orderNumber: createdOrder.order_number,
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
              onServicesChange={(services) => {
                console.log(`[OrderForm] onServicesChange llamado para equipo ${device.id}:`, {
                  servicios_anteriores: device.selectedServices.length,
                  servicios_nuevos: services.length,
                  servicios: services,
                });
                
                // Validar y eliminar duplicados por ID (protección adicional)
                const uniqueServices: Service[] = [];
                const seenIds = new Set<string>();
                
                for (const service of services) {
                  if (!seenIds.has(service.id)) {
                    seenIds.add(service.id);
                    uniqueServices.push(service);
                  } else {
                    console.warn(`[OrderForm] Servicio duplicado detectado y eliminado: ${service.name} (${service.id})`);
                  }
                }
                
                if (uniqueServices.length !== services.length) {
                  console.warn(`[OrderForm] Se eliminaron ${services.length - uniqueServices.length} servicios duplicados`);
                }
                
                // Al cambiar servicios, limpiar precios de servicios eliminados
                const currentPrices = device.servicePrices;
                const newPrices: Record<string, number> = {};
                uniqueServices.forEach(service => {
                  // Mantener precio existente si el servicio ya estaba, sino usar 0
                  newPrices[service.id] = currentPrices[service.id] || 0;
                });
                updateDevice(device.id, { 
                  selectedServices: uniqueServices,
                  servicePrices: newPrices
                });
                console.log(`[OrderForm] Estado actualizado para equipo ${device.id}. Servicios únicos:`, uniqueServices.length);
              }}
            />
            
            {/* Lista de servicios con precios individuales */}
            {device.selectedServices.length > 0 && (
              <div className="mt-3 space-y-2">
                {device.selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="font-medium text-slate-900 flex-1">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600 whitespace-nowrap">Precio (CLP):</label>
                      <input
                        type="text"
                        className="w-32 border border-slate-300 rounded-md px-3 py-2"
                        value={formatCLPInput(device.servicePrices[service.id] || 0)}
                        onChange={(e) => {
                          const newPrices = { ...device.servicePrices };
                          newPrices[service.id] = parseCLPInput(e.target.value);
                          updateDevice(device.id, { servicePrices: newPrices });
                        }}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          </div>

          {/* Total para este equipo */}
          <div className="bg-slate-50 p-4 rounded space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP((device.replacementCost + getDeviceServiceTotal(device)) / 1.19)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">IVA (19%):</span>
              <span className="text-sm font-medium text-slate-700">
                {formatCLP(device.replacementCost + getDeviceServiceTotal(device) - (device.replacementCost + getDeviceServiceTotal(device)) / 1.19)}
              </span>
            </div>
            <div className="border-t border-slate-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-700">Total Equipo {deviceIndex + 1}:</span>
                <span className="text-xl font-bold text-brand">
                  {formatCLP(device.replacementCost + getDeviceServiceTotal(device))}
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

      {/* Selector de Encargado Responsable (solo para sucursales) */}
      {(() => {
        // Verificar si es una sucursal
        if (typeof window === 'undefined') return null;
        const branchSessionStr = localStorage.getItem('branchSession');
        if (branchSessionStr) {
          try {
            const branchSession = JSON.parse(branchSessionStr);
            if (branchSession.type === 'branch' && branchSession.branchId) {
              return (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Responsable de Recibir el Equipo *
                  </label>
                  {loadingResponsibleUsers ? (
                    <p className="text-slate-600">Cargando encargados...</p>
                  ) : responsibleUsers.length === 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800 mb-2">
                        ⚠️ No hay encargados asignados a esta sucursal.
                      </p>
                      <p className="text-xs text-red-700">
                        El administrador debe crear encargados desde la página de Usuarios y asignarlos a esta sucursal (ID: {branchSession.branchId}).
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        💡 Tip: Verifica en la página de Usuarios que los encargados tengan el campo "Sucursal" asignado correctamente.
                      </p>
                    </div>
                  ) : (
                    <select
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={responsibleUserId}
                      onChange={(e) => setResponsibleUserId(e.target.value)}
                      required
                    >
                      <option value="">Selecciona un encargado...</option>
                      {responsibleUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {!responsibleUserId && responsibleUsers.length > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Este campo es obligatorio para crear la orden
                    </p>
                  )}
                </div>
              );
            }
          } catch (error) {
            // No es sucursal o error parseando
          }
        }
        return null;
      })()}

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
        const totalServiceValue = devices.reduce((sum, device) => sum + getDeviceServiceTotal(device), 0);
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
          {loading || isSubmitting ? "Guardando..." : `Crear Orden${devices.length > 1 ? ` (${devices.length} equipos)` : ''}`}
        </button>
      </div>
    </form>

    {/* PDFPreview fuera del formulario para evitar que los botones disparen el submit */}
    {/* Mostrar preview de todos los equipos en una sola orden */}
    {showPDFPreview && createdOrder && devices.length > 0 && (
      <PDFPreview
        order={createdOrder}
        services={devices.flatMap(d => d.selectedServices)}
        orderServices={createdOrderServices}
        serviceValue={devices.reduce((sum, d) => sum + getDeviceServiceTotal(d), 0)}
        replacementCost={devices.reduce((sum, d) => sum + d.replacementCost, 0)}
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

