import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCatalogSnapshot, type CatalogSnapshot } from "@/lib/device-catalog";

type Level = "device_types" | "brands" | "product_lines" | "models" | "variants";

interface DeviceCatalogItemRow {
  id: number;
  device_type_id: number;
  brand_id: number;
  product_line_id: number;
  model_id: number;
  variant_id: number | null;
  display_name: string;
  image_url: string | null;
  is_active: boolean;
}

interface BaseRow {
  id: number;
  code?: string;
  name: string;
  image_url?: string | null;
  logo_url?: string | null;
  is_active: boolean;
}

export default function DeviceCatalogSettings() {
  const [catalog, setCatalog] = useState<CatalogSnapshot>({ deviceTypes: [], brands: [], productLines: [], models: [], variants: [] });
  const [catalogItems, setCatalogItems] = useState<DeviceCatalogItemRow[]>([]);
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
      const [snapshot, itemsRes] = await Promise.all([
        fetchCatalogSnapshot(),
        supabase.from("device_catalog_items").select("*").order("display_name"),
      ]);
      setCatalog(snapshot);
      if (itemsRes.error) throw itemsRes.error;
      setCatalogItems((itemsRes.data as DeviceCatalogItemRow[] | null) ?? []);
    } catch (error: any) {
      alert(`Error cargando catálogo: ${error.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { loadCatalog(); }, []);

  const filteredRows = useMemo(() => {
    if (activeLevel === "device_types") return catalog.deviceTypes;
    if (activeLevel === "brands") return catalog.brands.filter((b) => !selectedTypeId || String(b.device_type_id) === selectedTypeId);
    if (activeLevel === "product_lines") return catalog.productLines.filter((l) => !selectedBrandId || String(l.brand_id) === selectedBrandId);
    if (activeLevel === "models") return catalog.models.filter((m) => !selectedLineId || String(m.product_line_id) === selectedLineId);
    return catalog.variants.filter((v) => !selectedModelId || String(v.model_id) === selectedModelId);
  }, [activeLevel, catalog, selectedTypeId, selectedBrandId, selectedLineId, selectedModelId]);

  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter((row) => {
      if (selectedTypeId && String(row.device_type_id) !== selectedTypeId) return false;
      if (selectedBrandId && String(row.brand_id) !== selectedBrandId) return false;
      if (selectedLineId && String(row.product_line_id) !== selectedLineId) return false;
      if (selectedModelId && String(row.model_id) !== selectedModelId) return false;
      return true;
    });
  }, [catalogItems, selectedTypeId, selectedBrandId, selectedLineId, selectedModelId]);

  const typeName = (id: number) => catalog.deviceTypes.find((row) => row.id === id)?.name ?? `Tipo #${id}`;
  const brandName = (id: number) => catalog.brands.find((row) => row.id === id)?.name ?? `Marca #${id}`;
  const lineName = (id: number) => catalog.productLines.find((row) => row.id === id)?.name ?? `Línea #${id}`;
  const modelName = (id: number) => catalog.models.find((row) => row.id === id)?.name ?? `Modelo #${id}`;
  const variantName = (id: number | null) => (id ? catalog.variants.find((row) => row.id === id)?.name ?? `Variante #${id}` : "Sin variante");

  const getModelContext = (modelId: number) => {
    const model = catalog.models.find((row) => row.id === modelId);
    if (!model) return null;
    const line = catalog.productLines.find((row) => row.id === model.product_line_id);
    if (!line) return null;
    const brand = catalog.brands.find((row) => row.id === line.brand_id);
    if (!brand) return null;
    const type = catalog.deviceTypes.find((row) => row.id === brand.device_type_id);
    if (!type) return null;
    return { model, line, brand, type };
  };

  const getCatalogCardImageForLevel = (table: Level, rowId: number): string => {
    if (table !== "models" && table !== "variants") return "";
    if (table === "models") {
      const card = catalogItems.find((item) => item.model_id === rowId && item.variant_id === null);
      return card?.image_url || "";
    }
    const card = catalogItems.find((item) => item.variant_id === rowId);
    return card?.image_url || "";
  };

  async function createItem() {
    try {
      if (!form.name.trim()) return alert("Debes ingresar un nombre");

      if (activeLevel === "device_types") {
        await supabase.from("device_types").insert({
          code: form.code.trim(),
          name: form.name.trim(),
          image_url: form.image_url.trim() || null,
          is_active: form.is_active,
        });
      }

      if (activeLevel === "brands") {
        if (!selectedTypeId) return alert("Selecciona un tipo de dispositivo.");
        await supabase.from("brands").insert({
          device_type_id: Number(selectedTypeId),
          name: form.name.trim(),
          normalized_name: form.name.trim().toLowerCase(),
          logo_url: form.logo_url.trim() || null,
          is_active: form.is_active,
        });
      }

      if (activeLevel === "product_lines") {
        if (!selectedBrandId) return alert("Selecciona una marca.");
        await supabase.from("product_lines").insert({
          brand_id: Number(selectedBrandId),
          name: form.name.trim(),
          normalized_name: form.name.trim().toLowerCase(),
          image_url: form.image_url.trim() || null,
          is_active: form.is_active,
        });
      }

      if (activeLevel === "models") {
        if (!selectedLineId) return alert("Selecciona una línea.");
        await supabase.from("models").insert({
          product_line_id: Number(selectedLineId),
          name: form.name.trim(),
          normalized_name: form.name.trim().toLowerCase(),
          is_active: form.is_active,
        });
      }

      if (activeLevel === "variants") {
        if (!selectedModelId) return alert("Selecciona un modelo.");
        await supabase.from("variants").insert({
          model_id: Number(selectedModelId),
          name: form.name.trim(),
          normalized_name: form.name.trim().toLowerCase(),
          is_active: form.is_active,
        });
      }

      setForm({ code: "", name: "", image_url: "", logo_url: "", is_active: true });
      await loadCatalog();
    } catch (error: any) {
      alert(`Error creando registro: ${error.message}`);
    }
  }

  async function saveBaseRow(table: Level, row: BaseRow) {
    const payload: Record<string, any> = {
      name: row.name,
      is_active: row.is_active,
    };

    if (table === "device_types") {
      payload.code = row.code || "";
      payload.image_url = row.image_url || null;
    }
    if (table === "brands") {
      payload.logo_url = row.logo_url || null;
      payload.normalized_name = row.name.toLowerCase();
    }
    if (table === "product_lines") {
      payload.image_url = row.image_url || null;
      payload.normalized_name = row.name.toLowerCase();
    }
    if (table === "models" || table === "variants") {
      payload.normalized_name = row.name.toLowerCase();
    }

    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    if (error) return alert(`Error guardando: ${error.message}`);

    if (table === "models" || table === "variants") {
      const modelId = table === "models" ? row.id : Number((row as any).model_id);
      const context = getModelContext(modelId);
      if (context) {
        const cardPayload = {
          device_type_id: context.type.id,
          brand_id: context.brand.id,
          product_line_id: context.line.id,
          model_id: context.model.id,
          variant_id: table === "variants" ? row.id : null,
          display_name: table === "variants"
            ? `${context.brand.name} ${context.line.name} ${context.model.name} ${row.name}`.replace(/\s+/g, " ").trim()
            : `${context.brand.name} ${context.line.name} ${row.name}`.replace(/\s+/g, " ").trim(),
          image_url: row.image_url || null,
          is_active: row.is_active,
        };

        const existingCard = catalogItems.find((item) =>
          item.device_type_id === cardPayload.device_type_id &&
          item.brand_id === cardPayload.brand_id &&
          item.product_line_id === cardPayload.product_line_id &&
          item.model_id === cardPayload.model_id &&
          item.variant_id === cardPayload.variant_id
        );

        let cardError = null;
        if (existingCard) {
          const res = await supabase
            .from("device_catalog_items")
            .update({
              display_name: cardPayload.display_name,
              image_url: cardPayload.image_url,
              is_active: cardPayload.is_active,
            })
            .eq("id", existingCard.id);
          cardError = res.error;
        } else {
          const res = await supabase
            .from("device_catalog_items")
            .insert(cardPayload);
          cardError = res.error;
        }

        if (cardError) {
          return alert(`Se guardó ${table}, pero falló imagen card: ${cardError.message}`);
        }
      }
    }

    await loadCatalog();
  }

  async function removeBaseRow(table: Level, id: number) {
    if (!window.confirm("¿Eliminar registro?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return alert(`Error eliminando: ${error.message}`);
    await loadCatalog();
  }

  async function saveCatalogCard(row: DeviceCatalogItemRow) {
    const { error } = await supabase
      .from("device_catalog_items")
      .update({
        display_name: row.display_name,
        image_url: row.image_url || null,
        is_active: row.is_active,
      })
      .eq("id", row.id);

    if (error) return alert(`Error guardando card: ${error.message}`);
    await loadCatalog();
  }

  if (loading) return <p className="text-slate-600">Cargando catálogo…</p>;

  return (
    <div className="space-y-5">

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
        <select value={selectedTypeId} onChange={(e) => { setSelectedTypeId(e.target.value); setSelectedBrandId(""); setSelectedLineId(""); setSelectedModelId(""); }} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Tipo (todos)</option>
          {catalog.deviceTypes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <select value={selectedBrandId} onChange={(e) => { setSelectedBrandId(e.target.value); setSelectedLineId(""); setSelectedModelId(""); }} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Marca (todas)</option>
          {catalog.brands.filter((row) => !selectedTypeId || String(row.device_type_id) === selectedTypeId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <select value={selectedLineId} onChange={(e) => { setSelectedLineId(e.target.value); setSelectedModelId(""); }} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Línea (todas)</option>
          {catalog.productLines.filter((row) => !selectedBrandId || String(row.brand_id) === selectedBrandId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">Modelo (todos)</option>
          {catalog.models.filter((row) => !selectedLineId || String(row.product_line_id) === selectedLineId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <p className="font-semibold text-slate-900">Agregar en {activeLevel}</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {activeLevel === "device_types" && <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} className="border rounded-md px-2 py-1.5 text-sm" placeholder="code (ej: phone)" />}
          <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="border rounded-md px-2 py-1.5 text-sm" placeholder="nombre" />
          {(activeLevel === "device_types" || activeLevel === "product_lines") && <input value={form.image_url} onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))} className="border rounded-md px-2 py-1.5 text-sm" placeholder="image_url" />}
          {activeLevel === "brands" && <input value={form.logo_url} onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} className="border rounded-md px-2 py-1.5 text-sm" placeholder="logo_url" />}
          <button type="button" onClick={createItem} className="rounded-md bg-brand-light px-3 py-1.5 text-sm text-white hover:bg-brand-dark">Agregar</button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRows.map((rawRow: any) => {
          const row = rawRow as BaseRow;
          row.image_url = getCatalogCardImageForLevel(activeLevel, row.id) || row.image_url || "";
          const context = activeLevel === "brands"
            ? `Tipo: ${typeName((rawRow as any).device_type_id)}`
            : activeLevel === "product_lines"
              ? `Marca: ${brandName((rawRow as any).brand_id)}`
              : activeLevel === "models"
                ? `Línea: ${lineName((rawRow as any).product_line_id)} · Marca: ${brandName(catalog.productLines.find((line) => line.id === (rawRow as any).product_line_id)?.brand_id || 0)}`
                : activeLevel === "variants"
                  ? `Modelo: ${modelName((rawRow as any).model_id)} · Línea: ${lineName(catalog.models.find((model) => model.id === (rawRow as any).model_id)?.product_line_id || 0)}`
                  : "";

          return (
            <div key={`${activeLevel}-${row.id}`} className="rounded-lg border border-slate-200 bg-white p-3">
              {context && <p className="text-xs text-slate-500 mb-2">{context}</p>}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                {activeLevel === "device_types" && (
                  <input defaultValue={row.code || ""} onChange={(e) => { row.code = e.target.value; }} className="border rounded-md px-2 py-1 text-sm" placeholder="code" />
                )}
                <input defaultValue={row.name || ""} onChange={(e) => { row.name = e.target.value; }} className="border rounded-md px-2 py-1 text-sm" placeholder="nombre" />
                {(activeLevel === "device_types" || activeLevel === "product_lines") && (
                  <input defaultValue={row.image_url || ""} onChange={(e) => { row.image_url = e.target.value; }} className="border rounded-md px-2 py-1 text-sm" placeholder="image_url" />
                )}
                {(activeLevel === "models" || activeLevel === "variants") && (
                  <input defaultValue={row.image_url || ""} onChange={(e) => { row.image_url = e.target.value; }} className="border rounded-md px-2 py-1 text-sm" placeholder="image_url card wizard" />
                )}
                {activeLevel === "brands" && (
                  <input defaultValue={row.logo_url || ""} onChange={(e) => { row.logo_url = e.target.value; }} className="border rounded-md px-2 py-1 text-sm" placeholder="logo_url" />
                )}
                <label className="text-xs flex items-center gap-1"><input defaultChecked={row.is_active} type="checkbox" onChange={(e) => { row.is_active = e.target.checked; }} /> Activo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveBaseRow(activeLevel, row)} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Guardar</button>
                  <button type="button" onClick={() => removeBaseRow(activeLevel, row.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Eliminar</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-3">
        <h4 className="font-semibold text-slate-900">Cards del wizard (device_catalog_items)</h4>
        <p className="text-xs text-slate-500">
          Aquí editas el nombre mostrado e imagen final de cada card (modelo/variante) con contexto completo.
        </p>

        {filteredCatalogItems.map((row) => (
          <div key={`card-${row.id}`} className="rounded-md border border-slate-200 p-3 bg-slate-50 space-y-2">
            <p className="text-xs text-slate-600">
              {typeName(row.device_type_id)} → {brandName(row.brand_id)} → {lineName(row.product_line_id)} → {modelName(row.model_id)} → {variantName(row.variant_id)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
              <input
                defaultValue={row.display_name}
                onChange={(e) => { row.display_name = e.target.value; }}
                className="border rounded-md px-2 py-1.5 text-sm md:col-span-2"
                placeholder="Nombre mostrado"
              />
              <input
                defaultValue={row.image_url || ""}
                onChange={(e) => { row.image_url = e.target.value; }}
                className="border rounded-md px-2 py-1.5 text-sm md:col-span-2"
                placeholder="URL imagen card"
              />
              <label className="text-xs flex items-center gap-1"><input defaultChecked={row.is_active} type="checkbox" onChange={(e) => { row.is_active = e.target.checked; }} /> Activo</label>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => saveCatalogCard(row)} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Guardar card</button>
            </div>
          </div>
        ))}

        {filteredCatalogItems.length === 0 && (
          <p className="text-sm text-slate-500">No hay cards para el filtro seleccionado.</p>
        )}
      </div>
    </div>
  );
}
