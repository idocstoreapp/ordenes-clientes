import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DeviceChecklistItem as ChecklistItem, DeviceType } from "@/types";

interface DeviceChecklistProps {
  deviceType: DeviceType;
  checklistData: Record<string, string>;
  onChecklistChange: (data: Record<string, string>) => void;
}

function getDefaultStatusOptions() {
  return [
    { value: "ok", label: "✓ Funcionando" },
    { value: "damaged", label: "⚠ Dañado" },
    { value: "replaced", label: "♻ Reparado" },
    { value: "no_probado", label: "✗ No probado" },
  ];
}

function formatStatusLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DeviceChecklist({
  deviceType,
  checklistData,
  onChecklistChange,
}: DeviceChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustomItemName, setNewCustomItemName] = useState("");

  useEffect(() => {
    async function loadChecklist() {
      setLoading(true);
      const { data } = await supabase
        .from("device_checklist_items")
        .select("*")
        .eq("device_type", deviceType)
        .order("item_order");

      if (data) {
        setItems(data);
        // Si no hay items en la BD pero hay items personalizados en checklistData, mantenerlos
        if (data.length === 0 && Object.keys(checklistData).length > 0) {
          setCustomItems(Object.keys(checklistData));
        }
      }
      setLoading(false);
    }

    loadChecklist();
  }, [deviceType]);

  function handleItemChange(itemName: string, value: string) {
    if (value === "") return; // No permitir valores vacíos
    onChecklistChange({
      ...checklistData,
      [itemName]: value,
    });
  }

  function handleAddCustomItem() {
    if (!newCustomItemName.trim()) {
      alert("Por favor ingresa un nombre para el item");
      return;
    }
    
    if (customItems.includes(newCustomItemName.trim())) {
      alert("Este item ya existe");
      return;
    }

    setCustomItems([...customItems, newCustomItemName.trim()]);
    setNewCustomItemName("");
  }

  function handleRemoveCustomItem(itemName: string) {
    setCustomItems(customItems.filter(item => item !== itemName));
    const newChecklistData = { ...checklistData };
    delete newChecklistData[itemName];
    onChecklistChange(newChecklistData);
  }

  // Combinar items de BD y items personalizados
  const allItems = [
    ...items.map(item => item.item_name),
    ...customItems.filter(item => !items.some(dbItem => dbItem.item_name === item))
  ];

  function getStatusOptionsForItem(itemName: string) {
    const itemFromDb = items.find((item) => item.item_name === itemName);
    const statusOptionsFromDb = Array.isArray(itemFromDb?.status_options)
      ? (itemFromDb?.status_options || []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())
      : [];

    const optionValues = statusOptionsFromDb.length > 0
      ? statusOptionsFromDb
      : getDefaultStatusOptions().map((option) => option.value);

    const currentValue = checklistData[itemName];
    if (currentValue && !optionValues.includes(currentValue)) {
      optionValues.push(currentValue);
    }

    return optionValues.map((value) => {
      const defaultOption = getDefaultStatusOptions().find((option) => option.value === value);
      return {
        value,
        label: defaultOption?.label || formatStatusLabel(value),
      };
    });
  }

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-md p-4">
        <p className="text-slate-600">Cargando checklist...</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-md p-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Checklist de Verificación *</h3>
      
      {items.length === 0 && customItems.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-2">
            No hay checklist configurado para este tipo de dispositivo. Puedes crear items personalizados abajo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {allItems.map((itemName) => {
          const isCustom = customItems.includes(itemName) && !items.some(item => item.item_name === itemName);
          return (
            <div key={itemName} className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-slate-700">{itemName}</span>
                {isCustom && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Personalizado</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={checklistData[itemName] || ""}
                  onChange={(e) =>
                    handleItemChange(itemName, e.target.value)
                  }
                  required
                >
                  <option value="">Seleccionar</option>
                  {getStatusOptionsForItem(itemName).map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
                {isCustom && (
                  <button
                    onClick={() => handleRemoveCustomItem(itemName)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agregar item personalizado */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
        <input
          type="text"
          value={newCustomItemName}
          onChange={(e) => setNewCustomItemName(e.target.value)}
          placeholder="Nombre del nuevo item..."
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddCustomItem();
            }
          }}
        />
        <button
          onClick={handleAddCustomItem}
          type="button"
          className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark text-sm"
        >
          + Agregar Item
        </button>
      </div>
    </div>
  );
}
