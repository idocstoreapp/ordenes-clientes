import type { Service } from "@/types";

export interface DeviceTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  imageUrl: string;
}

export interface DeviceSeriesOption {
  key: string;
  label: string;
  models: string[];
  imageUrl: string;
}

export interface DeviceBrandOption {
  key: string;
  label: string;
  icon: string;
  logoUrl: string;
  models: string[];
  series: DeviceSeriesOption[];
}

export const DEVICE_TYPE_OPTIONS: DeviceTypeOption[] = [
  { id: "iphone", label: "Celular", description: "iPhone, Samsung, Xiaomi, etc.", icon: "📱", imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=480&q=80" },
  { id: "ipad", label: "Tablet", description: "iPad, Galaxy Tab, Redmi Pad, etc.", icon: "📱", imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=480&q=80" },
  { id: "macbook", label: "Notebook / Laptop", description: "MacBook, Lenovo, Asus, HP, etc.", icon: "💻", imageUrl: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=480&q=80" },
  { id: "apple_watch", label: "Smartwatch", description: "Apple Watch, Galaxy Watch, Huawei Watch, etc.", icon: "⌚", imageUrl: "https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=480&q=80" },
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
  iphone: ["iPhone 15 Pro Max", "iPhone 14 Plus", "Samsung Galaxy S24 Ultra", "Samsung Galaxy A55", "Redmi Note 13 Pro 5G", "Xiaomi 14", "Moto Edge 50", "Google Pixel 8 Pro"],
  ipad: ["iPad 10", "iPad Air M2", "Samsung Galaxy Tab S9", "Samsung Tab A9+", "Xiaomi Pad 6", "Lenovo Tab M10"],
  macbook: ["MacBook Air M3 13", "MacBook Pro M3 Pro 14", "Acer Swift 3", "Dell Inspiron 15 3511", "HP Victus 15", "Lenovo Ideapad 3"],
  apple_watch: ["Apple Watch SE 44mm", "Apple Watch Series 9 45mm", "Apple Watch Ultra 2", "Galaxy Watch 6 Classic", "Huawei Watch GT 4"],
};

const BRAND_LOGOS: Record<string, string> = {
  apple: "https://cdn.simpleicons.org/apple/111111",
  samsung: "https://cdn.simpleicons.org/samsung/1428A0",
  xiaomi: "https://cdn.simpleicons.org/xiaomi/FF6900",
  motorola: "https://cdn.simpleicons.org/motorola/E1140A",
  huawei: "https://cdn.simpleicons.org/huawei/CF0A2C",
  honor: "https://cdn.simpleicons.org/honor/000000",
  oppo: "https://cdn.simpleicons.org/oppo/2D683D",
  vivo: "https://cdn.simpleicons.org/vivo/415FFF",
  google: "https://cdn.simpleicons.org/google/4285F4",
  apple_watch: "https://cdn.simpleicons.org/apple/111111",
  lenovo: "https://cdn.simpleicons.org/lenovo/E2231A",
  asus: "https://cdn.simpleicons.org/asus/000000",
  acer: "https://cdn.simpleicons.org/acer/83B81A",
  hp: "https://cdn.simpleicons.org/hp/0096D6",
  dell: "https://cdn.simpleicons.org/dell/007DB8",
  nintendo: "https://cdn.simpleicons.org/nintendo/E60012",
  playstation: "https://cdn.simpleicons.org/playstation/003791",
  other: "https://dummyimage.com/128x128/e2e8f0/475569&text=OTR",
};

const BRAND_IMAGE_CATALOG: Record<string, string> = {
  apple: "https://images.unsplash.com/photo-1510557880182-3f8a8b8f0f4f?auto=format&fit=crop&w=480&q=80",
  samsung: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=480&q=80",
  xiaomi: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=480&q=80",
  motorola: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=480&q=80",
  google: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=480&q=80",
  huawei: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=480&q=80",
  lenovo: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=480&q=80",
  asus: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=480&q=80",
  acer: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=480&q=80",
  hp: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=480&q=80",
  dell: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=480&q=80",
  apple_watch: "https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=480&q=80",
  other: "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=480&q=80",
};

const LINE_IMAGE_HINTS: Array<{ pattern: RegExp; imageUrl: string }> = [
  { pattern: /iphone/i, imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=480&q=80" },
  { pattern: /serie s|galaxy s/i, imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=480&q=80" },
  { pattern: /serie a|galaxy a/i, imageUrl: "https://images.unsplash.com/photo-1616353071855-2abfe4f3a9f9?auto=format&fit=crop&w=480&q=80" },
  { pattern: /redmi|xiaomi|poco/i, imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=480&q=80" },
  { pattern: /watch|ultra|series/i, imageUrl: "https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=480&q=80" },
  { pattern: /macbook|thinkpad|ideapad|inspiron|victus|swift/i, imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=480&q=80" },
];

const TYPE_PATTERNS: Record<string, RegExp> = {
  iphone: /iphone|samsung|xiaomi|redmi|poco|moto|motorola|pixel|huawei|honor|oppo|vivo|android/i,
  ipad: /ipad|tablet|tab|pad/i,
  macbook: /macbook|laptop|notebook|acer|asus|lenovo|dell|hp|victus|ideapad|thinkpad|inspiron/i,
  apple_watch: /watch|smartwatch|reloj/i,
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

function matchTypeWithPattern(model: string, selectedType: string | null): boolean {
  if (!selectedType) return true;
  const pattern = TYPE_PATTERNS[selectedType];
  if (!pattern) return true;
  return pattern.test(model);
}

function getLineImage(brandKey: string, lineLabel: string): string {
  const match = LINE_IMAGE_HINTS.find((entry) => entry.pattern.test(lineLabel));
  if (match) return match.imageUrl;
  return BRAND_IMAGE_CATALOG[brandKey] ?? BRAND_IMAGE_CATALOG.other;
}

export function getBrandLogo(brandKey: string): string {
  return BRAND_LOGOS[brandKey] ?? BRAND_LOGOS.other;
}

export function getBrandImage(brandKey: string): string {
  return BRAND_IMAGE_CATALOG[brandKey] ?? BRAND_IMAGE_CATALOG.other;
}

export function getModelImage(model: string, brandKey?: string): string {
  const match = LINE_IMAGE_HINTS.find((entry) => entry.pattern.test(model));
  if (match) return match.imageUrl;
  if (brandKey) return getBrandImage(brandKey);
  return BRAND_IMAGE_CATALOG.other;
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
    ? uniqueModels.filter((model) => {
      const detected = detectType(model);
      return detected === selectedType || (!detected && matchTypeWithPattern(model, selectedType));
    })
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
        logoUrl: BRAND_LOGOS[brand.key] ?? BRAND_LOGOS.other,
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
        imageUrl: getLineImage(brand.key, seriesLabel),
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
        .map((series) => ({
          ...series,
          imageUrl: getLineImage(brand.key, series.label),
          models: [...series.models].sort(naturalSort),
        }))
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
