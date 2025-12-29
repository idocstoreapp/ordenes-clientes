import jsPDF from "jspdf";
import { supabase } from "./supabase";
import type { WorkOrder, Customer, Branch } from "@/types";
import { formatDate, formatDateTime } from "./date";
import { getSystemSettings } from "./settings";

export async function generateNotePDFBlob(
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null },
  note: string
): Promise<Blob> {
  const settings = await getSystemSettings();
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Color de las franjas (igual que las órdenes)
  const darkStripeColor: [number, number, number] = [30, 58, 138];

  // Cargar logo desde configuración
  let logoDataUrl = "";
  try {
    if (settings.pdf_logo.url.startsWith("data:")) {
      logoDataUrl = settings.pdf_logo.url;
    } else {
      const logoResponse = await fetch(settings.pdf_logo.url);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
      }
    }
  } catch (error) {
    console.error("Error cargando logo:", error);
  }

  // === HEADER CON FRANJA AZUL OSCURA ===
  doc.setFillColor(...darkStripeColor);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Logo de la empresa (sobre la franja, izquierda)
  if (logoDataUrl) {
    const logoHeight = settings.pdf_logo.height;
    const logoWidth = settings.pdf_logo.width;
    const logoY = (32 - logoHeight) / 2;
    doc.addImage(logoDataUrl, "PNG", margin, logoY, logoWidth, logoHeight);
  }

  // Título "NOTA DE ORDEN" en caja gris oscuro (CENTRO del header) - para ahorrar tinta
  doc.setFillColor(80, 80, 80); // Gris oscuro en lugar de negro
  const titleBoxWidth = 60;
  const titleBoxX = (pageWidth - titleBoxWidth) / 2;
  doc.rect(titleBoxX, 10, titleBoxWidth, 12, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("NOTA DE ORDEN", titleBoxX + 3, 16);
  doc.text(`N° ${order.order_number}`, titleBoxX + 3, 21);

  yPosition = 45;

  // === INFORMACIÓN DE LA ORDEN ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Cliente
  if (order.customer) {
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer.name, margin + 25, yPosition);
    yPosition += 7;
  }

  // Equipo
  doc.setFont("helvetica", "bold");
  doc.text("Equipo:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(order.device_model, margin + 25, yPosition);
  yPosition += 7;

  // Fecha
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(formatDateTime(order.created_at), margin + 25, yPosition);
  yPosition += 15;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // === CONTENIDO DE LA NOTA ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("NOTA:", margin, yPosition);
  yPosition += 10;

  // Fondo gris claro para la nota
  const noteBoxY = yPosition;
  const noteBoxHeight = doc.internal.pageSize.getHeight() - yPosition - 40;
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, noteBoxY, contentWidth, noteBoxHeight, "F");

  // Texto de la nota (con wrap automático)
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const maxWidth = contentWidth - 10;
  const lines = doc.splitTextToSize(note, maxWidth);
  
  let noteY = noteBoxY + 8;
  for (let i = 0; i < lines.length; i++) {
    if (noteY + 6 > noteBoxY + noteBoxHeight - 8) {
      // Si se sale del cuadro, agregar nueva página
      doc.addPage();
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - 2 * margin - 20, "F");
      noteY = margin + 8;
    }
    doc.text(lines[i], margin + 5, noteY);
    noteY += 6;
  }

  // === FOOTER ===
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("iDocStore - Servicio Especializado", pageWidth / 2, footerY, { align: "center" });
  
  if (order.sucursal) {
    doc.text(
      order.sucursal.name || order.sucursal.razon_social || '',
      pageWidth / 2,
      footerY + 6,
      { align: "center" }
    );
  }

  // Convertir a Blob
  return doc.output("blob");
}

