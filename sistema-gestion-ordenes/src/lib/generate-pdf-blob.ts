import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "./supabase";
import type { WorkOrder, Service, Customer, Branch, DeviceChecklistItem } from "@/types";
import { formatCLP } from "./currency";
import { formatDate, formatDateTime } from "./date";
import { getSystemSettings } from "./settings";

export async function generatePDFBlob(
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null },
  services: Service[],
  serviceValue: number,
  replacementCost: number,
  warrantyDays: number,
  checklistData?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null,
  notes?: string[],
  orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string }>
): Promise<Blob> {
  // Cargar items del checklist si existen
  let checklistItems: DeviceChecklistItem[] = [];
  if (checklistData && Object.keys(checklistData).length > 0) {
    const { data } = await supabase
      .from("device_checklist_items")
      .select("*")
      .eq("device_type", order.device_type)
      .order("item_order");
    if (data) {
      checklistItems = data;
    }
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Cargar configuración del sistema
  const settings = await getSystemSettings();

  // Color de las franjas (gris claro para ahorrar tinta)
  const stripeColor: [number, number, number] = [220, 220, 220]; // Gris claro
  const darkStripeColor: [number, number, number] = [200, 200, 200]; // Gris medio claro

  // Generar QR Code
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(
      `https://ordenes.idocstore.cl/${order.order_number}`,
      { width: 60, margin: 1 }
    );
  } catch (error) {
    console.error("Error generando QR:", error);
  }

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

  // N° Orden en caja pequeña (CENTRO del header) - solo el texto "N° Orden:" dentro
  doc.setFillColor(80, 80, 80); // Gris oscuro
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const orderLabelText = "N° Orden:";
  const orderLabelWidth = doc.getTextWidth(orderLabelText);
  const orderBoxWidth = orderLabelWidth + 6; // Solo el ancho necesario + padding
  const orderBoxHeight = 7; // Altura más pequeña
  const orderBoxX = (pageWidth - orderBoxWidth) / 2;
  const orderBoxY = 8;
  doc.rect(orderBoxX, orderBoxY, orderBoxWidth, orderBoxHeight, "F");
  
  // Texto "N° Orden:" dentro del cuadro (blanco)
  doc.setTextColor(255, 255, 255);
  doc.text(orderLabelText, orderBoxX + 3, orderBoxY + 5);
  
  // Número de orden y fecha fuera del cuadro, abajo (negro)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const orderNumberY = orderBoxY + orderBoxHeight + 4;
  doc.text(order.order_number, orderBoxX + (orderBoxWidth - doc.getTextWidth(order.order_number)) / 2, orderNumberY);
  doc.setFontSize(7);
  const dateTimeText = formatDateTime(order.created_at);
  const dateTimeY = orderNumberY + 4;
  doc.text(dateTimeText, orderBoxX + (orderBoxWidth - doc.getTextWidth(dateTimeText)) / 2, dateTimeY);

  // QR Code (esquina superior derecha del header)
  if (qrDataUrl) {
    const qrSize = 20;
    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - qrSize, 6, qrSize, qrSize);
  }

  yPosition = 45;

  // === PANEL NEGOCIO (Izquierda) ===
  const panelStartY = yPosition;
  
  // Primero calcular la altura necesaria dibujando el contenido temporalmente
  let tempPanelY = yPosition + 10;
  const branchName = order.sucursal?.name || "Sucursal";
  const nameLines = doc.splitTextToSize(branchName, (contentWidth - 10) / 2 - 30);
  tempPanelY += nameLines.length * 5;
  
  if (order.sucursal?.address) {
    const addressLines = doc.splitTextToSize(order.sucursal.address, (contentWidth - 10) / 2 - 30);
    tempPanelY += addressLines.length * 5;
  }
  if (order.sucursal?.phone) {
    tempPanelY += 5;
  }
  if (order.sucursal?.email) {
    tempPanelY += 5;
  }
  
  const businessPanelHeight = tempPanelY - panelStartY + 2;
  
  // Dibujar fondo y borde del panel PRIMERO
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, panelStartY, (contentWidth - 10) / 2, businessPanelHeight, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, panelStartY, (contentWidth - 10) / 2, businessPanelHeight, "S");
  
  // Título del panel con franja azul
  doc.setFillColor(...stripeColor);
  doc.rect(margin, yPosition, (contentWidth - 10) / 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("iDocStore", margin + 3, yPosition + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let panelY = yPosition + 10;

  // Nombre de la sucursal
  doc.setFont("helvetica", "bold");
  doc.text("Sucursal:", margin + 3, panelY);
  doc.setFont("helvetica", "normal");
  doc.text(nameLines, margin + 25, panelY);
  panelY += nameLines.length * 5;

  if (order.sucursal?.address) {
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", margin + 3, panelY);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(order.sucursal.address, (contentWidth - 10) / 2 - 30);
    doc.text(addressLines, margin + 25, panelY);
    panelY += addressLines.length * 5;
  }

  if (order.sucursal?.phone) {
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", margin + 3, panelY);
    doc.setFont("helvetica", "normal");
    doc.text(order.sucursal.phone, margin + 25, panelY);
    panelY += 5;
  }

  if (order.sucursal?.email) {
    doc.setFont("helvetica", "bold");
    doc.text("Correo:", margin + 3, panelY);
    doc.setFont("helvetica", "normal");
    doc.text(order.sucursal.email, margin + 25, panelY);
    panelY += 5;
  }

  // === PANEL CLIENTE (Derecha) ===
  const clientPanelX = margin + (contentWidth - 10) / 2 + 10;
  const clientPanelStartY = yPosition;
  
  // Calcular altura necesaria primero
  let tempClientPanelY = yPosition + 10;
  if (order.customer) {
    tempClientPanelY += 5; // Nombre
    tempClientPanelY += 5; // Teléfono
    tempClientPanelY += 5; // Correo
    if (order.customer.address) {
      const addressLines = doc.splitTextToSize(order.customer.address, (contentWidth - 10) / 2 - 30);
      tempClientPanelY += addressLines.length * 5;
    }
  }
  const clientPanelHeight = tempClientPanelY - clientPanelStartY + 2;
  
  // Dibujar fondo y borde del panel PRIMERO
  doc.setFillColor(250, 250, 250);
  doc.rect(clientPanelX, clientPanelStartY, (contentWidth - 10) / 2, clientPanelHeight, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(clientPanelX, clientPanelStartY, (contentWidth - 10) / 2, clientPanelHeight, "S");
  
  doc.setFillColor(...stripeColor);
  doc.rect(clientPanelX, yPosition, (contentWidth - 10) / 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", clientPanelX + 3, yPosition + 6);

  if (order.customer) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    panelY = yPosition + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Nombre:", clientPanelX + 3, panelY);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer.name, clientPanelX + 25, panelY);
    panelY += 5;

    const phoneText = order.customer.phone_country_code
      ? `${order.customer.phone_country_code} ${order.customer.phone}`
      : order.customer.phone;
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", clientPanelX + 3, panelY);
    doc.setFont("helvetica", "normal");
    doc.text(phoneText, clientPanelX + 25, panelY);
    panelY += 5;

    doc.setFont("helvetica", "bold");
    doc.text("Correo:", clientPanelX + 3, panelY);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer.email, clientPanelX + 25, panelY);
    panelY += 5;

    if (order.customer.address) {
      doc.setFont("helvetica", "bold");
      doc.text("Dirección:", clientPanelX + 3, panelY);
      doc.setFont("helvetica", "normal");
      const addressLines = doc.splitTextToSize(order.customer.address, (contentWidth - 10) / 2 - 30);
      doc.text(addressLines, clientPanelX + 25, panelY);
      panelY += addressLines.length * 5;
    }
  }

  // Usar la altura máxima de ambos paneles para continuar
  yPosition = Math.max(panelStartY + businessPanelHeight, clientPanelStartY + clientPanelHeight) + 5;

  // === PANEL DATOS DEL EQUIPO ===
  const equipmentPanelStartY = yPosition;
  const estimatedPanelHeight = 300;
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPosition, contentWidth, estimatedPanelHeight, "F");
  
  doc.setFillColor(...stripeColor);
  doc.rect(margin, yPosition, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL EQUIPO", margin + 3, yPosition + 6);

  yPosition += 12;

  // Tabla
  const tableY = yPosition;
  const colWidths = [10, 32, 95, 37];
  let colX = margin + 3;

  doc.setFillColor(230, 230, 230);
  const totalTableWidth = Math.min(colWidths.reduce((sum, w) => sum + w, 0), contentWidth - 6);
  doc.rect(margin + 3, tableY, totalTableWidth, 7, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", colX + 2, tableY + 5);
  colX += colWidths[0];
  doc.text("Modelo", colX + 2, tableY + 5);
  colX += colWidths[1];
  doc.text("Nota [Descripción]", colX + 2, tableY + 5);
  colX += colWidths[2];
  const totalHeaderText = "Total";
  const totalHeaderWidth = doc.getTextWidth(totalHeaderText);
  doc.text(totalHeaderText, colX + colWidths[3] - totalHeaderWidth - 2, tableY + 5);

  yPosition = tableY + 10;

  // Fila 1: Equipo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const equipmentRowY = yPosition;
  colX = margin + 3;
  doc.text("1", colX, yPosition);
  colX += colWidths[0];
  
  let modelText = order.device_model || "";
  if (order.device_serial_number) {
    modelText += `\nIMEI: ${order.device_serial_number}`;
  }
  if (order.device_unlock_code) {
    modelText += `\nPASSCODE: ${order.device_unlock_code}`;
  }
  if (order.device_unlock_pattern && Array.isArray(order.device_unlock_pattern)) {
    modelText += `\nPASSCODE: ${order.device_unlock_pattern.join("")}`;
  }
  
  const modelColWidth = colWidths[1] - 4;
  const modelLines = doc.splitTextToSize(modelText, modelColWidth);
  let modelY = yPosition;
  modelLines.forEach((line: string) => {
    doc.text(line, colX + 2, modelY);
    modelY += 4;
  });
  
  colX += colWidths[1];
  
  let deviceDescription = "";
  if (order.problem_description) {
    deviceDescription += order.problem_description;
  }
  
  if (notes && notes.length > 0) {
    if (deviceDescription) deviceDescription += "\n";
    notes.forEach((note) => {
      deviceDescription += `${note}\n`;
    });
  }
  
  // La columna de descripción es solo para descripciones, NO para checklist
  
  const descriptionColWidth = colWidths[2] - 6;
  const descriptionLines = doc.splitTextToSize(deviceDescription || "-", descriptionColWidth);
  
  let descY = yPosition;
  descriptionLines.forEach((line: string) => {
    doc.text(line, colX, descY);
    descY += 4;
  });
  
  const maxDescHeight = Math.max(
    Math.max(7, modelLines.length * 4),
    Math.max(7, descriptionLines.length * 4)
  );
  yPosition = equipmentRowY + maxDescHeight;
  
  colX = margin + 3 + colWidths[0] + colWidths[1] + colWidths[2];
  const totalDash = "-";
  const totalDashWidth = doc.getTextWidth(totalDash);
  doc.text(totalDash, colX + colWidths[3] - totalDashWidth - 2, equipmentRowY);

  // Servicios - usar orderServices si está disponible
  const servicesToShow = orderServices && orderServices.length > 0 
    ? orderServices.map(os => ({
        name: os.service_name,
        quantity: os.quantity || 1,
        unit_price: os.unit_price || 0,
        total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
        description: null
      }))
    : services.map(s => ({
        name: s.name,
        quantity: 1,
        unit_price: s.default_price || 0,
        total_price: s.default_price || 0,
        description: s.description
      }));

  servicesToShow.forEach((serviceItem) => {
    colX = margin + 3;
    doc.text("-", colX + 2, yPosition);
    colX += colWidths[0];
    const serviceNameText = serviceItem.name.toUpperCase();
    const serviceNameLines = doc.splitTextToSize(serviceNameText, colWidths[1] - 4);
    doc.text(serviceNameLines, colX + 2, yPosition);
    colX += colWidths[1];
    const serviceNote = serviceItem.description || order.problem_description.substring(0, 30);
    const noteLines = doc.splitTextToSize((serviceNote || "Servicio de reparación"), colWidths[2] - 4);
    doc.text(noteLines, colX + 2, yPosition);
    colX += colWidths[2];
    // Usar total_price del item (quantity * unit_price)
    const totalAmount = serviceItem.total_price;
    const totalText = formatCLP(totalAmount, { withLabel: false });
    doc.setFontSize(8);
    const totalWidth = doc.getTextWidth(totalText);
    const totalX = colX + colWidths[3] - totalWidth - 2;
    doc.text(totalText, totalX, yPosition);
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    const detailText = `${serviceItem.quantity} x ${formatCLP(serviceItem.unit_price, { withLabel: false })}`;
    const detailWidth = doc.getTextWidth(detailText);
    const detailX = colX + colWidths[3] - detailWidth - 2;
    doc.text(detailText, detailX, yPosition + 3);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    const maxHeight = Math.max(
      serviceNameLines.length * 4,
      noteLines.length * 4,
      7 + 3
    );
    yPosition += maxHeight;
  });

  // Repuesto
  if (replacementCost > 0) {
    colX = margin + 3;
    doc.text("-", colX + 2, yPosition);
    colX += colWidths[0];
    doc.text("REPUESTO", colX, yPosition);
    colX += colWidths[1];
    const repuestoNote = doc.splitTextToSize("Repuesto original", colWidths[2] - 2);
    doc.text(repuestoNote, colX, yPosition);
    colX += colWidths[2];
    const repuestoTotalAmount = replacementCost;
    const repuestoTotalText = formatCLP(repuestoTotalAmount, { withLabel: false });
    doc.setFontSize(8);
    const repuestoTotalWidth = doc.getTextWidth(repuestoTotalText);
    const repuestoTotalX = colX + colWidths[3] - repuestoTotalWidth - 2;
    doc.text(repuestoTotalText, repuestoTotalX, yPosition);
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    const repuestoDetailText = `1 x ${formatCLP(replacementCost, { withLabel: false })}`;
    const repuestoDetailWidth = doc.getTextWidth(repuestoDetailText);
    const repuestoDetailX = colX + colWidths[3] - repuestoDetailWidth - 2;
    doc.text(repuestoDetailText, repuestoDetailX, yPosition + 3);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    yPosition += 7;
  }

  // Checklist - Mostrar todos los items juntos, separados por comas, en letra pequeña
  if (checklistItems.length > 0 && checklistData && Object.keys(checklistData).length > 0) {
    yPosition += 5;
    doc.setFontSize(5); // Letra más pequeña
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const checklistItemsList: string[] = [];
    checklistItems.forEach((item) => {
      const status = checklistData[item.item_name];
      if (status) {
        // Mostrar el estado al final de cada item
        let statusText = "";
        if (status === "ok") {
          statusText = " ok";
        } else if (status === "replaced") {
          statusText = " (rep)";
        } else if (status === "damaged") {
          statusText = " (dañada)";
        } else if (status === "no_probado") {
          statusText = " (no probado)";
        }
        checklistItemsList.push(`${item.item_name}${statusText}`);
      }
      // Solo mostrar items que tienen estado en checklistData (no mostrar items viejos sin estado)
    });
    
    // Unir todos los items con comas y dividir en líneas solo cuando sea necesario
    if (checklistItemsList.length > 0) {
      const checklistText = checklistItemsList.join(", ");
      const checklistLines = doc.splitTextToSize(checklistText, contentWidth - 6);
      
      // Mostrar todas las líneas (ocupando la menor cantidad posible)
      checklistLines.forEach((line: string) => {
        doc.text(line, margin + 3, yPosition);
        yPosition += 3; // Espaciado más pequeño para letra pequeña
      });
    }
  }

  // Total
  const totalBoxWidth = 30;
  const totalBoxX = margin + contentWidth - totalBoxWidth - 3;
  const totalYPosition = yPosition + 5;
  const totalBoxHeight = 20;
  const panelEndY = Math.max(yPosition + 10, totalYPosition + totalBoxHeight + 5);
  const finalPanelHeight = panelEndY - equipmentPanelStartY;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(totalBoxX, totalYPosition, totalBoxWidth, totalBoxHeight, "F");
  doc.setDrawColor(150, 150, 150);
  doc.rect(totalBoxX, totalYPosition, totalBoxWidth, totalBoxHeight, "S");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  
  // Calcular total con IVA
  const totalConIva = serviceValue + replacementCost;
  // Calcular total sin IVA (si el total incluye IVA del 19%)
  const totalSinIva = totalConIva / 1.19;
  const iva = totalConIva - totalSinIva;
  
  // Mostrar total sin IVA
  doc.text("Subtotal:", totalBoxX + 2, totalYPosition + 4);
  const subtotalText = formatCLP(totalSinIva, { withLabel: false });
  const subtotalWidth = doc.getTextWidth(subtotalText);
  doc.text(subtotalText, totalBoxX + totalBoxWidth - subtotalWidth - 2, totalYPosition + 4);

  // Mostrar IVA (19%)
  doc.text("IVA (19%):", totalBoxX + 2, totalYPosition + 8);
  const ivaText = formatCLP(iva, { withLabel: false });
  const ivaWidth = doc.getTextWidth(ivaText);
  doc.text(ivaText, totalBoxX + totalBoxWidth - ivaWidth - 2, totalYPosition + 8);
  
  doc.setDrawColor(150, 150, 150);
  doc.line(totalBoxX, totalYPosition + 12, totalBoxX + totalBoxWidth, totalYPosition + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalBoxX + 2, totalYPosition + 16);
  // Mostrar total con IVA
  doc.setFontSize(6);
  const totalText = formatCLP(totalConIva, { withLabel: false });
  const totalTextWidth = doc.getTextWidth(totalText);
  const totalTextX = Math.max(totalBoxX + 2, totalBoxX + totalBoxWidth - totalTextWidth - 2);
  doc.text(totalText, totalTextX, totalYPosition + 19);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(`Garantía ${warrantyDays} días`, margin + 3, totalYPosition + 6);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, equipmentPanelStartY, contentWidth, finalPanelHeight, "S");
  yPosition = panelEndY + 10;

  // Políticas de garantía - en dos columnas con texto pequeño
  const warrantyPanelStartY = yPosition;
  
  const warrantyText = settings.warranty_policies.policies.map(policy => {
    return policy.replace("{warrantyDays}", warrantyDays.toString());
  });
  
  // Primero calcular la altura necesaria
  doc.setFontSize(5);
  const columnWidth = (contentWidth - 12) / 2;
  let tempLeftY = yPosition + 10;
  let tempRightY = yPosition + 10;
  const maxYPerColumn: number[] = [];
  
  warrantyText.forEach((text, index) => {
    const isLeftColumn = index % 2 === 0;
    const lines = doc.splitTextToSize(text, columnWidth - 3);
    const textHeight = lines.length * 3 + 1;
    if (isLeftColumn) {
      tempLeftY += textHeight;
      maxYPerColumn.push(tempLeftY);
    } else {
      tempRightY += textHeight;
      maxYPerColumn.push(tempRightY);
    }
  });
  
  const maxY = Math.max(...maxYPerColumn, yPosition + 10);
  const warrantyPanelHeight = maxY - warrantyPanelStartY + 5;
  
  // Dibujar fondo y borde del panel PRIMERO
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "S");
  
  // Dibujar título
  doc.setFillColor(...stripeColor);
  doc.rect(margin, warrantyPanelStartY, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("POLÍTICAS DE GARANTÍA", margin + 3, warrantyPanelStartY + 4.5);
  
  // Ahora dibujar el texto
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(5); // Mismo tamaño que el checklist
  doc.setFont("helvetica", "normal");
  yPosition = warrantyPanelStartY + 10;
  
  const leftColumnX = margin + 3;
  const rightColumnX = margin + columnWidth + 9;
  
  let leftY = yPosition;
  let rightY = yPosition;
  
  // Distribuir políticas entre las dos columnas
  warrantyText.forEach((text, index) => {
    const isLeftColumn = index % 2 === 0;
    const currentX = isLeftColumn ? leftColumnX : rightColumnX;
    let currentY = isLeftColumn ? leftY : rightY;
    
    const lines = doc.splitTextToSize(text, columnWidth - 3);
    doc.text(lines, currentX, currentY);
    
    const textHeight = lines.length * 3 + 1;
    if (isLeftColumn) {
      leftY += textHeight;
    } else {
      rightY += textHeight;
    }
  });
  
  yPosition = maxY + 5;

  // Firma - más abajo, fuera del cuadro de garantías
  yPosition += 10; // Espacio adicional después de las garantías
  const signatureBoxHeight = 18;
  const signatureBoxWidth = 50;
  const signatureBoxY = yPosition;
  const signatureBoxX = (pageWidth - signatureBoxWidth) / 2;
  doc.setFillColor(230, 230, 230);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  const signatureText = "FIRMA DEL CLIENTE";
  const signatureTextWidth = doc.getTextWidth(signatureText);
  const signatureTextY = signatureBoxY + signatureBoxHeight + 6;
  doc.text(signatureText, signatureBoxX + (signatureBoxWidth - signatureTextWidth) / 2, signatureTextY);

  // Retornar blob
  return doc.output("blob");
}

