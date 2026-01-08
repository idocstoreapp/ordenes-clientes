/**
 * Utilidades para layout adaptativo de PDFs
 * Garantiza que el contenido siempre quepa en una sola hoja
 */

import jsPDF from "jspdf";

export interface SpaceConstraints {
  maxHeight: number;
  minFontSize: number;
  maxFontSize: number;
  lineSpacing: number;
}

/**
 * Calcula el espacio disponible para una sección considerando el espacio reservado para otras secciones
 */
export function calculateAvailableSpace(
  pageHeight: number,
  startY: number,
  reservedSpace: number,
  safetyMargin: number = 10
): number {
  return Math.max(0, pageHeight - startY - reservedSpace - safetyMargin);
}

/**
 * Calcula el tamaño de fuente óptimo para que un texto quepa en un espacio determinado
 */
export function calculateOptimalFontSize(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxHeight: number,
  minFontSize: number = 4,
  maxFontSize: number = 12,
  lineSpacingMultiplier: number = 1.2
): { fontSize: number; lines: string[]; actualHeight: number } {
  // Probar desde el tamaño máximo hacia abajo
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * lineSpacingMultiplier;
    const totalHeight = lines.length * lineHeight;
    
    if (totalHeight <= maxHeight) {
      return {
        fontSize,
        lines,
        actualHeight: totalHeight
      };
    }
  }
  
  // Si no cabe ni con el tamaño mínimo, truncar
  doc.setFontSize(minFontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = minFontSize * lineSpacingMultiplier;
  const maxLines = Math.floor(maxHeight / lineHeight);
  
  if (lines.length > maxLines) {
    const truncatedLines = lines.slice(0, maxLines - 1);
    const lastLine = lines[maxLines - 1] || "";
    const truncatedText = truncatedLines.join(" ") + " " + lastLine.substring(0, Math.max(0, lastLine.length - 10)) + "...";
    const finalLines = doc.splitTextToSize(truncatedText, maxWidth);
    return {
      fontSize: minFontSize,
      lines: finalLines.slice(0, maxLines),
      actualHeight: maxLines * lineHeight
    };
  }
  
  return {
    fontSize: minFontSize,
    lines,
    actualHeight: lines.length * lineHeight
  };
}

/**
 * Trunca un texto inteligentemente si excede el espacio disponible
 */
export function truncateTextIntelligently(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number,
  lineSpacing: number = 4
): string[] {
  const lines = doc.splitTextToSize(text, maxWidth);
  
  if (lines.length <= maxLines) {
    return lines;
  }
  
  // Truncar manteniendo palabras completas cuando sea posible
  const truncatedLines = lines.slice(0, maxLines - 1);
  const lastLine = lines[maxLines - 1] || "";
  
  // Intentar mantener al menos parte de la última línea
  const truncatedText = truncatedLines.join(" ") + " " + lastLine.substring(0, Math.max(0, lastLine.length - 10)) + "...";
  const finalLines = doc.splitTextToSize(truncatedText, maxWidth);
  
  return finalLines.slice(0, maxLines);
}

/**
 * Calcula el espacio necesario para garantías con tamaño de fuente adaptativo
 */
export function calculateWarrantySpace(
  doc: jsPDF,
  warrantyTexts: string[],
  columnWidth: number,
  maxHeight: number,
  minFontSize: number = 4,
  maxFontSize: number = 7
): { fontSize: number; totalHeight: number; lineSpacing: number } {
  // Probar diferentes tamaños de fuente
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
    doc.setFontSize(fontSize);
    const lineSpacing = fontSize * 0.35; // Interlineado adaptativo
    let totalHeight = 10; // Padding superior
    
    warrantyTexts.forEach((text) => {
      const textWithBullet = `• ${text}`;
      const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
      const textHeight = lines.length * lineSpacing;
      const spaceBetween = Math.max(2, fontSize * 0.3);
      totalHeight += textHeight + spaceBetween;
    });
    
    totalHeight += 5; // Padding inferior
    
    if (totalHeight <= maxHeight) {
      return {
        fontSize,
        totalHeight,
        lineSpacing
      };
    }
  }
  
  // Si no cabe, usar el mínimo y ajustar
  doc.setFontSize(minFontSize);
  const lineSpacing = minFontSize * 0.35;
  let totalHeight = 10;
  
  warrantyTexts.forEach((text) => {
    const textWithBullet = `• ${text}`;
    const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
    const textHeight = lines.length * lineSpacing;
    const spaceBetween = Math.max(1.5, minFontSize * 0.25);
    totalHeight += textHeight + spaceBetween;
  });
  
  totalHeight += 5;
  
  return {
    fontSize: minFontSize,
    totalHeight: Math.min(totalHeight, maxHeight),
    lineSpacing
  };
}

/**
 * Verifica que una posición Y no exceda el límite de la página
 */
export function ensureWithinPage(
  yPosition: number,
  neededHeight: number,
  pageHeight: number,
  bottomMargin: number
): number {
  if (yPosition + neededHeight > pageHeight - bottomMargin) {
    // Ajustar hacia arriba si es necesario
    return Math.max(0, pageHeight - bottomMargin - neededHeight);
  }
  return yPosition;
}

