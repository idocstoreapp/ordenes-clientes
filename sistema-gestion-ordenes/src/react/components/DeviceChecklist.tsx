import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DeviceChecklistItem as ChecklistItem, DeviceType } from "@/types";

interface DeviceChecklistProps {
  deviceType: DeviceType;
  checklistData: Record<string, "ok" | "damaged" | "replaced" | "no_probado">;
  onChecklistChange: (data: Record<string, "ok" | "damaged" | "replaced" | "no_probado">) => void;
}

export default function DeviceChecklist({
  deviceType,
  checklistData,
  onChecklistChange,
}: DeviceChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        // NO inicializar con valores por defecto - deben estar vacíos para que el usuario seleccione
      }
      setLoading(false);
    }

    loadChecklist();
  }, [deviceType]);

  function handleItemChange(itemName: string, value: "ok" | "damaged" | "replaced" | "no_probado" | "") {
    if (value === "") return; // No permitir valores vacíos
    onChecklistChange({
      ...checklistData,
      [itemName]: value as "ok" | "damaged" | "replaced" | "no_probado",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
            <span className="text-sm font-medium text-slate-700">{item.item_name}</span>
            <select
              className="ml-4 border border-slate-300 rounded-md px-2 py-1 text-sm"
              value={checklistData[item.item_name] || ""}
              onChange={(e) =>
                handleItemChange(item.item_name, e.target.value as "ok" | "damaged" | "replaced" | "no_probado" | "")
              }
              required
            >
              <option value="">Seleccionar</option>
              <option value="ok">✓ OK</option>
              <option value="damaged">⚠ Dañado</option>
              <option value="replaced">♻ Reparado</option>
              <option value="no_probado">✗ No probado</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}



