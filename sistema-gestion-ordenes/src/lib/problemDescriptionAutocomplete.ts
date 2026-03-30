export interface ProblemSuggestionContext {
  deviceType: string | null;
  selectedServiceNames: string[];
  currentText: string;
  limit?: number;
}

interface ProblemTemplate {
  id: string;
  text: string;
  deviceTypes: string[];
  serviceKeywords: string[];
  symptomKeywords: string[];
}

const UNIVERSAL_DEVICE = "*";

const PROBLEM_TEMPLATES: ProblemTemplate[] = [
  {
    id: "phone-screen-cracked-no-tests",
    text: "Pantalla trizada con imagen parcial; ingresa encendido; no se prueban funciones completas por daño de display; se cotiza cambio de pantalla y pruebas integrales al finalizar; garantía aplica por defecto del repuesto instalado.",
    deviceTypes: ["iphone", "android", "samsung", "xiaomi", "huawei", "*"],
    serviceKeywords: ["pantalla", "display", "modulo", "módulo", "lcd", "glass"],
    symptomKeywords: ["pantalla", "trizada", "rota", "sin imagen", "negro"],
  },
  {
    id: "phone-battery-drain",
    text: "Equipo ingresa apagado y presenta descarga acelerada; batería no retiene carga según reporte del cliente; no se validan funciones completas hasta reemplazo; se propone cambio de batería certificada y pruebas de carga/consumo al finalizar.",
    deviceTypes: ["iphone", "android", "samsung", "xiaomi", "huawei", "*"],
    serviceKeywords: ["batería", "bateria", "battery"],
    symptomKeywords: ["batería", "bateria", "no carga", "descarga", "apaga"],
  },
  {
    id: "phone-port-charge",
    text: "Equipo con falla de carga intermitente; ingresa encendido; se observan posibles residuos/daño en conector; no se puede garantizar carga estable hasta intervención técnica; se propone limpieza o reemplazo de puerto según diagnóstico interno.",
    deviceTypes: ["iphone", "android", "samsung", "xiaomi", "huawei", "*"],
    serviceKeywords: ["puerto", "carga", "conector", "dock"],
    symptomKeywords: ["no carga", "carga", "conector", "puerto"],
  },
  {
    id: "phone-software-malware",
    text: "Equipo ingresa encendido con lentitud, cierres inesperados y ventanas emergentes; se detectan indicios de software malicioso; se propone respaldo, limpieza de sistema y optimización; pruebas de estabilidad y rendimiento al finalizar el proceso.",
    deviceTypes: ["iphone", "android", "samsung", "xiaomi", "huawei", "*"],
    serviceKeywords: ["software", "virus", "optimización", "optimizacion"],
    symptomKeywords: ["virus", "lento", "se reinicia", "publicidad", "malware"],
  },
  {
    id: "tablet-touch-lcd",
    text: "Tablet ingresa encendida con falla táctil y líneas en pantalla; funciones parciales por daño en módulo; no se realizan pruebas completas de interacción hasta reemplazo; se cotiza cambio de pantalla/táctil y validación funcional posterior.",
    deviceTypes: ["ipad", "tablet"],
    serviceKeywords: ["pantalla", "táctil", "touch", "lcd"],
    symptomKeywords: ["tablet", "ipad", "táctil", "touch", "lineas", "líneas"],
  },
  {
    id: "macbook-keyboard-trackpad",
    text: "MacBook ingresa encendido con falla en teclado/trackpad; se verifica respuesta intermitente; diagnóstico sujeto a apertura técnica para inspección interna; se informará necesidad de reemplazo de componente y se prueban funciones al cierre del servicio.",
    deviceTypes: ["macbook", "notebook", "laptop"],
    serviceKeywords: ["teclado", "trackpad", "keyboard"],
    symptomKeywords: ["teclado", "trackpad", "macbook", "notebook"],
  },
  {
    id: "watch-charge-display",
    text: "Smartwatch ingresa con falla de encendido/carga; respuesta de pantalla limitada; no es posible validar sensores de forma completa hasta intervención; se propone diagnóstico interno y reemplazo de componente según resultado técnico.",
    deviceTypes: ["apple_watch", "watch", "smartwatch"],
    serviceKeywords: ["batería", "pantalla", "carga"],
    symptomKeywords: ["watch", "smartwatch", "no enciende", "no carga"],
  },
  {
    id: "universal-not-power",
    text: "Equipo ingresa apagado y no enciende; no se pueden probar funciones por condición de ingreso; requiere diagnóstico técnico para descartar falla de batería, carga o placa; se informará presupuesto una vez finalizada la evaluación inicial.",
    deviceTypes: [UNIVERSAL_DEVICE],
    serviceKeywords: ["diagnóstico", "diagnostico", "revisión", "revision"],
    symptomKeywords: ["apagado", "no enciende", "muerto"],
  },
];

const DEFAULT_QUICK_CLAUSES = [
  "Ingresa encendido.",
  "Ingresa apagado.",
  "No se prueban funciones por condición de ingreso.",
  "Se prueban funciones al finalizar la intervención.",
  "Garantía aplica por defecto del repuesto instalado.",
];

const QUICK_CLAUSES_BY_DEVICE: Record<string, string[]> = {
  iphone: [
    "Face ID sujeto a pruebas después del cambio de pantalla.",
    "Se valida carga y salud de batería al finalizar.",
  ],
  ipad: [
    "Se valida táctil completo por cuadrantes al finalizar.",
  ],
  macbook: [
    "Diagnóstico interno requiere apertura técnica del equipo.",
    "Se valida teclado, trackpad y puertos al finalizar.",
  ],
  apple_watch: [
    "Se valida carga magnética y respuesta táctil al finalizar.",
  ],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

function isDeviceMatch(templateDevices: string[], deviceType: string | null): boolean {
  if (templateDevices.includes(UNIVERSAL_DEVICE)) return true;
  if (!deviceType) return false;
  const normalizedDeviceType = normalize(deviceType);
  return templateDevices.some((allowed) => normalizedDeviceType.includes(normalize(allowed)));
}

export function getProblemDescriptionSuggestions({
  deviceType,
  selectedServiceNames,
  currentText,
  limit = 5,
}: ProblemSuggestionContext): string[] {
  const normalizedText = normalize(currentText);
  const normalizedServices = selectedServiceNames.map(normalize);

  const ranked = PROBLEM_TEMPLATES
    .map((template) => {
      let score = 0;

      if (isDeviceMatch(template.deviceTypes, deviceType)) {
        score += 0.35;
      }

      if (normalizedServices.some((service) => includesAny(service, template.serviceKeywords))) {
        score += 0.3;
      }

      if (normalizedText && includesAny(normalizedText, template.symptomKeywords)) {
        score += 0.25;
      }

      if (!normalizedText && template.deviceTypes.includes(UNIVERSAL_DEVICE)) {
        score += 0.05;
      }

      return { score, text: template.text };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.text);

  if (ranked.length > 0) return ranked;

  return PROBLEM_TEMPLATES.slice(0, limit).map((template) => template.text);
}

export function getQuickProblemClauses(deviceType: string | null, limit = 6): string[] {
  const base = [...DEFAULT_QUICK_CLAUSES];
  if (!deviceType) return base.slice(0, limit);

  const normalizedDeviceType = normalize(deviceType);
  for (const [type, clauses] of Object.entries(QUICK_CLAUSES_BY_DEVICE)) {
    if (normalizedDeviceType.includes(normalize(type))) {
      base.push(...clauses);
    }
  }

  return Array.from(new Set(base)).slice(0, limit);
}