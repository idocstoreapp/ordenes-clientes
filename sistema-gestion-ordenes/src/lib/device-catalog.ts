import { supabase } from "@/lib/supabase";

export interface CatalogDeviceType {
  id: number;
  code: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
}

export interface CatalogBrand {
  id: number;
  device_type_id: number;
  name: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface CatalogProductLine {
  id: number;
  brand_id: number;
  name: string;
  image_url: string | null;
  is_active: boolean;
}

export interface CatalogModel {
  id: number;
  product_line_id: number;
  name: string;
  is_active: boolean;
}

export interface CatalogVariant {
  id: number;
  model_id: number;
  name: string;
  is_active: boolean;
}

export interface CatalogSnapshot {
  deviceTypes: CatalogDeviceType[];
  brands: CatalogBrand[];
  productLines: CatalogProductLine[];
  models: CatalogModel[];
  variants: CatalogVariant[];
}

export async function fetchCatalogSnapshot(): Promise<CatalogSnapshot> {
  const [deviceTypesRes, brandsRes, linesRes, modelsRes, variantsRes] = await Promise.all([
    supabase.from("device_types").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("product_lines").select("*").order("name"),
    supabase.from("models").select("*").order("name"),
    supabase.from("variants").select("*").order("name"),
  ]);

  const firstError = deviceTypesRes.error || brandsRes.error || linesRes.error || modelsRes.error || variantsRes.error;
  if (firstError) throw firstError;

  return {
    deviceTypes: (deviceTypesRes.data as CatalogDeviceType[] | null) ?? [],
    brands: (brandsRes.data as CatalogBrand[] | null) ?? [],
    productLines: (linesRes.data as CatalogProductLine[] | null) ?? [],
    models: (modelsRes.data as CatalogModel[] | null) ?? [],
    variants: (variantsRes.data as CatalogVariant[] | null) ?? [],
  };
}

export async function ensureCatalogChain(params: {
  deviceTypeId: number;
  brandName: string;
  lineName: string;
  modelName: string;
  variantName?: string;
}) {
  const brandName = params.brandName.trim();
  const lineName = params.lineName.trim();
  const modelName = params.modelName.trim();
  const variantName = params.variantName?.trim() ?? "";

  async function upsertOrSelect(table: string, matchCondition: Record<string, any>, payload: Record<string, any>) {
    // Buscar registro existente
    const { data: existingData, error: selectError } = await supabase
      .from(table)
      .select("*")
      .match(matchCondition)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existingData) {
      const { error: updateError } = await supabase
        .from(table)
        .update(payload)
        .eq("id", (existingData as any).id);
      if (updateError) throw updateError;
      return existingData;
    }

    const { data: insertedData, error: insertError } = await supabase
      .from(table)
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (insertError) throw insertError;

    return insertedData;
  }

  const insertedBrand = await upsertOrSelect(
    "brands",
    { device_type_id: params.deviceTypeId, normalized_name: brandName.toLowerCase() },
    { device_type_id: params.deviceTypeId, name: brandName, normalized_name: brandName.toLowerCase(), is_active: true }
  );

  const insertedLine = await upsertOrSelect(
    "product_lines",
    { brand_id: (insertedBrand as any).id, normalized_name: lineName.toLowerCase() },
    { brand_id: (insertedBrand as any).id, name: lineName, normalized_name: lineName.toLowerCase(), is_active: true }
  );

  const insertedModel = await upsertOrSelect(
    "models",
    { product_line_id: (insertedLine as any).id, normalized_name: modelName.toLowerCase() },
    { product_line_id: (insertedLine as any).id, name: modelName, normalized_name: modelName.toLowerCase(), is_active: true }
  );

  let variantId: number | null = null;
  if (variantName) {
    const insertedVariant = await upsertOrSelect(
      "variants",
      { model_id: (insertedModel as any).id, normalized_name: variantName.toLowerCase() },
      { model_id: (insertedModel as any).id, name: variantName, normalized_name: variantName.toLowerCase(), is_active: true }
    );
    variantId = (insertedVariant as any).id;
  }

  return {
    brandId: insertedBrand.id as number,
    lineId: insertedLine.id as number,
    modelId: insertedModel.id as number,
    variantId,
  };
}

export function buildDeviceDisplayName(parts: {
  brandName: string;
  lineName: string;
  modelName: string;
  variantName?: string;
}): string {
  return [parts.brandName, parts.lineName, parts.modelName, parts.variantName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}
