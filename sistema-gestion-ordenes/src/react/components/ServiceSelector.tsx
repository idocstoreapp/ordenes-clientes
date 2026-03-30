import { useState, useEffect, useRef, type MouseEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types";
import { getRecommendedServices } from "@/lib/deviceWizardData";

interface ServiceSelectorProps {
  selectedServices: Service[];
  onServicesChange: (services: Service[]) => void;
  deviceType?: string | null;
  deviceModel?: string;
}

export default function ServiceSelector({ selectedServices, onServicesChange, deviceType = null, deviceModel = "" }: ServiceSelectorProps) {
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedCategory(null);
  }, [deviceType, deviceModel]);

  async function loadServices() {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setAvailableServices(data);
  }

  const filteredServices = availableServices.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedServices.find((s) => s.id === service.id)
  );
  const recommendedServices = getRecommendedServices(availableServices, {
    deviceType,
    deviceModel,
    selectedServiceIds: selectedServices.map((service) => service.id),
  });

  const hasSelectedDevice = Boolean(deviceType && deviceModel.trim());
  const serviceCategories = [
    { key: "pantalla", label: "Pantalla", icon: "🖥️", pattern: /pantalla|glass|tactil/i },
    { key: "bateria", label: "Batería", icon: "🔋", pattern: /bateria|batería/i },
    { key: "camara", label: "Cámara", icon: "📷", pattern: /camara|cámara|face id/i },
    { key: "carga", label: "Carga", icon: "🔌", pattern: /carga|conector|pin|base/i },
    { key: "software", label: "Software", icon: "🧠", pattern: /software|reseteo|google|frp|actualización|actualizacion|virus/i },
    { key: "mantenimiento", label: "Mantención", icon: "🧰", pattern: /limpieza|mantencion|manten|diagnostico|diagnóstico|baño quimico/i },
    { key: "placa", label: "Placa", icon: "🧩", pattern: /placa|fpc|sensores|sim|flex/i },
    { key: "otros", label: "Otros", icon: "⚙️", pattern: /.*/i },
  ];

  const servicesByCategory = serviceCategories.map((category) => ({
    ...category,
    services: availableServices.filter((service) => category.pattern.test(service.name) && !selectedServices.some((s) => s.id === service.id)),
  }));

  const selectedCategoryData = servicesByCategory.find((category) => category.key === selectedCategory);

  function handleServiceSelect(service: Service) {
    // Validar que el servicio no esté ya en la lista (protección contra duplicados)
    if (selectedServices.find((s) => s.id === service.id)) {
      console.warn(`[ServiceSelector] Servicio ${service.name} (${service.id}) ya está en la lista. Ignorando duplicado.`);
      setSearchTerm("");
      setShowResults(false);
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    // Agregar el servicio solo si no está duplicado
    onServicesChange([...selectedServices, service]);
    setSearchTerm("");
    setShowResults(false);
    if (inputRef.current) inputRef.current.focus();
  }

  async function handleCreateService(e?: MouseEvent<HTMLButtonElement>) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newServiceName.trim()) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    // Protección contra múltiples llamadas simultáneas
    if (loading) {
      console.warn("[ServiceSelector] handleCreateService ya está en ejecución. Ignorando llamada duplicada.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          name: newServiceName.trim(),
          description: null,
          default_price: 0, // Precio por defecto (se puede editar después)
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          alert("Ya existe un servicio con ese nombre");
        } else {
          alert(`Error: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data) {
        // Recargar la lista de servicios disponibles
        await loadServices();
        
        // Validar que el servicio no esté ya en la lista antes de agregarlo
        if (!selectedServices.find((s) => s.id === data.id)) {
          // Agregar el nuevo servicio a los servicios seleccionados
          handleServiceSelect(data);
        } else {
          console.warn(`[ServiceSelector] El servicio ${data.name} (${data.id}) ya está en la lista. No se agregará duplicado.`);
        }
        
        // Limpiar el formulario
        setNewServiceName("");
        setShowNewServiceForm(false);
        setSearchTerm(""); // Limpiar el término de búsqueda
        setShowResults(false); // Ocultar resultados
      }
    } catch (error: any) {
      console.error("Error creando servicio:", error);
      alert(`Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border border-slate-300 rounded-md px-3 py-2"
          placeholder="Buscar o escribir nombre de servicio..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            if (searchTerm) setShowResults(true);
          }}
        />
        <button
          type="button"
          onClick={() => setShowNewServiceForm(true)}
          className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark whitespace-nowrap"
        >
          + Nuevo
        </button>
      </div>

      {!hasSelectedDevice && (
        <div className="mb-3 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          ¿Servicios para qué dispositivo? Primero selecciona tipo y modelo en el asistente de dispositivo.
        </div>
      )}

      {hasSelectedDevice && (
        <div className="mb-3 p-3 rounded-md border border-slate-200 bg-slate-50">
          {!selectedCategory && (
            <>
              <p className="text-xs font-semibold text-slate-700 mb-2">¿Qué tipo de servicio necesitas?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {servicesByCategory
                  .filter((category) => category.services.length > 0)
                  .map((category) => (
                    <button
                      key={`category-${category.key}`}
                      type="button"
                      onClick={() => setSelectedCategory(category.key)}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs hover:bg-slate-100 text-left"
                    >
                      <p className="font-semibold">{category.icon} {category.label}</p>
                      <p className="text-[11px] opacity-80">{category.services.length} opciones</p>
                    </button>
                  ))}
              </div>
            </>
          )}

          {selectedCategory && selectedCategoryData && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700">
                  Servicios disponibles: {selectedCategoryData.icon} {selectedCategoryData.label}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs underline text-slate-600"
                >
                  Cambiar tipo
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryData.services.slice(0, 25).map((service) => (
                  <button
                    key={`category-service-${service.id}`}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs hover:bg-emerald-100"
                  >
                    + {service.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {hasSelectedDevice && recommendedServices.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">Sugeridos para este equipo</p>
          <div className="flex flex-wrap gap-2">
            {recommendedServices.map((service) => (
              <button
                key={`recommended-${service.id}`}
                type="button"
                onClick={() => handleServiceSelect(service)}
                className="px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
              >
                + {service.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showResults && searchTerm && filteredServices.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredServices.map((service) => {
            // Verificar si el servicio ya está seleccionado (protección adicional)
            const isAlreadySelected = selectedServices.some(s => s.id === service.id);
            
            return (
              <button
                key={service.id}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (!isAlreadySelected) {
                    handleServiceSelect(service);
                  }
                }}
                disabled={isAlreadySelected}
              >
                <p className="font-medium text-slate-900">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-slate-600">{service.description}</p>
                )}
                {isAlreadySelected && (
                  <p className="text-xs text-slate-400 italic">Ya agregado</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showResults && searchTerm && filteredServices.length === 0 && !showNewServiceForm && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-4">
          <p className="text-slate-600 text-center mb-2">No se encontró el servicio</p>
          <button
            type="button"
            onClick={() => {
              setNewServiceName(searchTerm);
              setShowNewServiceForm(true);
              setShowResults(false);
            }}
            className="w-full px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
          >
            Crear "{searchTerm}"
          </button>
        </div>
      )}

      {showNewServiceForm && (
        <div className="mb-4 p-4 border border-slate-200 rounded-md bg-slate-50">
          <h4 className="font-semibold text-slate-900 mb-2">Nuevo Servicio</h4>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-slate-300 rounded-md px-3 py-2"
              placeholder="Nombre del servicio"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateService();
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateService}
              disabled={loading}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewServiceForm(false);
                setNewServiceName("");
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {selectedServices.map((service) => (
          <div key={service.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
            <span className="font-medium text-slate-900">{service.name}</span>
            <button
              type="button"
              onClick={() => onServicesChange(selectedServices.filter((s) => s.id !== service.id))}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
