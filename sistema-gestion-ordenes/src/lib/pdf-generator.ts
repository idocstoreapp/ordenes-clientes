import jsPDF from "jspdf";
import type { WorkOrder, Service, Customer, Branch } from "@/types";
import { formatCLP } from "./currency";
import { formatDate } from "./date";

interface OrderWithRelations extends WorkOrder {
  customer?: Customer;
  sucursal?: Branch | null;
}

export function generateOrderPDF(
  order: OrderWithRelations,
  services: Service[],
  serviceValue: number,
  replacementCost: number,
  warrantyDays: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Función para agregar nueva página si es necesario
  function checkPageBreak(neededSpace: number) {
    if (yPosition + neededSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }
  }

  // Nombre de la empresa
  const companyName = order.sucursal?.razon_social || order.sucursal?.name || "IDoc STORE";
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, yPosition);
  
  // Nota: El logo se puede agregar si se convierte a base64, por ahora solo texto
  // Si hay logo_url de la sucursal, se podría cargar aquí convertido a base64

  yPosition += 10;

  // Datos de la empresa
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (order.sucursal?.address) {
    doc.text(`Dirección: ${order.sucursal.address}`, margin, yPosition);
    yPosition += 6;
  }
  if (order.sucursal?.phone) {
    doc.text(`Teléfono: ${order.sucursal.phone}`, margin, yPosition);
    yPosition += 6;
  }
  if (order.sucursal?.email) {
    doc.text(`Email: ${order.sucursal.email}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEN DE TRABAJO", margin, yPosition);
  yPosition += 10;

  // Número de orden y fecha
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`N° Orden: ${order.order_number}`, margin, yPosition);
  doc.text(`Fecha: ${formatDate(order.created_at)}`, pageWidth - margin - 60, yPosition);
  yPosition += 15;

  // Datos del cliente
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (order.customer) {
    doc.text(`Nombre: ${order.customer.name}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Email: ${order.customer.email}`, margin, yPosition);
    yPosition += 6;
    const phoneText = order.customer.phone_country_code 
      ? `${order.customer.phone_country_code} ${order.customer.phone}`
      : order.customer.phone;
    doc.text(`Teléfono: ${phoneText}`, margin, yPosition);
    yPosition += 6;
    if (order.customer.rut_document) {
      doc.text(`RUT/Documento: ${order.customer.rut_document}`, margin, yPosition);
      yPosition += 6;
    }
    if (order.customer.address) {
      doc.text(`Dirección: ${order.customer.address}`, margin, yPosition);
      yPosition += 6;
    }
  }

  yPosition += 10;

  // Línea separadora
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Datos del dispositivo
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL DISPOSITIVO", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Tipo: ${order.device_type.toUpperCase()}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Modelo: ${order.device_model}`, margin, yPosition);
  yPosition += 6;
  if (order.device_serial_number) {
    doc.text(`N° Serie: ${order.device_serial_number}`, margin, yPosition);
    yPosition += 6;
  }
  if (order.device_unlock_code) {
    doc.text(`Código desbloqueo: ${order.device_unlock_code}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Descripción del problema
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPCIÓN DEL PROBLEMA", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const problemLines = doc.splitTextToSize(order.problem_description, contentWidth);
  doc.text(problemLines, margin, yPosition);
  yPosition += problemLines.length * 5 + 10;

  checkPageBreak(30);

  // Servicios
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICIOS", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  services.forEach((service) => {
    doc.text(`• ${service.name}`, margin + 5, yPosition);
    yPosition += 6;
  });

  yPosition += 10;

  checkPageBreak(40);

  // Resumen de costos
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE COSTOS", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let tableY = yPosition;
  doc.text("Concepto", margin, tableY);
  doc.text("Valor", pageWidth - margin - 60, tableY);
  tableY += 6;
  
  doc.line(margin, tableY, pageWidth - margin, tableY);
  tableY += 8;

  if (replacementCost > 0) {
    doc.text("Costo Repuesto:", margin, tableY);
    doc.text(formatCLP(replacementCost, { withLabel: false }), pageWidth - margin - 60, tableY);
    tableY += 8;
  }

  doc.text("Valor del Servicio:", margin, tableY);
  doc.setFont("helvetica", "bold");
  doc.text(formatCLP(serviceValue, { withLabel: false }), pageWidth - margin - 60, tableY);
  tableY += 8;

  doc.setFont("helvetica", "normal");
  doc.line(margin, tableY, pageWidth - margin, tableY);
  tableY += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", margin, tableY);
  doc.text(formatCLP(order.total_repair_cost, { withLabel: false }), pageWidth - margin - 60, tableY);
  yPosition = tableY + 15;

  checkPageBreak(60);

  // Políticas de garantía
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("POLÍTICAS DE GARANTÍA", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const warrantyText = [
    `• La garantía cubre defectos de mano de obra y repuestos por ${warrantyDays} días a partir de la fecha de entrega.`,
    "• La garantía NO cubre daños por mal uso, golpes, caídas o líquidos.",
    "• La garantía NO cubre accesorios que no fueron reemplazados.",
    "• Para hacer efectiva la garantía, el dispositivo debe estar en las mismas condiciones físicas al momento de la reparación.",
    "• Cualquier intento de reparación por terceros anula la garantía.",
    "• La empresa se reserva el derecho de evaluar cada caso de garantía."
  ];

  warrantyText.forEach((text) => {
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin + 5, yPosition);
    yPosition += lines.length * 4.5;
  });

  yPosition += 10;

  checkPageBreak(50);

  // Medios de pago
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("MEDIOS DE PAGO", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const paymentMethods = [
    "• EFECTIVO",
    "• TARJETA DE DÉBITO/CRÉDITO",
    "• TRANSFERENCIA BANCARIA"
  ];

  paymentMethods.forEach((method) => {
    doc.text(method, margin + 5, yPosition);
    yPosition += 6;
  });

  yPosition += 15;

  checkPageBreak(40);

  // Espacio para firmas
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FIRMAS", margin, yPosition);
  yPosition += 15;

  // Línea para firma cliente
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.line(margin, yPosition, margin + 80, yPosition);
  doc.text("Cliente", margin, yPosition + 6);

  // Línea para firma empresa
  doc.line(pageWidth - margin - 80, yPosition, pageWidth - margin, yPosition);
  doc.text("Sucursal", pageWidth - margin - 80, yPosition + 6);

  yPosition += 20;

  // Nota final
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  const noteText = "Este documento es una orden de trabajo. Conserve este documento para retirar su dispositivo reparado.";
  const noteLines = doc.splitTextToSize(noteText, contentWidth);
  doc.text(noteLines, margin, yPosition);

  // Descargar PDF
  const fileName = `Orden_${order.order_number}_${formatDate(order.created_at).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}

