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
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

export async function getSystemSettings(forceRefresh: boolean = false): Promise<SystemSettings> {
  // Si se fuerza la recarga, limpiar el caché primero
  if (forceRefresh) {
    cachedSettings = null;
    cacheTimestamp = null;
    console.log("[SETTINGS] Forzando recarga de configuraciones del sistema");
  }
  
  // Si hay caché válido y no se fuerza la recarga, usar caché
  if (!forceRefresh && cachedSettings && cacheTimestamp) {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION) {
      return cachedSettings;
    }
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error("Error cargando configuraciones:", error);
      // Si hay error pero tenemos caché, usar caché en lugar de defaults
      if (cachedSettings) {
        return cachedSettings;
      }
      return defaultSettings;
    }

    if (data) {
      const loadedSettings: Partial<SystemSettings> = {};
      data.forEach((item: any) => {
        loadedSettings[item.setting_key as keyof SystemSettings] = item.setting_value;
      });

      cachedSettings = { ...defaultSettings, ...loadedSettings };
      cacheTimestamp = Date.now();
      return cachedSettings;
    }
  } catch (error) {
    console.error("Error cargando configuraciones:", error);
    // Si hay error pero tenemos caché, usar caché en lugar de defaults
    if (cachedSettings) {
      return cachedSettings;
    }
  }

  return defaultSettings;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = null;
}

