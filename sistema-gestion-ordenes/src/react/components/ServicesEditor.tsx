import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types";

export default function ServicesEditor() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  
  // Formulario para nuevo servicio
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<number>(0);
  
  // Formulario para editar servicio
  const [editingServiceName, setEditingServiceName] = useState("");
  const [editingServiceDescription, setEditingServiceDescription] = useState("");
  const [editingServicePrice, setEditingServicePrice] = useState<number>(0);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setServices(data);
      }
    } catch (error: any) {
      console.error("Error cargando servicios:", error);
      alert(`Error al cargar servicios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddService() {
    if (!newServiceName.trim()) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          name: newServiceName.trim(),
          description: newServiceDescription.trim() || null,
          default_price: newServicePrice || 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setServices([...services, data].sort((a, b) => a.name.localeCompare(b.name)));
        // Resetear formulario
        setNewServiceName("");
        setNewServiceDescription("");
        setNewServicePrice(0);
        setShowNewServiceForm(false);
        alert("Servicio agregado exitosamente");
      }
    } catch (error: any) {
      console.error("Error agregando servicio:", error);
      alert(`Error al agregar servicio: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function startEditService(service: Service) {
    setEditingService(service.id);
    setEditingServiceName(service.name);
    setEditingServiceDescription(service.description || "");
    setEditingServicePrice(service.default_price || 0);
  }

  function cancelEdit() {
    setEditingService(null);
    setEditingServiceName("");
    setEditingServiceDescription("");
    setEditingServicePrice(0);
  }

  async function handleUpdateService(serviceId: string) {
    if (!editingServiceName.trim()) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: editingServiceName.trim(),
          description: editingServiceDescription.trim() || null,
          default_price: editingServicePrice || 0,
        })
        .eq("id", serviceId);

      if (error) throw error;

      // Actualizar en el estado local
      setServices(
        services
          .map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  name: editingServiceName.trim(),
                  description: editingServiceDescription.trim() || null,
                  default_price: editingServicePrice || 0,
                }
              : s
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      cancelEdit();
      alert("Servicio actualizado exitosamente");
    } catch (error: any) {
      console.error("Error actualizando servicio:", error);
      alert(`Error al actualizar servicio: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(serviceId: string, serviceName: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio "${serviceName}"?`)) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);

      if (error) throw error;

      setServices(services.filter((s) => s.id !== serviceId));
      alert("Servicio eliminado exitosamente");
    } catch (error: any) {
      console.error("Error eliminando servicio:", error);
      alert(`Error al eliminar servicio: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="border-b border-slate-200 pb-6">
        <p className="text-slate-600">Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Gestión de Servicios</h3>
        <button
          onClick={() => setShowNewServiceForm(!showNewServiceForm)}
          className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark"
        >
          {showNewServiceForm ? "✕ Cancelar" : "+ Agregar Servicio"}
        </button>
      </div>

      {/* Formulario para nuevo servicio */}
      {showNewServiceForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-md font-semibold text-slate-900 mb-3">Nuevo Servicio</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del Servicio *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Ej: Cambio de pantalla"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                rows={2}
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                placeholder="Ej: Reemplazo completo de pantalla con garantía"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Precio por Defecto (CLP)
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="1000"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddService}
                disabled={saving || !newServiceName.trim()}
                className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Agregar Servicio"}
              </button>
              <button
                onClick={() => {
                  setShowNewServiceForm(false);
                  setNewServiceName("");
                  setNewServiceDescription("");
                  setNewServicePrice(0);
                }}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de servicios */}
      <div className="space-y-3">
        {services.length === 0 ? (
          <p className="text-slate-600 text-center py-4">No hay servicios registrados</p>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className="p-4 bg-slate-50 rounded-lg border border-slate-200"
            >
              {editingService === service.id ? (
                // Modo edición
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre del Servicio *
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={editingServiceName}
                      onChange={(e) => setEditingServiceName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      rows={2}
                      value={editingServiceDescription}
                      onChange={(e) => setEditingServiceDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Precio por Defecto (CLP)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={editingServicePrice}
                      onChange={(e) => setEditingServicePrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateService(service.id)}
                      disabled={saving || !editingServiceName.trim()}
                      className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{service.name}</h4>
                    {service.description ? (
                      <p className="text-sm text-slate-600 mb-2">{service.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic mb-2">Sin descripción</p>
                    )}
                    <p className="text-sm text-slate-700">
                      Precio por defecto:{" "}
                      <span className="font-semibold">
                        {new Intl.NumberFormat("es-CL", {
                          style: "currency",
                          currency: "CLP",
                        }).format(service.default_price || 0)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEditService(service)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id, service.name)}
                      disabled={saving}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Los servicios aquí configurados estarán disponibles para todas las sucursales.
      </p>
    </div>
  );
}
