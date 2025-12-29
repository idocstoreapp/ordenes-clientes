import { supabase } from "./supabase";

export interface LogoConfig {
  url: string;
  width: number;
  height: number;
}

export interface WarrantyConfig {
  policies: string[];
}

export interface SystemSettings {
  header_logo: LogoConfig;
  pdf_logo: LogoConfig;
  warranty_policies: WarrantyConfig;
}

const defaultSettings: SystemSettings = {
  header_logo: { url: "/logo.png", width: 128, height: 128 },
  pdf_logo: { url: "/logo.png", width: 33, height: 22 },
  warranty_policies: {
    policies: [
      "• Garantía 30 días por defectos de mano de obra y repuestos.",
      "• NO cubre daños por mal uso, golpes, caídas o líquidos.",
      "• Presentar boleta o factura para hacer efectiva la garantía.",
      "• Cualquier reparación por terceros anula la garantía.",
    ],
  },
};

let cachedSettings: SystemSettings | null = null;

export async function getSystemSettings(): Promise<SystemSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error("Error cargando configuraciones:", error);
      return defaultSettings;
    }

    if (data) {
      const loadedSettings: Partial<SystemSettings> = {};
      data.forEach((item: any) => {
        loadedSettings[item.setting_key as keyof SystemSettings] = item.setting_value;
      });

      cachedSettings = { ...defaultSettings, ...loadedSettings };
      return cachedSettings;
    }
  } catch (error) {
    console.error("Error cargando configuraciones:", error);
  }

  return defaultSettings;
}

export function clearSettingsCache() {
  cachedSettings = null;
}

