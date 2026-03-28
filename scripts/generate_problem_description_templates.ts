import fs from 'fs';
import path from 'path';

function normalize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u00C0-\u017F]/g, c => c.normalize('NFD').replace(/\p{Diacritic}/gu, ''))
    .toLowerCase();
}

const sourcePath = path.join(__dirname, '..', 'sistema-gestion-ordenes', 'problem_description-data.md');
const outputPath = path.join(__dirname, '..', 'sistema-gestion-ordenes', 'problem_description-templates.json');

const raw = fs.readFileSync(sourcePath, 'utf8');
let arr;
try {
  arr = JSON.parse(raw);
} catch (err) {
  // Fallback: data file may be malformed; parse individual object bodies.
  const normalized = raw.replace(/\r\n/g, '\n');
  const objectStrings: string[] = [];
  let depth = 0;
  let startIndex = -1;

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === '{') {
      if (depth === 0) startIndex = i;
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        objectStrings.push(normalized.slice(startIndex, i + 1));
        startIndex = -1;
      }
    }
  }

  const objects: any[] = [];
  for (const objString of objectStrings) {
    try {
      objects.push(JSON.parse(objString));
    } catch {
      // skip invalid object snippet
    }
  }

  if (objects.length === 0) {
    throw new Error(`Error parsing ${sourcePath}: ${err}; fallback object parsing produced zero objects.`);
  }

  arr = objects;
}

const counter = new Map<string, number>();
const keywordCount = new Map<string, number>();

const keywords = [
  /no se pueden probar funciones/i,
  /ingresa apagad/i,
  /ingresa encendid/i,
  /cambio de bateria/i,
  /cambio de pantalla/i,
  /pantalla (rota|trizada|en negro|despegada)/i,
  /bateria inflada/i,
  /carga/i,
  /estetica/i,
  /detalles de uso/i,
  /garantia/i,
  /frp/i,
  /virus/i,
  /speaker/i,
  /no funciona/i,
];

for (const item of arr) {
  if (!item || !item.problem_description) continue;
  const textRaw = item.problem_description.replace(/\n/g, ' ').trim();
  if (!textRaw) continue;
  const text = normalize(textRaw);
  counter.set(text, (counter.get(text) || 0) + 1);

  for (const rx of keywords) {
    if (rx.test(text)) {
      const key = rx.source;
      keywordCount.set(key, (keywordCount.get(key) || 0) + 1);
    }
  }
}

const sortedExact = Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
const top20 = sortedExact.slice(0, 20).map(([problem_description, count]) => ({ problem_description, count }));

const topKeywords = Array.from(keywordCount.entries()).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => ({ pattern, count }));

const essentialTemplate = {
  generatedAt: new Date().toISOString(),
  totalUnique: counter.size,
  totalRecords: arr.length,
  top20MostFrequent: top20,
  commonKeywords: topKeywords,
  recommendedTemplateFields: [
    'estado_inicio: "entraga/apagado/encendido"',
    'daño_fisico: "pantalla rota/tapa trizada"',
    'servicio_requerido: "cambio batería/cambio pantalla"',
    'probada_funciones: "si/no"',
    'garantia: "30 días por defecto de fábrica"',
    'observaciones: "texto libre corto"',
  ],
  suggestedProblemTemplates: [
    'No se pueden probar funciones; pantalla trizada; ingresa apagado; batería no carga.',
    'Cambio de batería certificado; ingresa apagado; se prueban funciones al finalizar.',
    'Pantalla rota en negro; no se prueban funciones; detalles de uso presentes.',
    'Ingresa enciende, tiene virus; cliente paga en efectivo.',
    'Cambio de pantalla, probaremos funciones al finalizar; 30 días de garantía por defectos.',
  ],
};

fs.writeFileSync(outputPath, JSON.stringify(essentialTemplate, null, 2), 'utf8');

console.log(`Generated ${outputPath}`);
console.log(JSON.stringify(essentialTemplate, null, 2));
