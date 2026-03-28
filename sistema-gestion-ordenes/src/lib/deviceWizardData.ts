import type { Service } from "@/types";

export interface DeviceTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface DeviceBrandOption {
  id: string;
  label: string;
  icon: string;
  deviceTypes: string[];
  popularModels: string[];
}

export const DEVICE_TYPE_OPTIONS: DeviceTypeOption[] = [
  { id: "iphone", label: "Celular", description: "iPhone, Android, etc.", icon: "📱" },
  { id: "ipad", label: "Tablet", description: "iPad, Android Tablet, etc.", icon: "📱" },
  { id: "macbook", label: "Notebook / Laptop", description: "MacBook, Windows Laptop, etc.", icon: "💻" },
  { id: "apple_watch", label: "Smartwatch", description: "Apple Watch, Android Watch, etc.", icon: "⌚" },
];

export const DEVICE_BRANDS: DeviceBrandOption[] = [
  { id: "apple", label: "iPhone", icon: "🍎", deviceTypes: ["iphone"], popularModels: ["iPhone 15", "iPhone 14 Pro Max", "iPhone 13 Pro", "iPhone 12 Pro Max", "iPhone XR"] },
  { id: "samsung", label: "Samsung", icon: "📱", deviceTypes: ["iphone", "ipad", "apple_watch"], popularModels: ["Samsung S23 Ultra", "Samsung S22", "Samsung A54 5G", "Samsung A15", "Samsung S21 FE"] },
  { id: "xiaomi", label: "Xiaomi", icon: "📱", deviceTypes: ["iphone", "ipad"], popularModels: ["Redmi Note 13 Pro 5G", "Redmi Note 12 Pro Plus", "Redmi Note 10 Pro", "Redmi 12C"] },
  { id: "motorola", label: "Motorola", icon: "📱", deviceTypes: ["iphone"], popularModels: ["Motorola G54 5G", "Moto G34 5G", "Motorola Edge 50 Fusion", "Moto G53 5G"] },
  { id: "huawei", label: "Huawei", icon: "📱", deviceTypes: ["iphone", "ipad", "apple_watch"], popularModels: ["Huawei P30 Pro", "Huawei P40 Lite", "Huawei Y9A", "Huawei Watch GT 3 Pro"] },
  { id: "honor", label: "Honor", icon: "📱", deviceTypes: ["iphone"], popularModels: ["Honor X6A", "Honor 90 Lite", "Honor X8A", "Honor Magic 6 Lite"] },
  { id: "oppo", label: "Oppo", icon: "📱", deviceTypes: ["iphone"], popularModels: ["Oppo A17", "Oppo A57", "Oppo Reno"] },
  { id: "vivo", label: "Vivo", icon: "📱", deviceTypes: ["iphone"], popularModels: ["Vivo Y22S", "Vivo V21 5G", "Vivo Y27"] },
  { id: "lenovo", label: "Lenovo", icon: "💻", deviceTypes: ["ipad", "macbook"], popularModels: ["Lenovo TB-X306X", "Lenovo Tab M10", "Lenovo Ideapad"] },
  { id: "acer", label: "Acer", icon: "💻", deviceTypes: ["macbook"], popularModels: ["Acer Swift 3", "Acer Nitro 5", "Acer Aspire"] },
  { id: "asus", label: "Asus", icon: "💻", deviceTypes: ["macbook"], popularModels: ["Asus TUF", "Asus Zenbook", "Asus ROG Phone 3"] },
  { id: "apple-watch", label: "Apple Watch", icon: "⌚", deviceTypes: ["apple_watch"], popularModels: ["Apple Watch SE 44mm", "Apple Watch Series 6 44mm", "Apple Watch Series 7 45mm"] },
];

const MODELS_BY_TYPE: Record<string, string[]> = {
  iphone: ["iPhone 16 Pro Max", "iPhone 15 Pro", "Samsung S23 Ultra", "Redmi Note 13 Pro 5G", "Motorola G54 5G", "Honor X6A"],
  ipad: ["iPad 10", "iPad 9", "Samsung Tab A9+", "Lenovo TB-X306X", "iPad Pro 11"],
  macbook: ["MacBook Air A2337", "MacBook Pro A2442", "Laptop Acer Swift 3", "Dell Inspiron 15 3511", "Asus TUF FA507"],
  apple_watch: ["Apple Watch SE 44mm", "Apple Watch Series 6 44mm", "Galaxy Watch Active 2", "Huawei Watch GT 3 Pro"],
};

export function getBrandsForDeviceType(deviceType: string | null): DeviceBrandOption[] {
  if (!deviceType) return DEVICE_BRANDS.slice(0, 8);
  return DEVICE_BRANDS.filter((brand) => brand.deviceTypes.includes(deviceType));
}

export function getPopularModels(deviceType: string | null, brandId?: string | null): string[] {
  const fromType = deviceType ? MODELS_BY_TYPE[deviceType] ?? [] : [];
  if (!brandId) return fromType;
  const brand = DEVICE_BRANDS.find((item) => item.id === brandId);
  if (!brand) return fromType;
  const merged = [...brand.popularModels, ...fromType];
  return Array.from(new Set(merged)).slice(0, 8);
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
