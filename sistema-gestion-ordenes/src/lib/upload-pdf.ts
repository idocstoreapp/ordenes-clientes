import { supabase } from "./supabase";

/**
 * Sube un PDF a Supabase Storage y retorna la URL pública
 * @param pdfBlob - El PDF como Blob
 * @param orderNumber - Número de orden para el nombre del archivo
 * @returns URL pública del PDF o null si hay error
 */
export async function uploadPDFToStorage(
  pdfBlob: Blob,
  orderNumber: string
): Promise<string | null> {
  try {
    const fileName = `orden-${orderNumber}-${Date.now()}.pdf`;
    const filePath = `orders/${fileName}`;

    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('order-pdfs')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true // Sobrescribir si existe
      });

    if (error) {
      console.error("[UPLOAD PDF] Error subiendo PDF:", error);
      throw error;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('order-pdfs')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error("[UPLOAD PDF] No se pudo obtener URL pública");
      return null;
    }

    console.log("[UPLOAD PDF] PDF subido exitosamente:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[UPLOAD PDF] Error en uploadPDFToStorage:", error);
    return null;
  }
}








