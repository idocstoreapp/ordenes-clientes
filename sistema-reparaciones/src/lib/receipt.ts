/**
 * Utilidades para manejar recibos y URLs de Bsale
 */

/**
 * Detecta si un texto es una URL
 */
export function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // Si no es una URL válida, verificar si empieza con http:// o https://
    return text.trim().startsWith('http://') || text.trim().startsWith('https://');
  }
}

/**
 * Extrae el número de recibo de una URL o texto
 * Intenta extraer el número del texto visible del enlace o de la URL misma
 */
export function extractReceiptNumber(input: string): string {
  const trimmed = input.trim();
  
  // Si es una URL, intentar extraer el número de diferentes formas
  if (isUrl(trimmed)) {
    try {
      const url = new URL(trimmed);
      
      // Buscar número en los parámetros de la URL (ej: ?id=12345, ?number=12345, etc.)
      const params = url.searchParams;
      for (const [key, value] of params.entries()) {
        if (key.toLowerCase().includes('id') || 
            key.toLowerCase().includes('number') || 
            key.toLowerCase().includes('num') ||
            key.toLowerCase().includes('doc') ||
            key.toLowerCase().includes('document')) {
          if (value && /^\d+$/.test(value)) {
            return value;
          }
        }
      }
      
      // Buscar número en el pathname (ej: /document/12345, /boleta/12345, /factura/12345)
      // Buscar patrones como /12345, /document/12345, /boleta/12345, etc.
      const pathMatches = [
        url.pathname.match(/\/(\d{4,})(?:\/|$|\?)/), // Números de 4+ dígitos
        url.pathname.match(/\/(?:document|boleta|factura|recibo|invoice)\/(\d+)/i), // Con palabra clave
        url.pathname.match(/\/(\d+)$/), // Al final del path
      ];
      
      for (const match of pathMatches) {
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // Buscar cualquier número largo en la URL completa
      const allNumbers = trimmed.match(/\d{4,}/g);
      if (allNumbers && allNumbers.length > 0) {
        // Preferir el número más largo (probablemente el ID del documento)
        return allNumbers.sort((a, b) => b.length - a.length)[0];
      }
      
      // Si no se encuentra, devolver cadena vacía para que el usuario pueda ingresarlo
      return '';
    } catch {
      // Si falla el parsing, intentar extraer números del texto
      const numberMatch = trimmed.match(/\d{4,}/);
      return numberMatch ? numberMatch[0] : '';
    }
  }
  
  // Si no es URL, puede ser que el usuario haya pegado el texto visible del enlace
  // Intentar extraer números del texto (preferir números de 4+ dígitos)
  const numberMatch = trimmed.match(/\d{4,}/);
  if (numberMatch) {
    return numberMatch[0];
  }
  
  // Si no hay número largo, buscar cualquier número
  const anyNumber = trimmed.match(/\d+/);
  return anyNumber ? anyNumber[0] : trimmed;
}

/**
 * Procesa el input del recibo: detecta si es URL y extrae información
 * Maneja tanto URLs completas como texto visible de enlaces
 */
export function processReceiptInput(input: string): {
  receiptNumber: string;
  receiptUrl: string;
} {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { receiptNumber: '', receiptUrl: '' };
  }
  
  if (isUrl(trimmed)) {
    // Es una URL completa, extraer el número y guardar la URL
    const receiptNumber = extractReceiptNumber(trimmed);
    return {
      receiptNumber: receiptNumber || '', // Si no se puede extraer, dejar vacío para que el usuario lo ingrese
      receiptUrl: trimmed,
    };
  }
  
  // No es URL completa, puede ser:
  // 1. Solo el número de recibo
  // 2. Texto visible del enlace (que puede contener el número)
  // 3. Una URL parcial o mal formada
  
  // Intentar extraer número del texto
  const receiptNumber = extractReceiptNumber(trimmed);
  
  // Si el texto parece contener una URL parcial (tiene "http" pero no es válida),
  // intentar construir la URL completa
  if (trimmed.toLowerCase().includes('http') || trimmed.includes('bsale') || trimmed.includes('www.')) {
    // Puede ser una URL parcial, intentar construirla
    let potentialUrl = trimmed;
    if (!potentialUrl.startsWith('http://') && !potentialUrl.startsWith('https://')) {
      potentialUrl = 'https://' + potentialUrl;
    }
    
    // Si ahora es una URL válida, usarla
    if (isUrl(potentialUrl)) {
      return {
        receiptNumber: receiptNumber || '',
        receiptUrl: potentialUrl,
      };
    }
  }
  
  // Si no es URL, solo devolver el número extraído
  return {
    receiptNumber: receiptNumber || trimmed,
    receiptUrl: '', // No hay URL si no es un enlace
  };
}

