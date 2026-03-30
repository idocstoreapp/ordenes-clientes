import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DeviceChecklistItem as ChecklistItem, DeviceType } from "@/types";

interface DeviceChecklistProps {
  deviceType: DeviceType;
  checklistData: Record<string, string>;
  onChecklistChange: (data: Record<string, string>) => void;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: "ok", label: "✓ Funcionando" },
  { value: "damaged", label: "⚠ Dañado" },
  { value: "replaced", label: "♻ Reparado" },
  { value: "no_probado", label: "✗ No probado" },
];

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
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [newCustomStatus, setNewCustomStatus] = useState("");

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

  useEffect(() => {
    const key = `device-checklist-statuses:${deviceType}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setCustomStatuses([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCustomStatuses(parsed.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()));
      }
    } catch {
      setCustomStatuses([]);
    }
  }, [deviceType]);

  function saveCustomStatuses(statuses: string[]) {
    const key = `device-checklist-statuses:${deviceType}`;
    localStorage.setItem(key, JSON.stringify(statuses));
  }

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

  function handleAddCustomStatus() {
    const value = newCustomStatus.trim();
    if (!value) {
      alert("Ingresa un estado personalizado");
      return;
    }
    const duplicated = [...DEFAULT_STATUS_OPTIONS.map((option) => option.value), ...customStatuses]
      .some((option) => option.toLowerCase() === value.toLowerCase());
    if (duplicated) {
      alert("Ese estado ya existe");
      return;
    }
    const next = [...customStatuses, value];
    setCustomStatuses(next);
    saveCustomStatuses(next);
    setNewCustomStatus("");
  }

  function handleRemoveCustomStatus(statusValue: string) {
    const next = customStatuses.filter((status) => status !== statusValue);
    setCustomStatuses(next);
    saveCustomStatuses(next);
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
      : DEFAULT_STATUS_OPTIONS.map((option) => option.value);

    const currentValue = checklistData[itemName];
    if (currentValue && !optionValues.includes(currentValue)) {
      optionValues.push(currentValue);
    }

    return optionValues.map((value) => {
      const defaultOption = DEFAULT_STATUS_OPTIONS.find((option) => option.value === value);
      return {
        value,
        label: defaultOption?.label || formatStatusLabel(value),
      };
    });
  }

  function getStatusButtonClass(value: string, isSelected: boolean): string {
    const base = "rounded-lg border px-2 py-1.5 text-xs font-semibold transition";
    if (!isSelected) {
      return `${base} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`;
    }
    if (value === "ok") return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    if (value === "damaged") return `${base} border-rose-200 bg-rose-50 text-rose-700`;
    if (value === "replaced") return `${base} border-blue-200 bg-blue-50 text-blue-700`;
    return `${base} border-amber-200 bg-amber-50 text-amber-700`;
  }

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-md p-4">
        <p className="text-slate-600">Cargando checklist...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Checklist de Verificación *</h3>
      
      {items.length === 0 && customItems.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-2">
            No hay checklist configurado para este tipo de dispositivo. Puedes crear items personalizados abajo.
          </p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {allItems.map((itemName) => {
          const isCustom = customItems.includes(itemName) && !items.some(item => item.item_name === itemName);
          const selectedValue = checklistData[itemName] || "";
          const statusOptions = getStatusOptionsForItem(itemName);
          return (
            <div key={itemName} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-700">{itemName}</span>
                {isCustom && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Personalizado</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {statusOptions.map((statusOption) => {
                  const isSelected = selectedValue === statusOption.value;
                  return (
                    <button
                      key={statusOption.value}
                      type="button"
                      className={getStatusButtonClass(statusOption.value, isSelected)}
                      aria-pressed={isSelected}
                      onClick={() => handleItemChange(itemName, statusOption.value)}
                    >
                      {statusOption.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {selectedValue ? formatStatusLabel(selectedValue) : "Selecciona un estado"}
                </span>
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

      {/* Estados personalizados */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-2">
          Estados personalizados para checklist de <span className="font-semibold">{deviceType}</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCustomStatus}
            onChange={(e) => setNewCustomStatus(e.target.value)}
            placeholder="Ej: Chip entregado"
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomStatus();
              }
            }}
          />
          <button
            onClick={handleAddCustomStatus}
            type="button"
            className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 text-sm"
          >
            + Agregar Estado
          </button>
        </div>

        {customStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customStatuses.map((status) => (
              <span key={status} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                {status}
                <button
                  type="button"
                  onClick={() => handleRemoveCustomStatus(status)}
                  className="text-red-600 hover:text-red-700"
                  title="Eliminar estado"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
