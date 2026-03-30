import type { Service } from "@/types";

export interface DeviceTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface DeviceSeriesOption {
  key: string;
  label: string;
  models: string[];
}

export interface DeviceBrandOption {
  key: string;
  label: string;
  icon: string;
  models: string[];
  series: DeviceSeriesOption[];
}

export const DEVICE_TYPE_OPTIONS: DeviceTypeOption[] = [
  { id: "iphone", label: "Celular", description: "iPhone, Android, etc.", icon: "📱" },
  { id: "ipad", label: "Tablet", description: "iPad, Android Tablet, etc.", icon: "📱" },
  { id: "macbook", label: "Notebook / Laptop", description: "MacBook, Windows Laptop, etc.", icon: "💻" },
  { id: "apple_watch", label: "Smartwatch", description: "Apple Watch, Android Watch, etc.", icon: "⌚" },
];

const BRAND_RULES: Array<{ key: string; label: string; icon: string; pattern: RegExp }> = [
  { key: "apple", label: "iPhone", icon: "🍎", pattern: /\biphone\b|\bios\b|\bxs\b|\bxr\b|\bse\b/i },
  { key: "samsung", label: "Samsung", icon: "📱", pattern: /\bsamsung\b|\bgalaxy\b|\bsm[-\s]?/i },
  { key: "xiaomi", label: "Xiaomi", icon: "📱", pattern: /\bxiaomi\b|\bredmi\b|\bpoco\b|\bmi\s?\d/i },
  { key: "motorola", label: "Motorola", icon: "📱", pattern: /\bmotorola\b|\bmoto\b|\bedge\b|\bg\d{2}/i },
  { key: "huawei", label: "Huawei", icon: "📱", pattern: /\bhuawei\b|\bp\d{2}\b|\by\d[a-z]?\b/i },
  { key: "honor", label: "Honor", icon: "📱", pattern: /\bhonor\b/i },
  { key: "oppo", label: "Oppo", icon: "📱", pattern: /\boppo\b|\breno\b/i },
  { key: "vivo", label: "Vivo", icon: "📱", pattern: /\bvivo\b/i },
  { key: "google", label: "Google Pixel", icon: "📱", pattern: /\bpixel\b|\bgoogle\b/i },
  { key: "apple_watch", label: "Apple Watch", icon: "⌚", pattern: /apple\s?watch|iwatch/i },
  { key: "lenovo", label: "Lenovo", icon: "💻", pattern: /\blenovo\b|\bideapad\b|\bthinkpad\b/i },
  { key: "asus", label: "Asus", icon: "💻", pattern: /\basus\b|\bzenbook\b|\brog\b|\btuf\b/i },
  { key: "acer", label: "Acer", icon: "💻", pattern: /\bacer\b|\bnitro\b|\baspire\b/i },
  { key: "hp", label: "HP", icon: "💻", pattern: /\bhp\b|\bomen\b|\bvictus\b|\bpavilion\b/i },
  { key: "dell", label: "Dell", icon: "💻", pattern: /\bdell\b|\binspiron\b|\blatitude\b/i },
  { key: "nintendo", label: "Nintendo", icon: "🎮", pattern: /\bnintendo\b|\bswitch\b|\bwii\b/i },
  { key: "playstation", label: "PlayStation", icon: "🎮", pattern: /\bps\d\b|playstation|\bplay\s?\d\b/i },
  { key: "other", label: "Otros", icon: "🔧", pattern: /.+/i },
];

const FALLBACK_MODELS_BY_TYPE: Record<string, string[]> = {
  iphone: ["iPhone 15 Pro", "iPhone 14", "Samsung S23 Ultra", "Redmi Note 13 Pro 5G", "Moto G54 5G"],
  ipad: ["iPad 10", "iPad 9", "Samsung Tab A9+", "Lenovo TB-X306X"],
  macbook: ["MacBook Air A2337", "MacBook Pro A2442", "Acer Swift 3", "Dell Inspiron 15 3511"],
  apple_watch: ["Apple Watch SE 44mm", "Apple Watch Series 6 44mm", "Galaxy Watch Active 2", "Huawei Watch GT 3 Pro"],
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeModelKey(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, "");
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

function parseNumberInLabel(value: string): number | null {
  const match = value.match(/(\d{1,3})/);
  return match ? Number(match[1]) : null;
}

function sortSeriesByBrand(brandKey: string, a: DeviceSeriesOption, b: DeviceSeriesOption): number {
  if (brandKey === "apple") {
    const numA = parseNumberInLabel(a.label);
    const numB = parseNumberInLabel(b.label);
    if (numA !== null && numB !== null && numA !== numB) return numA - numB;
  }

  if (brandKey === "samsung") {
    const order = ["SERIE S", "SERIE A", "SERIE NOTE", "SERIE Z"];
    const idxA = order.findIndex((prefix) => a.label.toUpperCase().startsWith(prefix));
    const idxB = order.findIndex((prefix) => b.label.toUpperCase().startsWith(prefix));
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
  }

  return b.models.length - a.models.length || naturalSort(a.label, b.label);
}

function detectBrand(model: string): { key: string; label: string; icon: string } {
  const normalized = model.toLowerCase();
  const found = BRAND_RULES.find((rule) => rule.pattern.test(normalized)) ?? BRAND_RULES[BRAND_RULES.length - 1];
  return { key: found.key, label: found.label, icon: found.icon };
}

function detectSeries(brandKey: string, model: string): string {
  const value = model.toLowerCase();

  if (brandKey === "apple") {
    const match = value.match(/iphone\s*(\d{1,2}|x|xr|xs|11|12|13|14|15|16|17|se)/i);
    return match ? `iPhone ${match[1].toUpperCase()}` : "Otros iPhone";
  }

  if (brandKey === "samsung") {
    const match = value.match(/\b(s\d{1,2}|a\d{1,2}|note\s?\d{1,2}|z\s?(?:flip|fold)\s?\d?)\b/i);
    return match ? `Serie ${match[1].toUpperCase().replace(/\s+/g, " ")}` : "Otras series Samsung";
  }

  if (brandKey === "xiaomi") {
    const match = value.match(/\b(redmi|note|poco|mi)\b/i);
    return match ? `Línea ${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}` : "Otras líneas Xiaomi";
  }

  if (brandKey === "motorola") {
    const match = value.match(/\b(g\d{1,2}|edge|razr|e\d{1,2}|one)\b/i);
    return match ? `Línea ${match[1].toUpperCase()}` : "Otras líneas Motorola";
  }

  if (brandKey === "apple_watch") {
    const match = value.match(/series?\s*(\d+)|se|ultra/i);
    return match ? `Watch ${match[0].toUpperCase().replace(/\s+/g, " ")}` : "Otros Watch";
  }

  if (brandKey === "lenovo" || brandKey === "asus" || brandKey === "acer" || brandKey === "hp" || brandKey === "dell") {
    const token = normalizeWhitespace(model).split(" ").slice(0, 2).join(" ");
    return token || "Otros modelos";
  }

  return "General";
}

export function buildDeviceWizardOptions(
  recentModels: string[],
  detectType: (model: string) => string | null,
  selectedType: string | null,
): DeviceBrandOption[] {
  const sourceModels = recentModels.length > 0
    ? recentModels.map(normalizeWhitespace)
    : (selectedType ? FALLBACK_MODELS_BY_TYPE[selectedType] ?? [] : Object.values(FALLBACK_MODELS_BY_TYPE).flat());

  const uniqueModelsMap = new Map<string, string>();
  sourceModels.forEach((model) => {
    const cleaned = normalizeWhitespace(model);
    if (!cleaned) return;
    const key = normalizeModelKey(cleaned);
    if (!uniqueModelsMap.has(key)) {
      uniqueModelsMap.set(key, cleaned);
    }
  });
  const uniqueModels = Array.from(uniqueModelsMap.values());
  const filteredByType = selectedType
    ? uniqueModels.filter((model) => detectType(model) === selectedType)
    : uniqueModels;

  const rows = filteredByType.length > 0 ? filteredByType : uniqueModels;
  const grouped = new Map<string, DeviceBrandOption>();

  rows.forEach((model) => {
    const brand = detectBrand(model);
    const seriesLabel = detectSeries(brand.key, model);

    if (!grouped.has(brand.key)) {
      grouped.set(brand.key, {
        key: brand.key,
        label: brand.label,
        icon: brand.icon,
        models: [],
        series: [],
      });
    }

    const brandBucket = grouped.get(brand.key);
    if (!brandBucket) return;

    if (!brandBucket.models.includes(model)) {
      brandBucket.models.push(model);
    }

    let seriesBucket = brandBucket.series.find((series) => series.key === seriesLabel.toLowerCase());
    if (!seriesBucket) {
      seriesBucket = {
        key: seriesLabel.toLowerCase(),
        label: seriesLabel,
        models: [],
      };
      brandBucket.series.push(seriesBucket);
    }

    if (!seriesBucket.models.includes(model)) {
      seriesBucket.models.push(model);
    }
  });

  return Array.from(grouped.values())
    .map((brand) => ({
      ...brand,
      models: [...brand.models].sort(naturalSort),
      series: [...brand.series]
        .map((series) => ({ ...series, models: [...series.models].sort(naturalSort) }))
        .sort((a, b) => sortSeriesByBrand(brand.key, a, b)),
    }))
    .sort((a, b) => b.models.length - a.models.length || naturalSort(a.label, b.label));
}

const BASE_SERVICE_HINTS = [
  "Cambio de pantalla",
  "Cambio de Bateria",
  "Reparación de conector de carga",
  "Cambio de Cristal de Camara",
  "Limpieza general",
  "Diagnostico extendido",
];

const DEVICE_TYPE_HINTS: Record<string, string[]> = {
  iphone: ["Reparación Face ID", "Cambio de Camara Frontal", "Reparación del Lector SIM"],
  ipad: ["Cambio de Tactil", "Servicio Pegado de Pantalla", "Cambio de Glass"],
  macbook: ["Cambio de Teclado", "Cambio de Trackpad", "Cambio de Touch Bar Macbook", "Reparacion de conector de carga", "Cambio de Disco Duro SSD/HDD"],
  apple_watch: ["Cambio de Bateria", "Cambio de Glass", "Reparación de sensores"],
};

const MODEL_KEYWORDS: Array<{ pattern: RegExp; hints: string[] }> = [
  { pattern: /iphone|ios/i, hints: ["Reparación Face ID", "Cambio de Cámara Principal"] },
  { pattern: /macbook|laptop|notebook|acer|asus|lenovo|dell|hp/i, hints: ["Cambio de Teclado", "Cambio de Trackpad", "Cambio de Ventilador"] },
  { pattern: /watch|smartwatch|reloj/i, hints: ["Reparación de sensores", "Cambio de Bateria"] },
  { pattern: /samsung|xiaomi|redmi|motorola|honor|huawei|oppo|vivo/i, hints: ["Cambio de Pin de Carga", "Actualización de software"] },
];

export function getRecommendedServices(
  availableServices: Service[],
  params: { deviceType?: string | null; deviceModel?: string | null; selectedServiceIds?: string[] },
): Service[] {
  const selected = new Set(params.selectedServiceIds ?? []);
  const wantedNames = [
    ...BASE_SERVICE_HINTS,
    ...(params.deviceType ? DEVICE_TYPE_HINTS[params.deviceType] ?? [] : []),
  ];

  const model = params.deviceModel ?? "";
  MODEL_KEYWORDS.forEach((entry) => {
    if (entry.pattern.test(model)) {
      wantedNames.push(...entry.hints);
    }
  });

  const normalizedWanted = wantedNames.map((name) => name.toLowerCase());
  return availableServices
    .filter((service) => !selected.has(service.id))
    .map((service) => {
      const serviceName = service.name.toLowerCase();
      const score = normalizedWanted.reduce((acc, wanted) => (
        serviceName.includes(wanted) || wanted.includes(serviceName) ? acc + 3 : acc
      ), 0);
      return { service, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name))
    .slice(0, 8)
    .map((item) => item.service);
}