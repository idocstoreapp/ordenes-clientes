// Base de datos de dispositivos para autocompletado predictivo

export interface DeviceModel {
  base: string;
  variants: string[];
}

export interface DeviceCategory {
  brand: string;
  models: DeviceModel[];
}

export const deviceDatabase: DeviceCategory[] = [
  {
    brand: "iPhone",
    models: [
      { base: "6", variants: ["Plus"] },
      { base: "6s", variants: ["Plus"] },
      { base: "7", variants: ["Plus"] },
      { base: "8", variants: ["Plus"] },
      { base: "X", variants: ["R", "S", "S Max"] },
      { base: "11", variants: ["Pro", "Pro Max"] },
      { base: "12", variants: ["mini", "Pro", "Pro Max"] },
      { base: "13", variants: ["mini", "Pro", "Pro Max"] },
      { base: "14", variants: ["Plus", "Pro", "Pro Max"] },
      { base: "15", variants: ["Plus", "Pro", "Pro Max"] },
      { base: "16", variants: ["Plus", "Pro", "Pro Max"] },
      { base: "17", variants: ["Plus", "Pro", "Pro Max"] },
    ],
  },
  {
    brand: "MacBook",
    models: [
      { base: "MacBook Air M1 13\"", variants: [""] },
      { base: "MacBook Air M2 13\"", variants: [""] },
      { base: "MacBook Air M2 15\"", variants: [""] },
      { base: "MacBook Air M3 13\"", variants: [""] },
      { base: "MacBook Air M3 15\"", variants: [""] },
      { base: "MacBook Pro M1 13\"", variants: [""] },
      { base: "MacBook Pro M1 14\"", variants: [""] },
      { base: "MacBook Pro M1 16\"", variants: [""] },
      { base: "MacBook Pro M2 13\"", variants: [""] },
      { base: "MacBook Pro M2 14\"", variants: [""] },
      { base: "MacBook Pro M2 16\"", variants: [""] },
      { base: "MacBook Pro M2 Pro 14\"", variants: [""] },
      { base: "MacBook Pro M2 Pro 16\"", variants: [""] },
      { base: "MacBook Pro M2 Max 14\"", variants: [""] },
      { base: "MacBook Pro M2 Max 16\"", variants: [""] },
      { base: "MacBook Pro M3 14\"", variants: [""] },
      { base: "MacBook Pro M3 16\"", variants: [""] },
      { base: "MacBook Pro M3 Pro 14\"", variants: [""] },
      { base: "MacBook Pro M3 Pro 16\"", variants: [""] },
      { base: "MacBook Pro M3 Max 14\"", variants: [""] },
      { base: "MacBook Pro M3 Max 16\"", variants: [""] },
    ],
  },
  {
    brand: "iPad",
    models: [
      { base: "iPad", variants: ["9th gen", "10th gen", "11th gen"] },
      { base: "iPad Air", variants: ["4th gen", "5th gen", "M1", "M2"] },
      { base: "iPad Pro", variants: ["11\"", "12.9\"", "M1", "M2", "M4"] },
      { base: "iPad mini", variants: ["6th gen", "7th gen"] },
    ],
  },
  {
    brand: "Apple Watch",
    models: [
      { base: "Apple Watch Series 9", variants: ["41mm", "45mm", "GPS", "GPS + Cellular"] },
      { base: "Apple Watch Series 8", variants: ["41mm", "45mm", "GPS", "GPS + Cellular"] },
      { base: "Apple Watch Series 7", variants: ["41mm", "45mm", "GPS", "GPS + Cellular"] },
      { base: "Apple Watch SE", variants: ["2nd gen", "GPS", "GPS + Cellular"] },
      { base: "Apple Watch Ultra", variants: ["1", "2", "49mm"] },
    ],
  },
];

export function getSmartSuggestions(input: string): string[] {
  if (!input || input.trim().length === 0) {
    return [];
  }

  const normalizedInput = input.trim().toLowerCase();
  const suggestions: string[] = [];
  const added = new Set<string>();

  let matchedCategory: DeviceCategory | null = null;
  let remainingText = normalizedInput;

  for (const category of deviceDatabase) {
    const brandLower = category.brand.toLowerCase();
    if (normalizedInput.startsWith(brandLower)) {
      matchedCategory = category;
      remainingText = normalizedInput.substring(brandLower.length).trim();
      break;
    }
  }

  if (matchedCategory) {
    if (remainingText === "" || remainingText === " ") {
      matchedCategory.models.forEach((model) => {
        const suggestion = `${matchedCategory!.brand} ${model.base}`;
        if (!added.has(suggestion)) {
          suggestions.push(suggestion);
          added.add(suggestion);
        }
      });
    } else {
      matchedCategory.models.forEach((model) => {
        const modelLower = model.base.toLowerCase();
        if (modelLower.includes(remainingText) || remainingText.includes(modelLower)) {
          model.variants.forEach((variant) => {
            if (variant) {
              const suggestion = `${matchedCategory!.brand} ${model.base} ${variant}`;
              if (!added.has(suggestion)) {
                suggestions.push(suggestion);
                added.add(suggestion);
              }
            } else {
              const suggestion = `${matchedCategory!.brand} ${model.base}`;
              if (!added.has(suggestion)) {
                suggestions.push(suggestion);
                added.add(suggestion);
              }
            }
          });
        }
      });
    }
  } else {
    deviceDatabase.forEach((category) => {
      if (category.brand.toLowerCase().includes(normalizedInput)) {
        suggestions.push(category.brand);
        added.add(category.brand);
      }
    });
  }

  return suggestions.slice(0, 10);
}

export function detectDeviceType(deviceName: string): 'iphone' | 'ipad' | 'macbook' | 'apple_watch' | null {
  const lower = deviceName.toLowerCase();
  if (lower.includes('iphone')) return 'iphone';
  if (lower.includes('ipad')) return 'ipad';
  if (lower.includes('macbook')) return 'macbook';
  if (lower.includes('apple watch') || lower.includes('watch')) return 'apple_watch';
  return null;
}



