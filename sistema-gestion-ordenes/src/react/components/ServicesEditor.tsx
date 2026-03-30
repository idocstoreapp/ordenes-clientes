import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types";

export default function ServicesEditor() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<number>(0);
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [newServiceImageUrl, setNewServiceImageUrl] = useState("");
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState("");

  const [editingServiceName, setEditingServiceName] = useState("");
  const [editingServiceDescription, setEditingServiceDescription] = useState("");
  const [editingServicePrice, setEditingServicePrice] = useState<number>(0);
  const [editingServiceCategory, setEditingServiceCategory] = useState("");
  const [editingServiceImageUrl, setEditingServiceImageUrl] = useState("");
  const [editingCategoryImageUrl, setEditingCategoryImageUrl] = useState("");

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
      if (data) setServices(data as Service[]);
    } catch (error: any) {
      console.error("Error cargando servicios:", error);
      alert(`Error al cargar servicios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddService() {
    if (!newServiceName.trim()) return alert("Por favor ingresa un nombre para el servicio");

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          name: newServiceName.trim(),
          description: newServiceDescription.trim() || null,
          default_price: newServicePrice || 0,
          category: newServiceCategory.trim() || null,
          image_url: newServiceImageUrl.trim() || null,
          category_image_url: newCategoryImageUrl.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setServices([...services, data as Service].sort((a, b) => a.name.localeCompare(b.name)));
        setNewServiceName("");
        setNewServiceDescription("");
        setNewServicePrice(0);
        setNewServiceCategory("");
        setNewServiceImageUrl("");
        setNewCategoryImageUrl("");
        setShowNewServiceForm(false);
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
    setEditingServiceCategory(service.category || "");
    setEditingServiceImageUrl(service.image_url || "");
    setEditingCategoryImageUrl(service.category_image_url || "");
  }

  function cancelEdit() {
    setEditingService(null);
    setEditingServiceName("");
    setEditingServiceDescription("");
    setEditingServicePrice(0);
    setEditingServiceCategory("");
    setEditingServiceImageUrl("");
    setEditingCategoryImageUrl("");
  }

  async function handleUpdateService(serviceId: string) {
    if (!editingServiceName.trim()) return alert("Por favor ingresa un nombre para el servicio");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: editingServiceName.trim(),
          description: editingServiceDescription.trim() || null,
          default_price: editingServicePrice || 0,
          category: editingServiceCategory.trim() || null,
          image_url: editingServiceImageUrl.trim() || null,
          category_image_url: editingCategoryImageUrl.trim() || null,
        })
        .eq("id", serviceId);

      if (error) throw error;

      setServices(
        services.map((s) =>
          s.id === serviceId
            ? {
                ...s,
                name: editingServiceName.trim(),
                description: editingServiceDescription.trim() || null,
                default_price: editingServicePrice || 0,
                category: editingServiceCategory.trim() || null,
                image_url: editingServiceImageUrl.trim() || null,
                category_image_url: editingCategoryImageUrl.trim() || null,
              }
            : s
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      cancelEdit();
    } catch (error: any) {
      console.error("Error actualizando servicio:", error);
      alert(`Error al actualizar servicio: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(serviceId: string, serviceName: string) {
    if (!confirm(`¿Eliminar servicio "${serviceName}"?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      if (error) throw error;
      setServices(services.filter((s) => s.id !== serviceId));
    } catch (error: any) {
      console.error("Error eliminando servicio:", error);
      alert(`Error al eliminar servicio: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="border-b border-slate-200 pb-6"><p className="text-slate-600">Cargando servicios...</p></div>;

  return (
    <div className="border-b border-slate-200 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Gestión de Servicios</h3>
        <button onClick={() => setShowNewServiceForm(!showNewServiceForm)} className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark">
          {showNewServiceForm ? "✕ Cancelar" : "+ Agregar Servicio"}
        </button>
      </div>

      {showNewServiceForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Nombre del servicio" />
          <textarea className="w-full border border-slate-300 rounded-md px-3 py-2" rows={2} value={newServiceDescription} onChange={(e) => setNewServiceDescription(e.target.value)} placeholder="Descripción" />
          <input type="number" className="w-full border border-slate-300 rounded-md px-3 py-2" value={newServicePrice} onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)} placeholder="Precio" min="0" />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={newServiceCategory} onChange={(e) => setNewServiceCategory(e.target.value)} placeholder="Categoría (ej: Pantalla, Batería)" />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={newServiceImageUrl} onChange={(e) => setNewServiceImageUrl(e.target.value)} placeholder="URL imagen del servicio" />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={newCategoryImageUrl} onChange={(e) => setNewCategoryImageUrl(e.target.value)} placeholder="URL imagen de la categoría" />
          <div className="flex gap-2">
            <button onClick={handleAddService} disabled={saving || !newServiceName.trim()} className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50">{saving ? "Guardando..." : "Agregar Servicio"}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {services.length === 0 ? (
          <p className="text-slate-600 text-center py-4">No hay servicios registrados</p>
        ) : services.map((service) => (
          <div key={service.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            {editingService === service.id ? (
              <div className="space-y-2">
                <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={editingServiceName} onChange={(e) => setEditingServiceName(e.target.value)} />
                <textarea className="w-full border border-slate-300 rounded-md px-3 py-2" rows={2} value={editingServiceDescription} onChange={(e) => setEditingServiceDescription(e.target.value)} />
                <input type="number" className="w-full border border-slate-300 rounded-md px-3 py-2" value={editingServicePrice} onChange={(e) => setEditingServicePrice(parseFloat(e.target.value) || 0)} min="0" />
                <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={editingServiceCategory} onChange={(e) => setEditingServiceCategory(e.target.value)} placeholder="Categoría" />
                <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={editingServiceImageUrl} onChange={(e) => setEditingServiceImageUrl(e.target.value)} placeholder="URL imagen servicio" />
                <input className="w-full border border-slate-300 rounded-md px-3 py-2" value={editingCategoryImageUrl} onChange={(e) => setEditingCategoryImageUrl(e.target.value)} placeholder="URL imagen categoría" />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateService(service.id)} disabled={saving} className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50">Guardar</button>
                  <button onClick={cancelEdit} className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{service.name}</h4>
                    {service.category && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{service.category}</span>}
                  </div>
                  {service.description && <p className="text-sm text-slate-600">{service.description}</p>}
                  <p className="text-sm font-medium text-brand-light">Precio: ${service.default_price?.toLocaleString("es-CL") || "0"}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {service.image_url && <img src={service.image_url} alt={service.name} className="h-16 w-full rounded-md object-cover border border-slate-200" />}
                    {service.category_image_url && <img src={service.category_image_url} alt={`${service.category || "categoría"} imagen`} className="h-16 w-full rounded-md object-cover border border-slate-200" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditService(service)} className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark">Editar</button>
                  <button onClick={() => handleDeleteService(service.id, service.name)} disabled={saving} className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">Eliminar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
