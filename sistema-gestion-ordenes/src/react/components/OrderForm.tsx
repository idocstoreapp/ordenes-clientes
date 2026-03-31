import { useState, useEffect, useRef, Fragment, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import type { Customer, Service, DeviceChecklistItem, DeviceType, User } from "@/types";
import { detectDeviceTypeWithCustom, getSmartSuggestions } from "@/lib/deviceDatabase";
import { getProblemDescriptionSuggestions, getQuickProblemClauses } from "@/lib/problemDescriptionAutocomplete";
import { buildDeviceDisplayName, ensureCatalogChain, fetchCatalogSnapshot, type CatalogSnapshot } from "@/lib/device-catalog";

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

interface DeviceCatalogCard {
  id: number;
  device_type_id: number;
  brand_id: number;
  product_line_id: number;
  model_id: number;
  variant_id: number | null;
  display_name: string;
  image_url: string | null;
  is_active: boolean;
}

function AdaptiveWizardCardImage({ src, alt }: { src: string; alt: string }) {
  const [isVertical, setIsVertical] = useState(false);

  return (
    <div className="h-32 md:h-40 w-full rounded-lg bg-slate-100 overflow-hidden mb-2 border border-slate-200">
      <img
        src={src}
        alt={alt}
        onLoad={(event) => {
          const img = event.currentTarget;
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setIsVertical(img.naturalHeight > img.naturalWidth);
          }
        }}
        className={`h-full w-full ${isVertical ? "object-contain p-1" : "object-cover"}`}
        loading="lazy"
      />
    </div>
  );
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
  checklistData: Record<string, string>;
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
  const [responsibleUserName, setResponsibleUserName] = useState<string>(""); // Nombre del responsable (obligatorio para sucursales, seleccionado de lista)
  const [responsibleUsers, setResponsibleUsers] = useState<User[]>([]); // Lista de responsables de la sucursal
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
  const [customDeviceTypes, setCustomDeviceTypes] = useState<string[]>([]);
  const [recentDeviceModels, setRecentDeviceModels] = useState<string[]>([]);
  const [selectedBrandByDevice, setSelectedBrandByDevice] = useState<Record<string, string | null>>({});
  const [selectedSeriesByDevice, setSelectedSeriesByDevice] = useState<Record<string, string | null>>({});
  const [wizardStepByDevice, setWizardStepByDevice] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<CatalogSnapshot>({
    deviceTypes: [],
    brands: [],
    productLines: [],
    models: [],
    variants: [],
  });
  const [catalogCards, setCatalogCards] = useState<DeviceCatalogCard[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [customCatalogFormByDevice, setCustomCatalogFormByDevice] = useState<Record<string, { model: string; variant: string }>>({});
  const checklistSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const MAX_DESCRIPTION_LENGTH = 500; // Límite máximo de caracteres para la descripción
const appendProblemText = (currentText: string, textToAdd: string): string => {
    const current = currentText.trim();
    const addition = textToAdd.trim();

    if (!addition) return currentText;
    if (current.toLowerCase().includes(addition.toLowerCase())) return currentText;

    if (!current) return addition;
    const separator = current.endsWith(".") ? " " : "; ";
    return `${current}${separator}${addition}`;
  };
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
    setWizardStepByDevice((prev) => ({ ...prev, [newDevice.id]: 1 }));
  };

  const removeDevice = (deviceId: string) => {
    if (devices.length <= 1) {
      alert("Debe haber al menos un equipo en la orden");
      return;
    }
    setDevices(devices.filter(device => device.id !== deviceId));
  };

  const applyDeviceType = (deviceId: string, type: DeviceType) => {
    updateDevice(deviceId, { deviceType: type });
    setSelectedBrandByDevice((prev) => ({ ...prev, [deviceId]: null }));
    setSelectedSeriesByDevice((prev) => ({ ...prev, [deviceId]: null }));
    setWizardStepByDevice((prev) => ({ ...prev, [deviceId]: 2 }));
  };

  const applyBrand = (deviceId: string, brandId: string) => {
    setSelectedBrandByDevice((prev) => ({ ...prev, [deviceId]: brandId }));
    setSelectedSeriesByDevice((prev) => ({ ...prev, [deviceId]: null }));
    setWizardStepByDevice((prev) => ({ ...prev, [deviceId]: 3 }));
  };

  // Cargar tipos de dispositivo personalizados (ej. Samsung) desde la configuración de checklists
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("device_checklist_items").select("device_type");
      if (cancelled || !data) return;
      const builtin = new Set(["iphone", "ipad", "macbook", "apple_watch"]);
      const unique = [...new Set((data as { device_type: string }[]).map((r) => r.device_type))];
      const custom = unique.filter((t) => !builtin.has(t));
      setCustomDeviceTypes(custom);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      try {
        const [snapshot, cardsRes] = await Promise.all([
          fetchCatalogSnapshot(),
          supabase.from("device_catalog_items").select("*").eq("is_active", true),
        ]);
        if (!cancelled) {
          setCatalog(snapshot);
          setCatalogCards((cardsRes.data as DeviceCatalogCard[] | null) ?? []);
        }
      } catch (error: any) {
        console.error("[OrderForm] Error cargando catálogo normalizado:", error);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  // Cargar modelos recientes para autocompletar marcas/modelos personalizados (Samsung, Xiaomi, etc.)
  useEffect(() => {
    let cancelled = false;
    async function loadRecentModels() {
      const { data } = await supabase
        .from("work_orders")
        .select("device_model")
        .not("device_model", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);

      if (cancelled || !data) return;
      const unique = [...new Set(
        (data as Array<{ device_model?: string | null }>)
          .map((row) => row.device_model?.trim())
          .filter((value): value is string => Boolean(value))
      )];
      setRecentDeviceModels(unique);
    }
    loadRecentModels();
    return () => { cancelled = true; };
  }, []);

  const getCombinedSuggestions = (input: string): string[] => {
    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return [];

    const ordered = new Map<string, string>();
    const addSuggestion = (value: string) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized || ordered.has(normalized)) return;
      ordered.set(normalized, value.trim());
    };

    getSmartSuggestions(input).forEach(addSuggestion);

    customDeviceTypes
      .filter((type) => type.toLowerCase().includes(normalizedInput))
      .map((type) => type.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "))
      .forEach(addSuggestion);

    recentDeviceModels
      .filter((model) => model.toLowerCase().includes(normalizedInput))
      .forEach(addSuggestion);

    return Array.from(ordered.values()).slice(0, 8);
  };

  // Actualizar sugerencias cuando cambia el modelo escrito
  useEffect(() => {
    devices.forEach(device => {
      if (device.deviceModel) {
        const suggestions = getCombinedSuggestions(device.deviceModel);
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
  }, [devices.map(d => d.deviceModel).join(','), customDeviceTypes.join(','), recentDeviceModels.join(',')]);

  const applySuggestedModel = (deviceId: string, model: string) => {
    const detectedType = detectDeviceTypeWithCustom(model, customDeviceTypes);
    updateDevice(deviceId, {
      deviceModel: model,
      deviceType: detectedType,
    });
    setWizardStepByDevice((prev) => ({ ...prev, [deviceId]: 5 }));
    setTimeout(() => {
      checklistSectionRefs.current[deviceId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const addCustomModelToCatalog = async (device: DeviceItem) => {
    const brandId = Number(selectedBrandByDevice[device.id]);
    const lineId = Number(selectedSeriesByDevice[device.id]);
    const form = customCatalogFormByDevice[device.id] ?? { model: "", variant: "" };
    const modelName = form.model.trim();
    const variantName = form.variant.trim();
    if (!brandId || !lineId || !modelName) {
      alert("Debes seleccionar marca/línea y escribir el modelo.");
      return;
    }

    const typeId = getTypeIdForDevice(device);
    const brand = catalog.brands.find((b) => b.id === brandId);
    const line = catalog.productLines.find((l) => l.id === lineId);
    if (!typeId || !brand || !line) {
      alert("No se pudo resolver el catálogo base. Recarga la página.");
      return;
    }

    try {
      const chain = await ensureCatalogChain({
        deviceTypeId: typeId,
        brandName: brand.name,
        lineName: line.name,
        modelName,
        variantName: variantName || undefined,
      });

      const displayName = buildDeviceDisplayName({
        brandName: brand.name,
        lineName: line.name,
        modelName,
        variantName,
      });

      await supabase.from("device_catalog_items").upsert({
        device_type_id: typeId,
        brand_id: chain.brandId,
        product_line_id: chain.lineId,
        model_id: chain.modelId,
        variant_id: chain.variantId,
        display_name: displayName,
        is_active: true,
      }, { onConflict: "device_type_id,brand_id,product_line_id,model_id,variant_id" });

      applySuggestedModel(device.id, displayName);
      setCustomCatalogFormByDevice((prev) => ({ ...prev, [device.id]: { model: "", variant: "" } }));
      const [snapshot, cardsRes] = await Promise.all([
        fetchCatalogSnapshot(),
        supabase.from("device_catalog_items").select("*").eq("is_active", true),
      ]);
      setCatalog(snapshot);
      setCatalogCards((cardsRes.data as DeviceCatalogCard[] | null) ?? []);
    } catch (error: any) {
      console.error("[OrderForm] Error creando modelo en catálogo:", error);
      alert(`No se pudo crear el modelo en catálogo: ${error.message}`);
    }
  };

  const getWizardStep = (deviceId: string): number => wizardStepByDevice[deviceId] ?? 1;
  const getTypeIdForDevice = (device: DeviceItem): number | null => {
    if (!device.deviceType) return null;
    return catalog.deviceTypes.find((type) => mapCatalogCodeToDeviceType(type.code) === device.deviceType && type.is_active)?.id ?? null;
  };
  const getBrandsForDevice = (device: DeviceItem) => {
    const typeId = getTypeIdForDevice(device);
    if (!typeId) return [];
    return catalog.brands.filter((brand) => brand.device_type_id === typeId && brand.is_active);
  };
  const getLinesForDevice = (device: DeviceItem) => {
    const brandId = Number(selectedBrandByDevice[device.id]);
    if (!brandId) return [];
    return catalog.productLines.filter((line) => line.brand_id === brandId && line.is_active);
  };
  const getModelsForDevice = (device: DeviceItem) => {
    const lineId = Number(selectedSeriesByDevice[device.id]);
    if (!lineId) return [];
    return catalog.models.filter((model) => model.product_line_id === lineId && model.is_active);
  };
  const getVariantsForModel = (modelId: number) => catalog.variants.filter((variant) => variant.model_id === modelId && variant.is_active);
  const getCardImage = (params: {
    typeId: number | null;
    brandId: number | null;
    lineId: number | null;
    modelId: number;
    variantId?: number | null;
  }): string | null => {
    if (!params.typeId || !params.brandId || !params.lineId) return null;
    const exact = catalogCards.find((card) =>
      card.device_type_id === params.typeId &&
      card.brand_id === params.brandId &&
      card.product_line_id === params.lineId &&
      card.model_id === params.modelId &&
      (params.variantId ? card.variant_id === params.variantId : true)
    );
    return exact?.image_url ?? null;
  };
  const mapCatalogCodeToDeviceType = (code: string): DeviceType => {
    const map: Record<string, DeviceType> = {
      phone: "iphone",
      tablet: "ipad",
      laptop: "macbook",
      wearable: "apple_watch",
    };
    return map[code] ?? code;
  };
  const wizardTypeOptions = catalog.deviceTypes
    .filter((type) => type.is_active)
    .map((type) => ({
      id: mapCatalogCodeToDeviceType(type.code),
      rawCode: type.code,
      label: type.name,
      description: type.name,
      icon: "📱",
      imageUrl: type.image_url || null,
    }));

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
  // Cargar responsables de la sucursal cuando es una sucursal
  useEffect(() => {
    async function loadResponsibleUsers() {
      // Verificar si es una sucursal
      if (typeof window === 'undefined') return;
      
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          // Si hay sesión de sucursal, cargar responsables de esa sucursal
          if (branchSession.type === 'branch' && branchSession.branchId) {
            const sucursalId = branchSession.branchId;
            console.log("[OrderForm] Cargando responsables para sucursal:", sucursalId);
            
            setLoadingResponsibleUsers(true);
            
            // Primero, verificar todos los responsables para debug
            console.log("[OrderForm] DEBUG - Verificando auth.uid():", (await supabase.auth.getUser()).data.user?.id || "NULL");
            
            const { data: allResponsables, error: allError } = await supabase
              .from("users")
              .select("id, name, role, sucursal_id")
              .eq("role", "responsable");
            
            console.log("[OrderForm] DEBUG - Consulta todos los responsables - Error:", allError);
            console.log("[OrderForm] DEBUG - Todos los responsables en el sistema:", allResponsables);
            console.log("[OrderForm] DEBUG - Buscando responsables con sucursal_id:", sucursalId);
            console.log("[OrderForm] DEBUG - Tipo de sucursalId:", typeof sucursalId);
            
            if (allError) {
              console.error("[OrderForm] ERROR CRÍTICO - No se pueden leer responsables debido a RLS:", allError);
              console.error("[OrderForm] Código de error:", allError.code);
              console.error("[OrderForm] Mensaje:", allError.message);
              console.error("[OrderForm] Detalles:", allError.details);
              console.error("[OrderForm] Hint:", allError.hint);
            }
            
            // Cargar usuarios responsables asignados a esta sucursal
            const { data, error } = await supabase
              .from("users")
              .select("*")
              .eq("role", "responsable")
              .eq("sucursal_id", sucursalId)
              .order("name");

            if (error) {
              console.error("[OrderForm] Error cargando responsables filtrados:", error);
              console.error("[OrderForm] Código de error:", error.code);
              console.error("[OrderForm] Mensaje:", error.message);
              console.error("[OrderForm] Detalles:", error.details);
              console.error("[OrderForm] Hint:", error.hint);
              setResponsibleUsers([]);
            } else {
              console.log("[OrderForm] Responsables encontrados para sucursal", sucursalId, ":", data?.length || 0);
              if (data && data.length > 0) {
                console.log("[OrderForm] Responsables encontrados:", data.map(u => ({ 
                  id: u.id, 
                  name: u.name, 
                  sucursal_id: u.sucursal_id,
                  sucursal_id_type: typeof u.sucursal_id
                })));
              } else {
                // Si no hay responsables, mostrar información de debug
                console.warn("[OrderForm] No se encontraron responsables para sucursal:", sucursalId);
                if (allResponsables && allResponsables.length > 0) {
                  console.warn("[OrderForm] Pero hay responsables en el sistema con estos sucursal_id:", 
                    allResponsables.map(u => ({ 
                      name: u.name, 
                      sucursal_id: u.sucursal_id, 
                      sucursal_id_type: typeof u.sucursal_id,
                      sucursal_id_coincide: u.sucursal_id === sucursalId,
                      sucursal_id_equals: u.sucursal_id == sucursalId
                    }))
                  );
                } else {
                  console.error("[OrderForm] PROBLEMA: No se pueden leer responsables. Esto indica que las políticas RLS están bloqueando la consulta.");
                  console.error("[OrderForm] SOLUCIÓN: Ejecuta el script fix_users_rls_simple.sql en Supabase SQL Editor");
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
    let isBranchSession = false;
    if (typeof window !== 'undefined') {
      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          if (branchSession.type === 'branch' && branchSession.branchId) {
            isBranchSession = true;
            // Es una sucursal - validar que se haya ingresado un nombre (puede ser de la lista o texto libre)
            if (!responsibleUserName || responsibleUserName.trim() === "") {
              alert("Por favor ingresa el nombre del responsable de recibir el equipo. Este campo es obligatorio para crear órdenes desde sucursales.");
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
        // Agregar nombre del encargado responsable
        // Si es sucursal, el campo debe estar presente (ya validado arriba)
        // Si no es sucursal, el campo puede ser NULL (opcional, no se agrega)
        ...(isBranchSession && responsibleUserName && responsibleUserName.trim() 
          ? { responsible_user_name: responsibleUserName.trim() } 
          : {}),
      };
      
      // Validación final de seguridad: si es sucursal, el campo debe estar en orderData
      if (isBranchSession && !orderData.responsible_user_name) {
        console.error("[OrderForm] ERROR CRÍTICO: Es sucursal pero responsible_user_name no está en orderData");
        alert("Error: El nombre del encargado responsable es obligatorio. Por favor ingresa el nombre e intenta nuevamente.");
        return;
      }

      // Agregar device_unlock_pattern solo si existe la columna y hay un patrón
      if (firstDevice.unlockType === "pattern" && firstDevice.deviceUnlockPattern.length > 0) {
        orderData.device_unlock_pattern = firstDevice.deviceUnlockPattern;
      }

      // Crear la orden única
      console.log("[OrderForm] Creando orden con datos:", {
        ...orderData,
        responsible_user_name: orderData.responsible_user_name || "NULL (no es sucursal)",
        isBranchSession
      });
      
      const { data: order, error: orderError } = await supabase
        .from("work_orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("[OrderForm] Error al crear orden:", orderError);
        console.error("[OrderForm] Datos enviados:", orderData);
        throw orderError;
      }
      
      console.log("[OrderForm] Orden creada exitosamente:", {
        order_id: order.id,
        order_number: order.order_number,
        responsible_user_name: order.responsible_user_name || "NULL"
      });

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

          // Evitar payloads demasiado grandes (Vercel devuelve 413 antes de ejecutar la función)
          // 2.5M chars base64 ≈ 1.8MB binario, dejando margen para el resto del JSON
          const MAX_BASE64_PAYLOAD_LENGTH = 2_500_000;
          if (pdfBase64 && pdfBase64.length > MAX_BASE64_PAYLOAD_LENGTH) {
            console.warn("[ORDER FORM] PDF en base64 demasiado grande para enviar en request, se enviará email sin adjunto", {
              base64Length: pdfBase64.length,
              maxAllowed: MAX_BASE64_PAYLOAD_LENGTH,
            });
            pdfBase64 = null;
          }

          // Enviar email incluso sin PDF para no perder la notificación al cliente
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
            }        } catch (emailError: any) {
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
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Asistente rápido</h4>
            {getWizardStep(device.id) === 1 && (
              <>
                <p className="text-xs text-slate-600 mb-3">1) ¿Qué dispositivo vas a recibir?</p>
                {catalogLoading ? (
                  <div className="text-xs text-slate-500 mb-4">Cargando catálogo...</div>
                ) : wizardTypeOptions.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4">
                    No hay tipos de dispositivo activos en base de datos.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {wizardTypeOptions.map((option) => (
                      <button
                        key={`${device.id}-${option.id}`}
                        type="button"
                        onClick={() => applyDeviceType(device.id, option.id)}
                        className="text-left  transition-colors  hover: hover:bg-slate-10 overflow-hidden"
                      >
                        {option.imageUrl ? (
                          <img
                            src={option.imageUrl}
                            alt={option.label}
                            className="h-20 w-full rounded-lg object-cover mb-2"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-20 w-full rounded-lg bg-slate-100 border border-slate-200 mb-2 flex items-center justify-center text-2xl">
                            {option.icon}
                          </div>
                        )}
                        <p className="font-medium text-slate-900 text-sm">{option.icon} {option.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{option.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {getWizardStep(device.id) === 2 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-600">2) ¿Qué marca de {wizardTypeOptions.find((option) => option.id === device.deviceType)?.label.toLowerCase()}?</p>
                  <button type="button" className="text-xs underline text-slate-600" onClick={() => setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 1 }))}>
                    Volver
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {getBrandsForDevice(device).map((brand) => (
                    <button
                      key={`${device.id}-brand-${brand.id}`}
                      type="button"
                      onClick={() => applyBrand(device.id, String(brand.id))}
                      className="r text-sm bg-white text-slate-700  hover:bg-slate-10 p-2 text-left"
                    >
                      <div className="h-16  bg-white overflow-hidden mb-2">
                        <img src={brand.logo_url } alt={brand.name} className="h-full w-full object-contain bg-white" loading="lazy" />
                      </div>
                      <p className="font-semibold text-xs">{brand.name}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {getWizardStep(device.id) === 3 && selectedBrandByDevice[device.id] && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-600">3) Selecciona serie / línea</p>
                  <button
                    type="button"
                    className="text-xs underline text-slate-600"
                    onClick={() => {
                      setSelectedBrandByDevice((prev) => ({ ...prev, [device.id]: null }));
                      setSelectedSeriesByDevice((prev) => ({ ...prev, [device.id]: null }));
                      setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 2 }));
                    }}
                  >
                    Volver
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {getLinesForDevice(device).map((series) => (
                    <button
                      key={`${device.id}-series-${series.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedSeriesByDevice((prev) => ({ ...prev, [device.id]: String(series.id) }));
                        setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 4 }));
                      }}
                      className="rounded-xl border text-sm bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 p-2 text-left min-h-[220px]"
                    >
                      {series.image_url ? (
                        <AdaptiveWizardCardImage
                          src={series.image_url}
                          alt={series.name}
                        />
                      ) : (
                        <div className="h-32 md:h-40 w-full rounded-lg bg-slate-100 overflow-hidden mb-2 border border-slate-200 flex items-center justify-center text-slate-400 text-xl">
                          🏷️
                        </div>
                      )}
                      <p className="font-semibold text-xs">{series.name}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {getWizardStep(device.id) === 4 && selectedBrandByDevice[device.id] && selectedSeriesByDevice[device.id] && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-600">4) Modelo exacto</p>
                  <button
                    type="button"
                    className="text-xs underline text-slate-600"
                    onClick={() => setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 3 }))}
                  >
                    Volver
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {getModelsForDevice(device).slice(0, 50).map((model) => {
                    const variants = getVariantsForModel(model.id);
                    const firstVariant = variants[0]?.name ?? "";
                    const typeId = getTypeIdForDevice(device);
                    const brandId = Number(selectedBrandByDevice[device.id]) || null;
                    const lineId = Number(selectedSeriesByDevice[device.id]) || null;
                    const displayName = buildDeviceDisplayName({
                      brandName: catalog.brands.find((b) => b.id === Number(selectedBrandByDevice[device.id]))?.name ?? "",
                      lineName: catalog.productLines.find((l) => l.id === Number(selectedSeriesByDevice[device.id]))?.name ?? "",
                      modelName: model.name,
                      variantName: firstVariant,
                    });
                    const cardImage = getCardImage({ typeId, brandId, lineId, modelId: model.id, variantId: variants[0]?.id ?? null });
                    return (
                      <button
                        key={`${device.id}-model-${model.id}`}
                        type="button"
                        onClick={() => applySuggestedModel(device.id, displayName)}
                        className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs md:text-sm hover:bg-slate-100 text-left min-h-[240px]"
                      >
                        {cardImage ? (
                          <AdaptiveWizardCardImage
                            src={cardImage}
                            alt={displayName}
                          />
                        ) : (
                          <div className="h-32 md:h-40 w-full rounded-lg bg-slate-100 overflow-hidden mb-2 border border-slate-200 flex items-center justify-center text-slate-400 text-xl">
                            📦
                          </div>
                        )}
                        <span>{displayName}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">¿No aparece? Agrégalo al catálogo</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      value={customCatalogFormByDevice[device.id]?.model ?? ""}
                      onChange={(e) => setCustomCatalogFormByDevice((prev) => ({ ...prev, [device.id]: { ...(prev[device.id] ?? { model: "", variant: "" }), model: e.target.value } }))}
                      className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      placeholder="Modelo (ej: S24)"
                    />
                    <input
                      value={customCatalogFormByDevice[device.id]?.variant ?? ""}
                      onChange={(e) => setCustomCatalogFormByDevice((prev) => ({ ...prev, [device.id]: { ...(prev[device.id] ?? { model: "", variant: "" }), variant: e.target.value } }))}
                      className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      placeholder="Variante (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomModelToCatalog(device)}
                      className="rounded-md bg-brand-light px-3 py-1.5 text-sm text-white hover:bg-brand-dark"
                    >
                      Guardar y usar
                    </button>
                  </div>
                </div>
              </>
            )}

            {getWizardStep(device.id) === 5 && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900">
                <p className="text-sm">
                  Dispositivo seleccionado: <strong>{device.deviceModel}</strong>
                </p>
                <button
                  type="button"
                  className="text-xs underline mt-1"
                  onClick={() => setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 2 }))}
                >
                  Cambiar modelo
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Dispositivo seleccionado *
          </label>
          {device.deviceModel ? (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50">
              <p className="font-medium text-emerald-900">{device.deviceModel}</p>
              <button
                type="button"
                className="text-xs underline text-emerald-800 mt-1"
                onClick={() => setWizardStepByDevice((prev) => ({ ...prev, [device.id]: 2 }))}
              >
                Cambiar dispositivo
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              Completa el asistente rápido para seleccionar el dispositivo.
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
                  updateDevice(device.id, {
                    unlockType: "pattern",
                    deviceUnlockCode: "",
                  });
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
              updateDevice(device.id, {
                unlockType: "pattern",
                deviceUnlockPattern: pattern,
                deviceUnlockCode: "",
              });
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
            <div ref={(el) => { checklistSectionRefs.current[device.id] = el; }}>
              <DeviceChecklist
                deviceType={device.deviceType}
                checklistData={device.checklistData}
                onChecklistChange={(newChecklist) => updateDevice(device.id, { checklistData: newChecklist })}
              />
            </div>
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
                        <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Sugerencias inteligentes según equipo/servicios
                </p>
                <div className="flex flex-col gap-2">
                  {getProblemDescriptionSuggestions({
                    deviceType: device.deviceType,
                    selectedServiceNames: device.selectedServices.map((service) => service.name),
                    currentText: device.problemDescription,
                    limit: 3,
                  }).map((suggestion) => (
                    <button
                      key={`${device.id}-${suggestion.slice(0, 40)}`}
                      type="button"
                      className="text-left text-xs px-3 py-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors"
                      onClick={() => {
                        updateDevice(device.id, { problemDescription: suggestion.slice(0, MAX_DESCRIPTION_LENGTH) });
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Bloques rápidos de redacción
                </p>
                <div className="flex flex-wrap gap-2">
                  {getQuickProblemClauses(device.deviceType, 7).map((clause) => (
                    <button
                      key={`${device.id}-clause-${clause.slice(0, 30)}`}
                      type="button"
                      className="text-xs px-2.5 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                      onClick={() => {
                        const nextValue = appendProblemText(device.problemDescription, clause);
                        updateDevice(device.id, {
                          problemDescription: nextValue.slice(0, MAX_DESCRIPTION_LENGTH),
                        });
                      }}
                    >
                      + {clause}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
              deviceType={device.deviceType}
              deviceModel={device.deviceModel}
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

      {/* Campo de Responsable con Autocompletado (solo para sucursales) */}
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
                  <div className="relative">
                    <input
                      type="text"
                      list="responsible-users-list"
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-light"
                      placeholder="Escribe o selecciona el nombre del responsable..."
                      value={responsibleUserName}
                      onChange={(e) => setResponsibleUserName(e.target.value)}
                      required
                    />
                    {responsibleUsers.length > 0 && (
                      <datalist id="responsible-users-list">
                        {responsibleUsers.map((user) => (
                          <option key={user.id} value={user.name} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  {loadingResponsibleUsers ? (
                    <p className="text-xs text-slate-500 mt-1">Cargando responsables...</p>
                  ) : responsibleUsers.length > 0 ? (
                    <p className="text-xs text-slate-600 mt-1">
                      💡 Puedes escribir el nombre o seleccionar de la lista. Si escribes un nombre que no está en la lista, se guardará igual.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">
                      💡 Escribe el nombre del responsable. Este campo es obligatorio.
                    </p>
                  )}
                  {!responsibleUserName && (
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
