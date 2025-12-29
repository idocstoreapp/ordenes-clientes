import jsPDF from "jspdf";
import { supabase } from "./supabase";
import type { WorkOrder, Customer, Branch } from "@/types";
import { formatDate } from "./date";
import { getSystemSettings } from "./settings";

export async function generateNoteImageBlob(
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null },
  note: string
): Promise<Blob> {
  const settings = await getSystemSettings();
  
  // Crear un canvas para generar la imagen
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

  // Dimensiones de la imagen (formato vertical, similar a una tarjeta)
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;

  // Color de fondo blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Cargar logo
  let logoImg: HTMLImageElement | null = null;
  if (settings.pdf_logo.url) {
    try {
      logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        if (settings.pdf_logo.url.startsWith('data:')) {
          img.src = settings.pdf_logo.url;
        } else {
          img.src = settings.pdf_logo.url;
        }
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
    } catch (error) {
      console.error('Error cargando logo:', error);
    }
  }

  // Colores
  const darkStripeColor = '#1e3a8a'; // Azul oscuro
  const textColor = '#000000';
  const lightGrayColor = '#f3f4f6';

  let yPos = 0;

  // === HEADER CON FRANJA AZUL OSCURA ===
  ctx.fillStyle = darkStripeColor;
  ctx.fillRect(0, yPos, width, 100);
  yPos += 100;

  // Logo en el header
  if (logoImg) {
    const logoHeight = 60;
    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
    const logoX = 40;
    const logoY = 20;
    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  }

  // Título "NOTA DE ORDEN" en el header (centrado)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOTA DE ORDEN', width / 2, 50);

  // === CONTENIDO ===
  const margin = 40;
  let contentY = yPos + margin;

  // Datos del cliente
  ctx.fillStyle = textColor;
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  if (order.customer) {
    ctx.fillText('Cliente:', margin, contentY);
    contentY += 30;
    ctx.font = '16px Arial';
    ctx.fillText(order.customer.name, margin + 20, contentY);
    contentY += 35;
  }

  // Modelo del equipo
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Equipo:', margin, contentY);
  contentY += 30;
  ctx.font = '16px Arial';
  ctx.fillText(order.device_model, margin + 20, contentY);
  contentY += 40;

  // Número de orden
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Orden:', margin, contentY);
  contentY += 30;
  ctx.font = '16px Arial';
  ctx.fillText(order.order_number, margin + 20, contentY);
  contentY += 40;

  // Fecha
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Fecha:', margin, contentY);
  contentY += 30;
  ctx.font = '16px Arial';
  ctx.fillText(formatDate(order.created_at), margin + 20, contentY);
  contentY += 50;

  // Línea separadora
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, contentY);
  ctx.lineTo(width - margin, contentY);
  ctx.stroke();
  contentY += 40;

  // === NOTA (CONTENIDO PRINCIPAL) ===
  ctx.font = 'bold 20px Arial';
  ctx.fillText('NOTA:', margin, contentY);
  contentY += 40;

  // Fondo para la nota
  const noteBoxY = contentY;
  const noteBoxHeight = height - contentY - 100;
  ctx.fillStyle = lightGrayColor;
  ctx.fillRect(margin, noteBoxY, width - 2 * margin, noteBoxHeight);

  // Texto de la nota (con wrap automático)
  ctx.fillStyle = textColor;
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const maxWidth = width - 2 * margin - 40;
  const words = note.split(' ');
  let line = '';
  let lineY = noteBoxY + 30;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, margin + 20, lineY);
      line = words[i] + ' ';
      lineY += 30;
      
      // Si se sale del cuadro, detener
      if (lineY > noteBoxY + noteBoxHeight - 30) {
        break;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, margin + 20, lineY);

  // === FOOTER ===
  const footerY = height - 60;
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('iDocStore - Servicio Especializado', width / 2, footerY);
  
  if (order.sucursal) {
    ctx.fillText(
      order.sucursal.name || order.sucursal.razon_social || '',
      width / 2,
      footerY + 20
    );
  }

  // Convertir canvas a Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Error al generar imagen'));
      }
    }, 'image/jpeg', 0.95);
  });
}

