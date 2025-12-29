// Base de datos de dispositivos para autocompletado predictivo

export interface DeviceModel {
  base: string; // Modelo base (ej: "iPhone 11")
  variants: string[]; // Variantes (ej: ["Pro", "Pro Max", "Mini"])
}

export interface DeviceCategory {
  brand: string; // Marca
  models: DeviceModel[]; // Lista de modelos
}

// Base de datos completa de dispositivos
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
      // MacBook Air - modelos exactos completos con procesador y tamaño
      { base: "MacBook Air M1 13\"", variants: [""] },
      { base: "MacBook Air M2 13\"", variants: [""] },
      { base: "MacBook Air M2 15\"", variants: [""] },
      { base: "MacBook Air M3 13\"", variants: [""] },
      { base: "MacBook Air M3 15\"", variants: [""] },
      // MacBook Pro - modelos exactos completos con procesador y tamaño
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
      // MacBook clásico
      { base: "MacBook 12\"", variants: ["Retina"] },
      { base: "MacBook Retina", variants: [""] },
      // iMac - modelos exactos
      { base: "iMac M1 24\"", variants: [""] },
      { base: "iMac M3 24\"", variants: [""] },
      { base: "iMac 21.5\"", variants: [""] },
      { base: "iMac 27\"", variants: [""] },
      // Mac mini - modelos exactos
      { base: "Mac mini M1", variants: [""] },
      { base: "Mac mini M2", variants: [""] },
      { base: "Mac mini M4", variants: [""] },
      // Mac Pro
      { base: "Mac Pro 2019", variants: [""] },
      { base: "Mac Pro M2 Ultra", variants: [""] },
      // Mac Studio - modelos exactos
      { base: "Mac Studio M1 Max", variants: [""] },
      { base: "Mac Studio M1 Ultra", variants: [""] },
      { base: "Mac Studio M2 Max", variants: [""] },
      { base: "Mac Studio M2 Ultra", variants: [""] },
      { base: "Mac Studio M4", variants: [""] },
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
      { base: "Apple Watch Hermès", variants: [""] },
      { base: "Apple Watch Nike", variants: [""] },
    ],
  },
  {
    brand: "Huawei",
    models: [
      { base: "Huawei P60", variants: ["", "Pro", "Art"] },
      { base: "Huawei P60 Pro", variants: ["", "Art"] },
      { base: "Huawei Mate 60", variants: ["", "Pro", "Pro+", "RS"] },
      { base: "Huawei Mate 60 Pro", variants: ["", "RS"] },
      { base: "Huawei Mate X5", variants: ["", "Pro"] },
      { base: "Huawei Nova 12", variants: ["", "Pro", "Ultra"] },
      { base: "Huawei Nova 11", variants: ["", "Pro", "Ultra"] },
      { base: "Huawei Pocket S", variants: [""] },
      { base: "Huawei P50", variants: ["", "Pro"] },
      { base: "Huawei Mate 50", variants: ["", "Pro", "RS"] },
    ],
  },
  {
    brand: "Samsung",
    models: [
      { base: "Samsung Galaxy S24", variants: ["", "Ultra", "+"] },
      { base: "Samsung Galaxy S23", variants: ["", "Ultra", "+", "FE"] },
      { base: "Samsung Galaxy S22", variants: ["", "Ultra", "+"] },
      { base: "Samsung Galaxy Z Fold", variants: ["5", "6", "7"] },
      { base: "Samsung Galaxy Z Flip", variants: ["4", "5", "6"] },
      { base: "Samsung Galaxy Note", variants: ["20", "20 Ultra"] },
      { base: "Samsung Galaxy A54", variants: [""] },
      { base: "Samsung Galaxy A34", variants: [""] },
      { base: "Samsung Galaxy A24", variants: [""] },
      { base: "Samsung Galaxy A14", variants: [""] },
    ],
  },
];


// Función mejorada para obtener sugerencias inteligentes
export function getSmartSuggestions(input: string): string[] {
  if (!input || input.trim().length === 0) {
    return [];
  }

  const normalizedInput = input.trim().toLowerCase();
  const suggestions: string[] = [];
  const added = new Set<string>();

  // Detectar la marca
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
    // Si solo escribió la marca (ej: "iphone" o "iphone "), mostrar modelos base
    if (remainingText === "" || remainingText === " ") {
      matchedCategory.models.forEach((model) => {
        const suggestion = `${matchedCategory!.brand} ${model.base}`;
        if (!added.has(suggestion)) {
          suggestions.push(suggestion);
          added.add(suggestion);
        }
      });
    } else {
      // Buscar si ya tiene un modelo base completo escrito
      let matchedModel: DeviceModel | null = null;
      
      for (const model of matchedCategory.models) {
        const modelLower = model.base.toLowerCase();
        const fullModelBase = `${matchedCategory.brand} ${model.base}`.toLowerCase();
        
        // Verificar si el input contiene el modelo base completo
        // Ej: "iphone 11" -> debe coincidir con "iPhone 11"
        if (normalizedInput === fullModelBase || normalizedInput.startsWith(fullModelBase + " ")) {
          matchedModel = model;
          break;
        }
        
        // También verificar si el input contiene solo la parte del modelo después de la marca
        // Ej: si escribió "iphone 11", remainingText sería "11", y model.base sería "11"
        if (remainingText === modelLower || remainingText.startsWith(modelLower + " ")) {
          matchedModel = model;
          break;
        }
        
        // Verificar coincidencia parcial (el modelo empieza con lo que escribió)
        // Ej: si escribió "iphone 1", debe coincidir con modelos que empiecen con "1" (11, 12, 13, etc.)
        if (modelLower.startsWith(remainingText) || remainingText.startsWith(modelLower)) {
          matchedModel = model;
          break;
        }
      }
      
      if (matchedModel) {
        // Verificar si el input ya incluye alguna variante
        const inputHasVariant = matchedModel.variants.some(variant => {
          if (!variant) return false;
          const variantLower = variant.toLowerCase();
          return normalizedInput.includes(variantLower);
        });
        
        // Si ya tiene una variante, no mostrar más sugerencias
        if (inputHasVariant) {
          // Mostrar solo el input actual si es válido
          return [];
        }
        
        // Si no tiene variante, mostrar variantes del modelo
        matchedModel.variants.forEach((variant) => {
          if (variant) {
            const suggestion = `${matchedCategory!.brand} ${matchedModel!.base} ${variant}`.trim();
            if (!added.has(suggestion)) {
              suggestions.push(suggestion);
              added.add(suggestion);
            }
          } else {
            // Variante vacía = modelo base sin variante (ya está en el input)
            // No agregar duplicado
          }
        });
      } else {
        // No encontró modelo exacto, buscar modelos que empiecen con lo que escribió
        matchedCategory.models.forEach((model) => {
          const modelLower = model.base.toLowerCase();
          // Verificar si el modelo coincide parcialmente
          // Si escribió "iphone 1", mostrar "iPhone 11", "iPhone 12", "iPhone 13", etc.
          if (modelLower.startsWith(remainingText) || remainingText.startsWith(modelLower)) {
            const suggestion = `${matchedCategory!.brand} ${model.base}`;
            if (!added.has(suggestion)) {
              suggestions.push(suggestion);
              added.add(suggestion);
            }
          } else if (remainingText && modelLower.includes(remainingText)) {
            // Coincidencia parcial dentro del modelo
            const suggestion = `${matchedCategory!.brand} ${model.base}`;
            if (!added.has(suggestion)) {
              suggestions.push(suggestion);
              added.add(suggestion);
            }
          }
        });
      }
    }
  } else {
    // No detectó marca específica, buscar en todas las marcas que empiecen con el input
    for (const category of deviceDatabase) {
      const brandLower = category.brand.toLowerCase();
      if (brandLower.startsWith(normalizedInput) || normalizedInput.startsWith(brandLower.substring(0, normalizedInput.length))) {
        // Si el input es solo el inicio de una marca, mostrar todos los modelos base
        category.models.forEach((model) => {
          const suggestion = `${category.brand} ${model.base}`;
          if (!added.has(suggestion)) {
            suggestions.push(suggestion);
            added.add(suggestion);
          }
        });
      }
    }
  }

  return suggestions.slice(0, 10);
}

