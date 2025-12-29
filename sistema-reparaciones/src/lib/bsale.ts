/**
 * Helper para validar documentos en Bsale
 * 
 * IMPORTANTE: 
 * - Para pruebas: Crea una cuenta en https://www.bsale.cl y obtén tu token de sandbox
 * - Para producción: Envía un correo a [email protected] desde una cuenta de administrador
 *   solicitando un token de producción para acceder a las boletas reales del cliente.
 * 
 * Agrega en tu archivo .env:
 * PUBLIC_BSALE_ACCESS_TOKEN=token_principal (o usa PUBLIC_BSALE_ACCESS_TOKENS para múltiples tokens separados por coma)
 * 
 * Para múltiples empresas, puedes usar:
 * PUBLIC_BSALE_ACCESS_TOKENS=token1,token2,token3
 * 
 * También puedes configurar la URL base (opcional, por defecto usa api.bsale.cl):
 * PUBLIC_BSALE_API_URL=https://api.bsale.cl (o https://api.bsale.io según tu país)
 */

interface BsaleDocument {
  id?: number;
  number?: string;
  url?: string;
  urlPdf?: string | null; // URL del PDF del documento (según documentación de Bsale)
  urlXml?: string | null; // URL del XML del documento
  total?: number;
  totalAmount?: number;
  [key: string]: any;
}

interface BsaleResponse {
  count?: number;
  items?: BsaleDocument[];
  // Algunas respuestas pueden venir en formato diferente
  [key: string]: any;
}

/**
 * Obtiene los tokens de Bsale configurados
 * Soporta tanto un solo token como múltiples tokens separados por coma
 */
function getBsaleTokens(): string[] {
  // Primero intentar con múltiples tokens (separados por coma)
  const multipleTokens = import.meta.env.PUBLIC_BSALE_ACCESS_TOKENS;
  if (multipleTokens) {
    return multipleTokens.split(',').map((token: string) => token.trim()).filter((token: string) => token.length > 0);
  }
  
  // Si no hay múltiples tokens, usar el token único
  const singleToken = import.meta.env.PUBLIC_BSALE_ACCESS_TOKEN;
  if (singleToken) {
    return [singleToken];
  }
  
  return [];
}

/**
 * Valida un documento con un token específico
 */
async function validateBsaleDocumentWithToken(
  receiptNumber: string,
  accessToken: string,
  apiUrl: string
): Promise<{ exists: boolean; document: BsaleDocument | null; error?: string }> {
  try {
    const url = `${apiUrl}/v1/documents.json?number=${encodeURIComponent(receiptNumber.trim())}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "access_token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = "Token de Bsale inválido o expirado.";
      } else if (response.status === 403) {
        errorMessage = "Token sin permisos.";
      } else if (response.status === 404) {
        // 404 significa que el documento no se encontró con este token
        return {
          exists: false,
          document: null,
        };
      }
      
      return {
        exists: false,
        document: null,
        error: errorMessage,
      };
    }

    const data: BsaleResponse = await response.json();

    // La estructura de respuesta puede variar
    const count = data.count ?? (Array.isArray(data.items) ? data.items.length : 0);
    const items = data.items ?? (Array.isArray(data) ? data : []);

    if (count === 0 || !items || items.length === 0) {
      return {
        exists: false,
        document: null,
      };
    }

    // Tomar el primer documento encontrado
    const document = items[0];
    
    // Extraer información del documento según la estructura de Bsale
    const documentNumber = document.number || document.documentNumber || receiptNumber.trim();
    const documentId = document.id || document.documentId;
    const total = document.totalAmount || document.total || document.amount || null;
    
    // Construir URL del documento
    // La URL web de Bsale para ver documentos es: https://app2.bsale.cl/documents/show/{id}
    // O usar urlPdf si viene en la respuesta de la API
    let documentUrl: string | null = null;
    
    // Prioridad 1: Usar urlPdf si viene en la respuesta (campo oficial de Bsale)
    if (document.urlPdf) {
      documentUrl = document.urlPdf;
    }
    // Prioridad 2: Construir URL web de Bsale usando el ID del documento
    else if (documentId) {
      // URL web de Bsale para ver el documento en la interfaz
      // Formato: https://app2.bsale.cl/documents/show/{id}
      const baseDomain = apiUrl.includes("bsale.cl") ? "app2.bsale.cl" : "app2.bsale.io";
      documentUrl = `https://${baseDomain}/documents/show/${documentId}`;
    }
    // Prioridad 3: Usar otros campos de URL si existen
    else if (document.url || document.href || document.pdfUrl) {
      documentUrl = document.url || document.href || document.pdfUrl || null;
    }
    
    return {
      exists: true,
      document: {
        number: documentNumber,
        url: documentUrl || null,
        totalAmount: total,
        id: documentId,
      },
    };
  } catch (error) {
    console.error("Error validando documento en Bsale con token:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return {
      exists: false,
      document: null,
      error: `Error de conexión: ${errorMessage}`,
    };
  }
}

/**
 * Valida si un número de boleta existe en Bsale
 * Intenta validar con todos los tokens configurados hasta encontrar uno que funcione
 * @param receiptNumber - Número de boleta a validar
 * @param requireValidation - Si es true, bloquea si la factura no existe (default: false para retrocompatibilidad)
 * @returns Objeto con información del documento si existe, null si no existe
 */
export async function validateBsaleDocument(
  receiptNumber: string,
  requireValidation: boolean = false
): Promise<{ exists: boolean; document: BsaleDocument | null; error?: string }> {
  const tokens = getBsaleTokens();
  const apiUrl = import.meta.env.PUBLIC_BSALE_API_URL || "https://api.bsale.cl";

  if (tokens.length === 0) {
    const errorMsg = "Tokens de Bsale no configurados. Configura PUBLIC_BSALE_ACCESS_TOKEN o PUBLIC_BSALE_ACCESS_TOKENS.";
    console.warn(errorMsg);
    
    if (requireValidation) {
      return {
        exists: false,
        document: null,
        error: errorMsg,
      };
    }
    
    return {
      exists: false,
      document: null,
      error: "Token de Bsale no configurado",
    };
  }

  if (!receiptNumber || !receiptNumber.trim()) {
    return {
      exists: false,
      document: null,
      error: "Número de boleta vacío",
    };
  }

  // Intentar validar con cada token hasta encontrar uno que funcione
  let lastError: string | undefined = undefined;
  
  for (const token of tokens) {
    const result = await validateBsaleDocumentWithToken(receiptNumber.trim(), token, apiUrl);
    
    // Si encontramos el documento, retornar inmediatamente
    if (result.exists && result.document) {
      return result;
    }
    
    // Guardar el último error (pero continuar con el siguiente token)
    if (result.error && result.error !== "Error 404: Not Found") {
      lastError = result.error;
    }
  }

  // Si llegamos aquí, no se encontró el documento con ningún token
  if (requireValidation) {
    return {
      exists: false,
      document: null,
      error: `⚠️ El número de factura "${receiptNumber.trim()}" no existe en Bsale. Por favor, verifica que el número sea correcto.`,
    };
  }

  // Si no se requiere validación obligatoria, retornar sin error
  return {
    exists: false,
    document: null,
    error: lastError,
  };
}

/**
 * Genera una URL de Bsale basada en el número de recibo
 * NOTA: Esta función solo genera una URL de búsqueda, no el PDF directo
 * Para obtener el PDF real, se necesita validar el documento con validateBsaleDocument()
 * que obtiene el documentId y construye la URL correcta del PDF
 */
export function generateBsaleUrl(receiptNumber: string): string | null {
  if (!receiptNumber || !receiptNumber.trim()) {
    return null;
  }

  const apiUrl = import.meta.env.PUBLIC_BSALE_API_URL || "https://api.bsale.cl";
  const baseDomain = apiUrl.includes("bsale.cl") ? "bsale.cl" : "bsale.io";
  
  // URL de búsqueda en Bsale (no es el PDF directo)
  // Para obtener el PDF, se necesita validar primero con la API
  return `https://www.${baseDomain}/document?number=${encodeURIComponent(receiptNumber.trim())}`;
}

/**
 * Construye la URL web de Bsale para ver un documento usando el documentId
 * @param documentId - ID del documento en Bsale
 * @param accessToken - Token de acceso (no se usa actualmente, pero se mantiene para compatibilidad)
 */
export function buildBsalePdfUrl(documentId: number | string, accessToken?: string): string | null {
  if (!documentId) {
    return null;
  }

  const apiUrl = import.meta.env.PUBLIC_BSALE_API_URL || "https://api.bsale.cl";
  
  // URL web de Bsale para ver el documento en la interfaz
  // Formato: https://app2.bsale.cl/documents/show/{id}
  // Esta URL abre el documento en la interfaz web de Bsale
  const baseDomain = apiUrl.includes("bsale.cl") ? "app2.bsale.cl" : "app2.bsale.io";
  return `https://${baseDomain}/documents/show/${documentId}`;
}

/**
 * Verifica si un número de recibo ya está registrado en la base de datos
 */
export async function checkReceiptNumberExists(
  receiptNumber: string,
  excludeOrderId?: string
): Promise<boolean> {
  const { supabase } = await import("./supabase");
  
  if (!receiptNumber || !receiptNumber.trim()) {
    return false; // Si está vacío, no hay duplicado
  }
  
  let query = supabase
    .from("orders")
    .select("id")
    .eq("receipt_number", receiptNumber.trim())
    .limit(1);

  if (excludeOrderId) {
    query = query.neq("id", excludeOrderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error verificando recibo duplicado:", error);
    return false; // En caso de error, permitir continuar
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Verifica si un número de orden ya está registrado en la base de datos
 */
export async function checkOrderNumberExists(
  orderNumber: string,
  excludeOrderId?: string
): Promise<boolean> {
  const { supabase } = await import("./supabase");
  
  if (!orderNumber || !orderNumber.trim()) {
    return false; // Si está vacío, no hay duplicado
  }
  
  let query = supabase
    .from("orders")
    .select("id")
    .eq("order_number", orderNumber.trim())
    .limit(1);

  if (excludeOrderId) {
    query = query.neq("id", excludeOrderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error verificando número de orden duplicado:", error);
    return false; // En caso de error, permitir continuar
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Detecta duplicados en una lista de órdenes
 * Retorna un mapa con los IDs de las órdenes que tienen duplicados y el tipo de duplicado
 */
export interface DuplicateInfo {
  hasDuplicateOrderNumber: boolean;
  hasDuplicateReceipt: boolean;
}

export function detectDuplicates(orders: Array<{ id: string; order_number: string; receipt_number?: string | null }>): Record<string, DuplicateInfo> {
  const duplicates: Record<string, DuplicateInfo> = {};
  
  // Contar ocurrencias de números de orden
  const orderNumberCounts: Record<string, string[]> = {};
  // Contar ocurrencias de números de recibo (solo si no son null/empty)
  const receiptNumberCounts: Record<string, string[]> = {};
  
  // Primera pasada: contar ocurrencias
  orders.forEach((order) => {
    const orderNum = order.order_number?.trim();
    if (orderNum) {
      if (!orderNumberCounts[orderNum]) {
        orderNumberCounts[orderNum] = [];
      }
      orderNumberCounts[orderNum].push(order.id);
    }
    
    const receiptNum = order.receipt_number?.trim();
    if (receiptNum) {
      if (!receiptNumberCounts[receiptNum]) {
        receiptNumberCounts[receiptNum] = [];
      }
      receiptNumberCounts[receiptNum].push(order.id);
    }
  });
  
  // Segunda pasada: marcar duplicados
  orders.forEach((order) => {
    const orderNum = order.order_number?.trim();
    const receiptNum = order.receipt_number?.trim();
    
    const hasDuplicateOrderNumber = orderNum ? (orderNumberCounts[orderNum]?.length ?? 0) > 1 : false;
    const hasDuplicateReceipt = receiptNum ? (receiptNumberCounts[receiptNum]?.length ?? 0) > 1 : false;
    
    if (hasDuplicateOrderNumber || hasDuplicateReceipt) {
      duplicates[order.id] = {
        hasDuplicateOrderNumber,
        hasDuplicateReceipt,
      };
    }
  });
  
  return duplicates;
}

