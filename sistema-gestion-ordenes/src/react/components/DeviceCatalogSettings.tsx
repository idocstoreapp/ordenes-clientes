import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CatalogLevel = "type" | "brand" | "line" | "model" | "variant";

interface DeviceCatalogItem {
  id: string;
  parent_id: string | null;
  level: CatalogLevel;
  type_key: string | null;
  item_key: string;
  label: string;
  description: string | null;
  image_url: string | null;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const LEVELS: Array<{ value: CatalogLevel; label: string }> = [
  { value: "type", label: "Tipo" },
  { value: "brand", label: "Marca" },
  { value: "line", label: "Línea" },
  { value: "model", label: "Modelo" },
  { value: "variant", label: "Variante" },
];

const TYPE_KEY_OPTIONS = [
  { value: "iphone", label: "Celular" },
  { value: "ipad", label: "Tablet" },
  { value: "macbook", label: "Notebook" },
  { value: "apple_watch", label: "Smartwatch" },
];

export default function DeviceCatalogSettings() {
  const [items, setItems] = useState<DeviceCatalogItem[]>([]);
  const [activeLevel, setActiveLevel] = useState<CatalogLevel>("type");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    parent_id: "",
    type_key: "iphone",
    item_key: "",
    label: "",
    description: "",
    image_url: "",
    logo_url: "",
    sort_order: 0,
    is_active: true,
  });
  const [drafts, setDrafts] = useState<Record<string, Partial<DeviceCatalogItem>>>({});
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string>("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("device_catalog_items")
      .select("*")
      .order("level")
      .order("sort_order")
      .order("label");

    if (error) {
      alert(`Error cargando catálogo: ${error.message}`);
      setLoading(false);
      return;
    }
    setItems((data as DeviceCatalogItem[]) ?? []);
    const nextDrafts: Record<string, Partial<DeviceCatalogItem>> = {};
    (data as DeviceCatalogItem[]).forEach((item) => {
      nextDrafts[item.id] = { ...item };
    });
    setDrafts(nextDrafts);
    setLoading(false);
  }

  const parentCandidates = useMemo(() => {
    const parentLevelByLevel: Record<CatalogLevel, CatalogLevel | null> = {
      type: null,
      brand: "type",
      line: "brand",
      model: "line",
      variant: "model",
    };
    const parentLevel = parentLevelByLevel[activeLevel];
    if (!parentLevel) return [];
    return items.filter((item) => item.level === parentLevel);
  }, [items, activeLevel]);

  const visibleItems = useMemo(
    () => {
      const byLevel = items.filter((item) => item.level === activeLevel);
      if (activeLevel === "type") return byLevel;
      if (activeLevel === "brand" && selectedTypeId) return byLevel.filter((item) => item.parent_id === selectedTypeId);
      if (activeLevel === "line" && selectedBrandId) return byLevel.filter((item) => item.parent_id === selectedBrandId);
      if (activeLevel === "model" && selectedLineId) return byLevel.filter((item) => item.parent_id === selectedLineId);
      if (activeLevel === "variant") {
        const modelScope = selectedLineId
          ? items.filter((item) => item.level === "model" && item.parent_id === selectedLineId).map((item) => item.id)
          : [];
        return modelScope.length > 0 ? byLevel.filter((item) => item.parent_id && modelScope.includes(item.parent_id)) : byLevel;
      }
      return byLevel;
    },
    [items, activeLevel, selectedTypeId, selectedBrandId, selectedLineId]
  );

  const typeItems = useMemo(() => items.filter((item) => item.level === "type"), [items]);
  const brandItems = useMemo(
    () => items.filter((item) => item.level === "brand" && (!selectedTypeId || item.parent_id === selectedTypeId)),
    [items, selectedTypeId]
  );
  const lineItems = useMemo(
    () => items.filter((item) => item.level === "line" && (!selectedBrandId || item.parent_id === selectedBrandId)),
    [items, selectedBrandId]
  );

  async function createItem() {
    if (!form.label.trim() || !form.item_key.trim()) {
      alert("Completa al menos Clave y Nombre");
      return;
    }
    setSaving(true);
    const payload = {
      parent_id: form.parent_id || null,
      level: activeLevel,
      type_key: form.type_key || null,
      item_key: form.item_key.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const { error } = await supabase.from("device_catalog_items").insert(payload);
    setSaving(false);
    if (error) {
      alert(`Error creando item: ${error.message}`);
      return;
    }

    setForm({
      parent_id: "",
      type_key: form.type_key,
      item_key: "",
      label: "",
      description: "",
      image_url: "",
      logo_url: "",
      sort_order: 0,
      is_active: true,
    });
    await loadItems();
  }

  async function saveItem(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    const { error } = await supabase
      .from("device_catalog_items")
      .update({
        item_key: draft.item_key?.trim(),
        label: draft.label?.trim(),
        description: draft.description?.trim() || null,
        image_url: draft.image_url?.trim() || null,
        logo_url: draft.logo_url?.trim() || null,
        sort_order: Number(draft.sort_order) || 0,
        is_active: Boolean(draft.is_active),
        type_key: draft.type_key || null,
      })
      .eq("id", id);

    if (error) {
      alert(`Error actualizando: ${error.message}`);
      return;
    }
    await loadItems();
  }

  async function removeItem(id: string) {
    const ok = window.confirm("¿Eliminar este elemento del catálogo?");
    if (!ok) return;
    const { error } = await supabase.from("device_catalog_items").delete().eq("id", id);
    if (error) {
      alert(`Error eliminando: ${error.message}`);
      return;
    }
    await loadItems();
  }

  if (loading) {
    return <p className="text-slate-600">Cargando catálogo de dispositivos...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Aquí puedes administrar tipos, marcas, líneas, modelos y variantes con nombre, descripción, tipo, imagen y logo.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={selectedTypeId}
          onChange={(e) => {
            setSelectedTypeId(e.target.value);
            setSelectedBrandId("");
            setSelectedLineId("");
          }}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Filtrar por tipo (todos)</option>
          {typeItems.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <select
          value={selectedBrandId}
          onChange={(e) => {
            setSelectedBrandId(e.target.value);
            setSelectedLineId("");
          }}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Filtrar por marca (todas)</option>
          {brandItems.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <select
          value={selectedLineId}
          onChange={(e) => setSelectedLineId(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Filtrar por línea (todas)</option>
          {lineItems.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => setActiveLevel(level.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
              activeLevel === level.value
                ? "bg-brand-light text-white border-brand-light"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
        <h4 className="font-semibold text-slate-900 mb-3">Nuevo {LEVELS.find((l) => l.value === activeLevel)?.label}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {parentCandidates.length > 0 && (
            <select
              value={form.parent_id}
              onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value }))}
              className="border border-slate-300 rounded-md px-3 py-2"
            >
              <option value="">Sin padre</option>
              {parentCandidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={form.type_key}
            onChange={(e) => setForm((prev) => ({ ...prev, type_key: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          >
            {TYPE_KEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Clave única (ej: samsung_galaxy_s)"
            value={form.item_key}
            onChange={(e) => setForm((prev) => ({ ...prev, item_key: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          />
          <input
            placeholder="Nombre visible"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          />
          <input
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          />
          <input
            placeholder="URL imagen"
            value={form.image_url}
            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          />
          <input
            placeholder="URL logo (solo marca)"
            value={form.logo_url}
            onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
            className="border border-slate-300 rounded-md px-3 py-2"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={createItem}
            disabled={saving}
            className="rounded-md bg-brand-light px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Agregar al catálogo"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{item.label}</p>
                <p className="text-xs text-slate-600 truncate">
                  key: {item.item_key} · type: {item.type_key ?? "-"} · activo: {item.is_active ? "sí" : "no"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveItem(item.id)}
                  className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={drafts[item.id]?.label ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], label: e.target.value } }))}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                placeholder="Nombre"
              />
              <input
                value={drafts[item.id]?.item_key ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], item_key: e.target.value } }))}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                placeholder="Clave"
              />
              <input
                value={drafts[item.id]?.description ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm md:col-span-2"
                placeholder="Descripción"
              />
              <input
                value={drafts[item.id]?.image_url ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], image_url: e.target.value } }))}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                placeholder="URL imagen"
              />
              <input
                value={drafts[item.id]?.logo_url ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], logo_url: e.target.value } }))}
                className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                placeholder="URL logo"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {drafts[item.id]?.image_url && <img src={drafts[item.id]?.image_url as string} alt={item.label} className="h-20 w-full rounded-md object-cover border border-slate-200" />}
              {drafts[item.id]?.logo_url && <img src={drafts[item.id]?.logo_url as string} alt={`${item.label} logo`} className="h-20 w-full rounded-md object-contain border border-slate-200 bg-white" />}
            </div>
          </div>
        ))}
        {visibleItems.length === 0 && (
          <p className="text-sm text-slate-500">No hay elementos en este nivel todavía.</p>
        )}
      </div>
    </div>
  );
}
