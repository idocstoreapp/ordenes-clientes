import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types";

interface ServiceSelectorProps {
  selectedServices: Service[];
  onServicesChange: (services: Service[]) => void;
}

export default function ServiceSelector({ selectedServices, onServicesChange }: ServiceSelectorProps) {
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function loadServices() {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setAvailableServices(data);
  }

  const filteredServices = availableServices.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedServices.find((s) => s.id === service.id)
  );

  function handleServiceSelect(service: Service) {
    onServicesChange([...selectedServices, service]);
    setSearchTerm("");
    setShowResults(false);
    if (inputRef.current) inputRef.current.focus();
  }

  async function handleCreateService(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newServiceName.trim()) {
      alert("Por favor ingresa un nombre para el servicio");
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
        // Agregar el nuevo servicio a los servicios seleccionados
        handleServiceSelect(data);
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

      {showResults && searchTerm && filteredServices.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredServices.map((service) => (
            <button
              key={service.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              onClick={() => handleServiceSelect(service)}
            >
              <p className="font-medium text-slate-900">{service.name}</p>
              {service.description && (
                <p className="text-sm text-slate-600">{service.description}</p>
              )}
            </button>
          ))}
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



