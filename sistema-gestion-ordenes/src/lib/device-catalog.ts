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

  const { data: insertedBrand, error: brandError } = await supabase
    .from("brands")
    .upsert({ device_type_id: params.deviceTypeId, name: brandName, normalized_name: brandName.toLowerCase(), is_active: true }, { onConflict: "device_type_id,normalized_name" })
    .select("*")
    .single();
  if (brandError) throw brandError;

  const { data: insertedLine, error: lineError } = await supabase
    .from("product_lines")
    .upsert({ brand_id: insertedBrand.id, name: lineName, normalized_name: lineName.toLowerCase(), is_active: true }, { onConflict: "brand_id,normalized_name" })
    .select("*")
    .single();
  if (lineError) throw lineError;

  const { data: insertedModel, error: modelError } = await supabase
    .from("models")
    .upsert({ product_line_id: insertedLine.id, name: modelName, normalized_name: modelName.toLowerCase(), is_active: true }, { onConflict: "product_line_id,normalized_name" })
    .select("*")
    .single();
  if (modelError) throw modelError;

  let variantId: number | null = null;
  if (variantName) {
    const { data: insertedVariant, error: variantError } = await supabase
      .from("variants")
      .upsert({ model_id: insertedModel.id, name: variantName, normalized_name: variantName.toLowerCase(), is_active: true }, { onConflict: "model_id,normalized_name" })
      .select("*")
      .single();
    if (variantError) throw variantError;
    variantId = insertedVariant.id;
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
