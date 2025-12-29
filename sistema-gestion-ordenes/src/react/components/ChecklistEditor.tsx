import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DeviceChecklistItem } from "@/types";

const defaultDeviceTypes = [
  { value: 'iphone', label: 'iPhone' },
  { value: 'ipad', label: 'iPad' },
  { value: 'macbook', label: 'MacBook' },
  { value: 'apple_watch', label: 'Apple Watch' },
];

export default function ChecklistEditor() {
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, DeviceChecklistItem[]>>({});
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState<Array<{ value: string; label: string }>>(defaultDeviceTypes);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [editingItemName, setEditingItemName] = useState("");
  const [showNewDeviceTypeForm, setShowNewDeviceTypeForm] = useState(false);
  const [newDeviceTypeValue, setNewDeviceTypeValue] = useState("");
  const [newDeviceTypeLabel, setNewDeviceTypeLabel] = useState("");

  useEffect(() => {
    loadAllChecklists();
  }, []);

  async function loadAllChecklists() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("device_checklist_items")
        .select("*")
        .order("device_type")
        .order("item_order");

      if (error) throw error;

      if (data) {
        // Agrupar por device_type
        const grouped: Record<string, DeviceChecklistItem[]> = {};
        const uniqueTypes = new Set<string>();
        
        data.forEach((item) => {
          if (!grouped[item.device_type]) {
            grouped[item.device_type] = [];
          }
          grouped[item.device_type].push(item);
          uniqueTypes.add(item.device_type);
        });

        // Actualizar lista de tipos disponibles (incluyendo los personalizados)
        const knownTypes = new Set(defaultDeviceTypes.map(d => d.value));
        const customTypes = Array.from(uniqueTypes)
          .filter(type => !knownTypes.has(type))
          .map(type => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
          }));

        setAvailableDeviceTypes([...defaultDeviceTypes, ...customTypes]);
        setChecklists(grouped);
      }
    } catch (error: any) {
      console.error("Error cargando checklists:", error);
      alert(`Error al cargar checklists: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNewDeviceType() {
    if (!newDeviceTypeValue.trim() || !newDeviceTypeLabel.trim()) {
      alert("Por favor ingresa un valor y un nombre para el nuevo tipo de dispositivo");
      return;
    }

    // Normalizar el valor (minúsculas, sin espacios, usar guiones bajos)
    const normalizedValue = newDeviceTypeValue.trim().toLowerCase().replace(/\s+/g, '_');

    // Validar que el valor normalizado no esté vacío
    if (!normalizedValue) {
      alert("El valor del tipo de dispositivo no puede estar vacío");
      return;
    }

    // Verificar que no exista ya
    if (availableDeviceTypes.some(dt => dt.value === normalizedValue)) {
      alert("Este tipo de dispositivo ya existe");
      return;
    }

    setSaving(true);
    try {
      // Verificar que la base de datos permita este tipo probando con un insert temporal
      // (No insertamos nada, solo verificamos que no haya restricciones)
      // En realidad, el tipo se crea cuando agregas el primer item, así que solo agregamos a la lista local
      
      // Agregar el nuevo tipo a la lista
      const newType = {
        value: normalizedValue,
        label: newDeviceTypeLabel.trim()
      };
      
      setAvailableDeviceTypes([...availableDeviceTypes, newType]);
      setChecklists({
        ...checklists,
        [normalizedValue]: [] // Inicializar con lista vacía
      });
      
      setSelectedDeviceType(normalizedValue);
      setShowNewDeviceTypeForm(false);
      setNewDeviceTypeValue("");
      setNewDeviceTypeLabel("");
      
      alert(`Tipo de dispositivo "${newDeviceTypeLabel}" creado. Ahora puedes agregar items a su checklist.`);
    } catch (error: any) {
      console.error("Error agregando tipo de dispositivo:", error);
      alert(`Error al agregar tipo de dispositivo: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem() {
    if (!selectedDeviceType || !newItemName.trim()) {
      alert("Por favor selecciona un tipo de dispositivo e ingresa un nombre para el item");
      return;
    }

    setSaving(true);
    try {
      // Obtener el siguiente item_order
      const currentItems = checklists[selectedDeviceType] || [];
      const maxOrder = currentItems.length > 0 
        ? Math.max(...currentItems.map(item => item.item_order))
        : 0;

      const { error, data } = await supabase
        .from("device_checklist_items")
        .insert({
          device_type: selectedDeviceType,
          item_name: newItemName.trim(),
          item_order: maxOrder + 1,
        })
        .select();

      if (error) {
        // Si el error es por restricción CHECK, informar al usuario
        if (error.message.includes('check constraint') || error.message.includes('CHECK')) {
          alert(`Error: La base de datos aún tiene restricciones que impiden tipos personalizados.\n\nPor favor ejecuta el script SQL en Supabase:\n\nALTER TABLE device_checklist_items DROP CONSTRAINT IF EXISTS device_checklist_items_device_type_check;\n\nVer archivo: database/allow_custom_device_types.sql`);
        } else if (error.message.includes('unique constraint') || error.message.includes('UNIQUE')) {
          alert(`Este item ya existe para este tipo de dispositivo`);
        } else {
          throw error;
        }
        return;
      }

      if (data && data.length > 0) {
        console.log("Item agregado exitosamente:", data[0]);
      }

      setNewItemName("");
      await loadAllChecklists();
    } catch (error: any) {
      console.error("Error agregando item:", error);
      alert(`Error al agregar item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateItem(itemId: string, newName: string) {
    if (!newName.trim()) {
      alert("El nombre del item no puede estar vacío");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("device_checklist_items")
        .update({ item_name: newName.trim() })
        .eq("id", itemId);

      if (error) throw error;

      setEditingItem(null);
      await loadAllChecklists();
    } catch (error: any) {
      console.error("Error actualizando item:", error);
      alert(`Error al actualizar item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este item del checklist?")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("device_checklist_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await loadAllChecklists();
    } catch (error: any) {
      console.error("Error eliminando item:", error);
      alert(`Error al eliminar item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item: DeviceChecklistItem) {
    setEditingItem(item.id);
    setEditingItemName(item.item_name);
  }

  function cancelEditing() {
    setEditingItem(null);
    setEditingItemName("");
  }

  if (loading) {
    return (
      <div className="border-b border-slate-200 pb-6">
        <p className="text-slate-600">Cargando checklists...</p>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 pb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Checklists por Dispositivo</h3>

      {/* Selector de tipo de dispositivo */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Selecciona un tipo de dispositivo para editar su checklist:
          </label>
          <button
            onClick={() => setShowNewDeviceTypeForm(!showNewDeviceTypeForm)}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            + Nuevo Tipo
          </button>
        </div>

        {/* Formulario para nuevo tipo de dispositivo */}
        {showNewDeviceTypeForm && (
          <div className="mb-4 p-4 bg-slate-50 rounded-md border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Agregar Nuevo Tipo de Dispositivo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Valor (se usará internamente, ej: parlante, auriculares)
                </label>
                <input
                  type="text"
                  value={newDeviceTypeValue}
                  onChange={(e) => setNewDeviceTypeValue(e.target.value)}
                  placeholder="parlante"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre para mostrar (ej: Parlante, Auriculares)
                </label>
                <input
                  type="text"
                  value={newDeviceTypeLabel}
                  onChange={(e) => setNewDeviceTypeLabel(e.target.value)}
                  placeholder="Parlante"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddNewDeviceType}
                disabled={saving || !newDeviceTypeValue.trim() || !newDeviceTypeLabel.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
              >
                Crear Tipo
              </button>
              <button
                onClick={() => {
                  setShowNewDeviceTypeForm(false);
                  setNewDeviceTypeValue("");
                  setNewDeviceTypeLabel("");
                }}
                className="px-4 py-2 bg-slate-400 text-white rounded-md hover:bg-slate-500 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableDeviceTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedDeviceType(value)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedDeviceType === value
                  ? "bg-brand-light text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de items del checklist seleccionado */}
      {selectedDeviceType && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-slate-800 mb-4">
            Checklist de {availableDeviceTypes.find(d => d.value === selectedDeviceType)?.label || selectedDeviceType}
          </h4>

          {/* Lista de items existentes */}
          <div className="space-y-2 mb-4">
            {(checklists[selectedDeviceType] || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-200"
              >
                {editingItem === item.id ? (
                  <>
                    <input
                      type="text"
                      value={editingItemName}
                      onChange={(e) => setEditingItemName(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-md px-3 py-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateItem(item.id, editingItemName);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateItem(item.id, editingItemName)}
                      disabled={saving}
                      className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="px-3 py-2 bg-slate-400 text-white rounded-md hover:bg-slate-500 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-slate-700">{item.item_name}</span>
                    <button
                      onClick={() => startEditing(item)}
                      disabled={saving}
                      className="px-3 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={saving}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-sm"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Agregar nuevo item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nombre del nuevo item..."
              className="flex-1 border border-slate-300 rounded-md px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddItem();
                }
              }}
            />
            <button
              onClick={handleAddItem}
              disabled={saving || !newItemName.trim()}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              + Agregar Item
            </button>
          </div>

          {checklists[selectedDeviceType]?.length === 0 && (
            <p className="text-sm text-slate-500 mt-4">
              No hay items en este checklist. Agrega el primero arriba.
            </p>
          )}
        </div>
      )}

      {!selectedDeviceType && (
        <p className="text-sm text-slate-500 mt-4">
          Selecciona un tipo de dispositivo arriba para ver y editar su checklist.
        </p>
      )}
    </div>
  );
}

