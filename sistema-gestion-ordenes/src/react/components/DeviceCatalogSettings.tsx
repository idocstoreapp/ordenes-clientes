import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCatalogSnapshot, type CatalogSnapshot } from "@/lib/device-catalog";

type Level = "device_types" | "brands" | "product_lines" | "models" | "variants";

export default function DeviceCatalogSettings() {
  const [catalog, setCatalog] = useState<CatalogSnapshot>({ deviceTypes: [], brands: [], productLines: [], models: [], variants: [] });
  const [activeLevel, setActiveLevel] = useState<Level>("device_types");
  const [loading, setLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [form, setForm] = useState({ code: "", name: "", image_url: "", logo_url: "", is_active: true });

  async function loadCatalog() {
    setLoading(true);
    try {
      setCatalog(await fetchCatalogSnapshot());
    } catch (error: any) {
      alert(`Error cargando catálogo: ${error.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { loadCatalog(); }, []);

  const filtered = useMemo(() => {
    if (activeLevel === "device_types") return catalog.deviceTypes;
    if (activeLevel === "brands") return catalog.brands.filter((b) => !selectedTypeId || String(b.device_type_id) === selectedTypeId);
    if (activeLevel === "product_lines") return catalog.productLines.filter((l) => !selectedBrandId || String(l.brand_id) === selectedBrandId);
    if (activeLevel === "models") return catalog.models.filter((m) => !selectedLineId || String(m.product_line_id) === selectedLineId);
    return catalog.variants.filter((v) => !selectedModelId || String(v.model_id) === selectedModelId);
  }, [activeLevel, catalog, selectedTypeId, selectedBrandId, selectedLineId, selectedModelId]);

  async function createItem() {
    try {
      if (activeLevel === "device_types") {
        await supabase.from("device_types").insert({ code: form.code.trim(), name: form.name.trim(), image_url: form.image_url.trim() || null, is_active: form.is_active });
      }
      if (activeLevel === "brands") {
        if (!selectedTypeId) return alert("Selecciona un tipo de dispositivo");
        await supabase.from("brands").insert({ device_type_id: Number(selectedTypeId), name: form.name.trim(), normalized_name: form.name.trim().toLowerCase(), logo_url: form.logo_url.trim() || null, is_active: form.is_active });
      }
      if (activeLevel === "product_lines") {
        if (!selectedBrandId) return alert("Selecciona una marca");
        await supabase.from("product_lines").insert({ brand_id: Number(selectedBrandId), name: form.name.trim(), normalized_name: form.name.trim().toLowerCase(), image_url: form.image_url.trim() || null, is_active: form.is_active });
      }
      if (activeLevel === "models") {
        if (!selectedLineId) return alert("Selecciona una línea");
        await supabase.from("models").insert({ product_line_id: Number(selectedLineId), name: form.name.trim(), normalized_name: form.name.trim().toLowerCase(), is_active: form.is_active });
      }
      if (activeLevel === "variants") {
        if (!selectedModelId) return alert("Selecciona un modelo");
        await supabase.from("variants").insert({ model_id: Number(selectedModelId), name: form.name.trim(), normalized_name: form.name.trim().toLowerCase(), is_active: form.is_active });
      }
      setForm({ code: "", name: "", image_url: "", logo_url: "", is_active: true });
      await loadCatalog();
    } catch (error: any) {
      alert(`Error creando registro: ${error.message}`);
    }
  }

  async function updateItem(row: any) {
    const table = activeLevel;
    const payload = {
      ...(table === "device_types" ? { code: row.code, image_url: row.image_url || null } : {}),
      ...(table === "brands" ? { logo_url: row.logo_url || null, normalized_name: String(row.name || "").toLowerCase() } : {}),
      ...(table === "product_lines" ? { image_url: row.image_url || null, normalized_name: String(row.name || "").toLowerCase() } : {}),
      ...(table === "models" || table === "variants" ? { normalized_name: String(row.name || "").toLowerCase() } : {}),
      name: row.name,
      is_active: row.is_active,
    };

    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    if (error) return alert(`Error guardando: ${error.message}`);

    // Sync imágenes del catálogo materializado
    if (table === "product_lines" && row.image_url) {
      await supabase.from("device_catalog_items").update({ image_url: row.image_url }).eq("product_line_id", row.id);
    }

    await loadCatalog();
  }

  async function deleteItem(id: number) {
    if (!window.confirm("¿Eliminar registro?")) return;
    const { error } = await supabase.from(activeLevel).delete().eq("id", id);
    if (error) return alert(`Error eliminando: ${error.message}`);
    await loadCatalog();
  }

  if (loading) return <p className="text-slate-600">Cargando catálogo…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Catálogo normalizado: Tipo → Marca → Línea → Modelo → Variante. Todo se consulta/edita directo en base de datos.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          ["device_types", "Tipo"],
          ["brands", "Marca"],
          ["product_lines", "Línea"],
          ["models", "Modelo"],
          ["variants", "Variante"],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setActiveLevel(value as Level)} className={`rounded-md border px-3 py-2 text-sm ${activeLevel === value ? "bg-brand-light text-white border-brand-light" : "bg-white"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Tipo (todos)</option>
          {catalog.deviceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Marca (todas)</option>
          {catalog.brands.filter((b) => !selectedTypeId || String(b.device_type_id) === selectedTypeId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Línea (todas)</option>
          {catalog.productLines.filter((l) => !selectedBrandId || String(l.brand_id) === selectedBrandId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Modelo (todos)</option>
          {catalog.models.filter((m) => !selectedLineId || String(m.product_line_id) === selectedLineId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-2">
        <p className="font-semibold text-slate-900">Agregar {activeLevel}</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {activeLevel === "device_types" && <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />}
          <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          {(activeLevel === "device_types" || activeLevel === "product_lines") && <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="image_url" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} />}
          {activeLevel === "brands" && <input className="border rounded-md px-2 py-1.5 text-sm" placeholder="logo_url" value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} />}
          <button type="button" onClick={createItem} className="rounded-md bg-brand-light px-3 py-1.5 text-sm text-white hover:bg-brand-dark">Agregar</button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((row: any) => (
          <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
              {activeLevel === "device_types" && <input value={row.code || ""} onChange={(e) => { row.code = e.target.value; setCatalog((prev) => ({ ...prev })); }} className="border rounded-md px-2 py-1 text-sm" />}
              <input value={row.name || ""} onChange={(e) => { row.name = e.target.value; setCatalog((prev) => ({ ...prev })); }} className="border rounded-md px-2 py-1 text-sm" />
              {(activeLevel === "device_types" || activeLevel === "product_lines") && <input value={row.image_url || ""} onChange={(e) => { row.image_url = e.target.value; setCatalog((prev) => ({ ...prev })); }} className="border rounded-md px-2 py-1 text-sm" placeholder="image_url" />}
              {activeLevel === "brands" && <input value={row.logo_url || ""} onChange={(e) => { row.logo_url = e.target.value; setCatalog((prev) => ({ ...prev })); }} className="border rounded-md px-2 py-1 text-sm" placeholder="logo_url" />}
              <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={Boolean(row.is_active)} onChange={(e) => { row.is_active = e.target.checked; setCatalog((prev) => ({ ...prev })); }} /> Activo</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => updateItem(row)} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Guardar</button>
                <button type="button" onClick={() => deleteItem(row.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
