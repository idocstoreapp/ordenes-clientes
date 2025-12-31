import { useRef, useEffect, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import type { WorkOrder, Service, Customer, Branch, DeviceChecklistItem } from "@/types";
import { formatCLP } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/date";
import { getSystemSettings } from "@/lib/settings";

interface PDFPreviewProps {
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null };
  services: Service[];
  orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string }>;
  serviceValue: number;
  replacementCost: number;
  warrantyDays: number;
  checklistData?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null;
  notes?: string[];
  onClose: () => void;
  onDownload: (pdf: jsPDF) => void;
}

export default function PDFPreview({
  order,
  services,
  orderServices,
  serviceValue,
  replacementCost,
  warrantyDays,
  checklistData,
  notes,
  onClose,
  onDownload,
}: PDFPreviewProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generatePDF();
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setShowPrintMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function generatePDF() {
    setLoading(true);
    try {
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
        // Si el logo es una data URL (base64), usarla directamente
        if (settings.pdf_logo.url.startsWith("data:")) {
          logoDataUrl = settings.pdf_logo.url;
        } else {
          // Si es una URL normal, cargarla
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
        const logoY = (32 - logoHeight) / 2; // Centrar verticalmente en el header (32 puntos de altura)
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
      
      // Primero calcular la altura necesaria
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
      
      // Dibujar el fondo del panel PRIMERO con altura estimada grande
      // El contenido se dibujará encima
      const estimatedPanelHeight = 300; // Altura estimada grande para cubrir todo
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, contentWidth, estimatedPanelHeight, "F");
      
      // Dibujar el header del panel (encima del fondo)
      doc.setFillColor(...stripeColor);
      doc.rect(margin, yPosition, contentWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL EQUIPO", margin + 3, yPosition + 6);

      yPosition += 12;

      // Tabla
      const tableY = yPosition;
      // Ajustar anchos de columnas para que todo quepa correctamente dentro del contentWidth
      // [#, Modelo, Nota, Total] - Se eliminaron Cant y Precio para dar más espacio a Nota
      // Total disponible: contentWidth - 6 (márgenes izquierdo y derecho del panel)
      const availableWidth = contentWidth - 6;
      // Asegurar que la suma de los anchos no exceda el ancho disponible
      // A4 width = 210mm, margin = 15mm, contentWidth = 180mm ≈ 180 puntos
      // Más espacio para Nota ahora que eliminamos Cant y Precio, pero asegurando que el Total quepa
      const colWidths = [10, 32, 95, 37]; // Total: 174 puntos, ajustado para que quepa dentro del borde gris (contentWidth - 6)
      let colX = margin + 3;

      // Headers de la tabla (fondo gris claro)
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
      // Total alineado a la derecha
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
      
      // Construir el texto del modelo con IMEI y PASSCODE debajo (en la columna Modelo)
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
      
      // Dividir el texto del modelo en líneas
      const modelColWidth = colWidths[1] - 4;
      const modelLines = doc.splitTextToSize(modelText, modelColWidth);
      let modelY = yPosition;
      modelLines.forEach((line: string) => {
        doc.text(line, colX + 2, modelY);
        modelY += 4; // Espaciado entre líneas
      });
      
      colX += colWidths[1];
      
      // Construir solo la descripción del problema (sin IMEI/PASSCODE) en Nota [Descripción]
      let deviceDescription = "";
      
      // Descripción del problema
      if (order.problem_description) {
        deviceDescription += order.problem_description;
      }
      
      // Notas adicionales
      if (notes && notes.length > 0) {
        if (deviceDescription) deviceDescription += "\n";
        notes.forEach((note) => {
          deviceDescription += `${note}\n`;
        });
      }
      
      // La columna de descripción es solo para descripciones, NO para checklist
      
      // Dividir el texto en líneas que quepan en el ancho de la columna
      const descriptionColWidth = colWidths[2] - 6; // Ancho de la columna menos margen
      const descriptionLines = doc.splitTextToSize(deviceDescription || "-", descriptionColWidth);
      
      // Mostrar las líneas de descripción
      let descY = yPosition;
      descriptionLines.forEach((line: string) => {
        doc.text(line, colX, descY);
        descY += 4; // Espaciado entre líneas
      });
      
      // Actualizar yPosition usando la altura máxima entre modelo (con IMEI/PASSCODE) y descripción
      const maxDescHeight = Math.max(
        Math.max(7, modelLines.length * 4),
        Math.max(7, descriptionLines.length * 4)
      );
      yPosition = equipmentRowY + maxDescHeight;
      
      // Completar la columna Total de la fila del equipo (sin cantidad ni precio)
      colX = margin + 3 + colWidths[0] + colWidths[1] + colWidths[2];
      // Total alineado a la derecha
      const totalDash = "-";
      const totalDashWidth = doc.getTextWidth(totalDash);
      doc.text(totalDash, colX + colWidths[3] - totalDashWidth - 2, equipmentRowY);

      // Filas de servicios - cada servicio es una fila separada SIN número (# vacío o guion)
      // Usar orderServices si está disponible (con quantity y total_price), sino usar services
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

      servicesToShow.forEach((serviceItem, index) => {
        colX = margin + 3;
        // No poner número, solo un guion o espacio en blanco
        doc.text("-", colX + 2, yPosition);
        colX += colWidths[0];
        // Ajustar nombre del servicio si es muy largo
        const serviceNameText = serviceItem.name.toUpperCase();
        const serviceNameLines = doc.splitTextToSize(serviceNameText, colWidths[1] - 4);
        doc.text(serviceNameLines, colX + 2, yPosition);
        colX += colWidths[1];
        // Usar la descripción completa del servicio o la descripción del problema completa
        const serviceNote = serviceItem.description || order.problem_description || "Servicio de reparación";
        const noteLines = doc.splitTextToSize(serviceNote, colWidths[2] - 4);
        let noteY = yPosition;
        noteLines.forEach((line: string) => {
          doc.text(line, colX + 2, noteY);
          noteY += 4;
        });
        colX += colWidths[2];
        // Formatear total con cantidad y precio unitario de manera discreta
        // Usar total_price del item (quantity * unit_price)
        const totalAmount = serviceItem.total_price;
        const totalText = formatCLP(totalAmount, { withLabel: false });
        doc.setFontSize(8);
        const totalWidth = doc.getTextWidth(totalText);
        const totalX = colX + colWidths[3] - totalWidth - 2;
        doc.text(totalText, totalX, yPosition);
        // Mostrar cantidad y precio unitario de manera discreta (texto pequeño debajo)
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100); // Gris discreto
        const detailText = `${serviceItem.quantity} x ${formatCLP(serviceItem.unit_price, { withLabel: false })}`;
        const detailWidth = doc.getTextWidth(detailText);
        const detailX = colX + colWidths[3] - detailWidth - 2;
        doc.text(detailText, detailX, yPosition + 3);
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0); // Volver a negro
        
        // Ajustar yPosition según la altura máxima de las columnas
        // Nota: Ahora necesitamos considerar el espacio adicional para el detalle (cantidad x precio)
        const maxHeight = Math.max(
          serviceNameLines.length * 4,
          noteLines.length * 4,
          7 + 3 // +3 para el espacio del detalle discreto
        );
        yPosition += maxHeight;
      });

      // Si hay costo de repuesto, agregarlo como servicio adicional (SIN número)
      if (replacementCost > 0) {
        colX = margin + 3;
        // No poner número, solo un guion
        doc.text("-", colX + 2, yPosition);
        colX += colWidths[0];
        doc.text("REPUESTO", colX, yPosition);
        colX += colWidths[1];
        const repuestoNote = doc.splitTextToSize("Repuesto original", colWidths[2] - 2);
        doc.text(repuestoNote, colX, yPosition);
        colX += colWidths[2];
        // Formatear total con cantidad y precio unitario de manera discreta
        const repuestoTotalAmount = replacementCost;
        const repuestoTotalText = formatCLP(repuestoTotalAmount, { withLabel: false });
        doc.setFontSize(8);
        const repuestoTotalWidth = doc.getTextWidth(repuestoTotalText);
        const repuestoTotalX = colX + colWidths[3] - repuestoTotalWidth - 2;
        doc.text(repuestoTotalText, repuestoTotalX, yPosition);
        // Mostrar cantidad y precio unitario de manera discreta (texto pequeño debajo)
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100); // Gris discreto
        const repuestoDetailText = `1 x ${formatCLP(replacementCost, { withLabel: false })}`;
        const repuestoDetailWidth = doc.getTextWidth(repuestoDetailText);
        const repuestoDetailX = colX + colWidths[3] - repuestoDetailWidth - 2;
        doc.text(repuestoDetailText, repuestoDetailX, yPosition + 3);
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0); // Volver a negro
        yPosition += 7;
      }

      // === CHECKLIST al final del panel, en formato horizontal ===
      // Checklist - Mostrar todos los items juntos, separados por comas, en letra pequeña
      if (checklistItems.length > 0 && checklistData && Object.keys(checklistData).length > 0) {
        yPosition += 5;
        // Subtítulo del checklist
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Checklist de Diagnóstico Inicial", margin + 3, yPosition);
        yPosition += 4;
        doc.setFontSize(5); // Letra más pequeña
        doc.setFont("helvetica", "normal");
        
        const checklistItemsList: string[] = [];
        checklistItems.forEach((item) => {
          const status = checklistData[item.item_name];
          if (status) {
            // Mostrar el estado al final de cada item (texto completo, sin abreviaciones)
            let statusText = "";
            if (status === "ok") {
              statusText = " (ok)";
            } else if (status === "replaced") {
              statusText = " (reparado)";
            } else if (status === "damaged") {
              statusText = " (dañado)";
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

      // === TOTAL (Caja destacada derecha) - DENTRO del panel ===
      // Posicionar el total dentro del panel, al lado derecho, pero dentro del contentWidth
      // Reducido a aproximadamente la mitad del tamaño original
      const totalBoxWidth = 30; // Mitad del ancho anterior (era 60)
      const totalBoxX = margin + contentWidth - totalBoxWidth - 3; // Dentro del panel, no fuera
      const totalYPosition = yPosition + 5; // Justo después del checklist
      
      // Calcular la posición final del panel basándose en dónde terminó el contenido (incluyendo el total)
      const totalBoxHeight = 20; // Mitad de la altura anterior (era 30)
      const panelEndY = Math.max(yPosition + 10, totalYPosition + totalBoxHeight + 5);
      const finalPanelHeight = panelEndY - equipmentPanelStartY;
      
      // Dibujar el cuadro del total DENTRO del panel
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
      // Ajustar si el texto es muy largo para que quepa en el ancho reducido
      const totalTextWidth = doc.getTextWidth(totalText);
      const totalTextX = Math.max(totalBoxX + 2, totalBoxX + totalBoxWidth - totalTextWidth - 2);
      doc.text(totalText, totalTextX, totalYPosition + 19);

      // Garantía en la parte izquierda, al mismo nivel que el total
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`Garantía ${warrantyDays} días`, margin + 3, totalYPosition + 6);

      // Dibujar el borde del panel (después de dibujar el total)
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin, equipmentPanelStartY, contentWidth, finalPanelHeight, "S");

      // Actualizar yPosition para las políticas de garantía (después del panel)
      yPosition = panelEndY + 10;

      // === POLÍTICAS DE GARANTÍA - en dos columnas con texto pequeño ===
      const warrantyPanelStartY = yPosition;
      
      // Usar políticas de garantía desde configuración
      const warrantyText = settings.warranty_policies.policies.map(policy => {
        // Reemplazar {warrantyDays} si existe en la política
        return policy.replace("{warrantyDays}", warrantyDays.toString());
      });
      
      // Calcular espacio disponible para garantías (asegurando que el cuadro de firma siempre quepa)
      const pageHeight = doc.internal.pageSize.getHeight();
      const sigBoxHeight = 18; // Altura del cuadro de firma
      const sigTextHeight = 6; // Altura del texto "FIRMA DEL CLIENTE"
      const spaceAfterWarranty = 10;
      const bottomMargin = margin;
      const spaceNeededForSignature = sigBoxHeight + sigTextHeight + spaceAfterWarranty + bottomMargin;
      const availableHeight = pageHeight - warrantyPanelStartY - spaceNeededForSignature - 15; // 15 para título y padding
      
      // Ajustar dinámicamente el tamaño de fuente para que quepa todo
      let fontSize = 5; // Tamaño inicial
      let maxY = 0;
      let warrantyPanelHeight = 0;
      const columnWidth = (contentWidth - 12) / 2;
      
      // Intentar con diferentes tamaños de fuente hasta que quepa
      for (let testSize = 5; testSize >= 3; testSize -= 0.5) {
        doc.setFontSize(testSize);
        let tempLeftY = warrantyPanelStartY + 10;
        let tempRightY = warrantyPanelStartY + 10;
        const maxYPerColumn: number[] = [];
        
        warrantyText.forEach((text, index) => {
          const isLeftColumn = index % 2 === 0;
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
          // Espaciado proporcional al tamaño de fuente
          const lineSpacing = testSize * 0.5;
          const textHeight = lines.length * lineSpacing;
          if (isLeftColumn) {
            tempLeftY += textHeight;
            maxYPerColumn.push(tempLeftY);
          } else {
            tempRightY += textHeight;
            maxYPerColumn.push(tempRightY);
          }
        });
        
        const testMaxY = Math.max(...maxYPerColumn, warrantyPanelStartY + 10);
        const testPanelHeight = testMaxY - warrantyPanelStartY + 5;
        
        // Si cabe en el espacio disponible, usar este tamaño
        if (testPanelHeight <= availableHeight) {
          fontSize = testSize;
          maxY = testMaxY;
          warrantyPanelHeight = testPanelHeight;
          break;
        }
      }
      
      // Si aún no cabe, usar el tamaño mínimo (3) y ajustar el espaciado
      if (warrantyPanelHeight === 0 || warrantyPanelHeight > availableHeight) {
        fontSize = 3;
        doc.setFontSize(fontSize);
        let tempLeftY = warrantyPanelStartY + 10;
        let tempRightY = warrantyPanelStartY + 10;
        const maxYPerColumn: number[] = [];
        
        warrantyText.forEach((text, index) => {
          const isLeftColumn = index % 2 === 0;
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
          // Espaciado mínimo para que quepa
          const lineSpacing = fontSize * 0.4;
          const textHeight = lines.length * lineSpacing;
          if (isLeftColumn) {
            tempLeftY += textHeight;
            maxYPerColumn.push(tempLeftY);
          } else {
            tempRightY += textHeight;
            maxYPerColumn.push(tempRightY);
          }
        });
        
        maxY = Math.max(...maxYPerColumn, warrantyPanelStartY + 10);
        warrantyPanelHeight = maxY - warrantyPanelStartY + 5;
      }
      
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
      
      // Ahora dibujar el texto con el tamaño de fuente calculado
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      yPosition = warrantyPanelStartY + 10;
      
      const leftColumnX = margin + 3;
      const rightColumnX = margin + columnWidth + 9;
      
      let leftY = yPosition;
      let rightY = yPosition;
      
      // Calcular espaciado proporcional al tamaño de fuente
      const lineSpacing = fontSize <= 3 ? fontSize * 0.4 : fontSize * 0.5;
      
      // Distribuir políticas entre las dos columnas
      warrantyText.forEach((text, index) => {
        const isLeftColumn = index % 2 === 0;
        const currentX = isLeftColumn ? leftColumnX : rightColumnX;
        let currentY = isLeftColumn ? leftY : rightY;
        
        // Agregar punto al inicio de cada política
        const textWithBullet = `• ${text}`;
        const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
        doc.text(lines, currentX, currentY);
        
        // Espaciado proporcional al tamaño de fuente
        const textHeight = lines.length * lineSpacing;
        if (isLeftColumn) {
          leftY += textHeight;
        } else {
          rightY += textHeight;
        }
      });
      
      yPosition = maxY + 5;

      // === CUADRO PARA FIRMA - más abajo, fuera del cuadro de garantías ===
      yPosition += 6; // Espacio adicional después de las garantías
      const signatureBoxHeight = 18;
      const signatureBoxWidth = 50;
      const signatureBoxY = yPosition;
      const signatureBoxX = (pageWidth - signatureBoxWidth) / 2; // Centrado horizontalmente
      
      // Fondo gris
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight, "FD");

      // Texto "FIRMA DEL CLIENTE" fuera del recuadro, abajo
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const signatureText = "FIRMA DEL CLIENTE";
      const signatureTextWidth = doc.getTextWidth(signatureText);
      const signatureTextY = signatureBoxY + signatureBoxHeight + 6; // Debajo del recuadro
      doc.text(signatureText, signatureBoxX + (signatureBoxWidth - signatureTextWidth) / 2, signatureTextY);

      // Guardar PDF
      const pdfOutput = doc.output("blob");
      setPdfBlob(pdfOutput);
      setPdfDoc(doc);
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generatePDFBoleta() {
    try {
      // Cargar configuración del sistema
      const settings = await getSystemSettings();

      // Cargar logo desde configuración
      let logoDataUrl = "";
      try {
        // Si el logo es una data URL (base64), usarla directamente
        if (settings.pdf_logo.url.startsWith("data:")) {
          logoDataUrl = settings.pdf_logo.url;
        } else {
          // Si es una URL normal, cargarla
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

      // Generar QR Code
      let qrDataUrl = "";
      try {
        qrDataUrl = await QRCode.toDataURL(
          `https://ordenes.idocstore.cl/${order.order_number}`,
          { width: 80, margin: 1 }
        );
      } catch (error) {
        console.error("Error generando QR:", error);
      }

      // Formato 80mm x 2000mm (boleta larga)
      // Convertir mm a puntos: 1mm = 2.83465 puntos
      const widthMM = 80;
      const heightMM = 2000;
      const width = widthMM * 2.83465;
      const height = heightMM * 2.83465;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Logo iDocStore en el medio arriba - el doble de grande
      if (logoDataUrl) {
        const logoHeight = settings.pdf_logo.height * 2; // Doble de grande
        const logoWidth = settings.pdf_logo.width * 2; // Doble de grande
        const logoX = (pageWidth - logoWidth) / 2; // Centrado
        doc.addImage(logoDataUrl, "PNG", logoX, yPosition, logoWidth, logoHeight);
        yPosition += logoHeight + 15;
      }

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Datos del local - alineados a la izquierda con márgenes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL LOCAL", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const branchName = order.sucursal?.razon_social || order.sucursal?.name || "iDocStore";
      doc.text(`Nombre: ${branchName}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Fecha de Emisión: ${formatDateTime(order.created_at)}`, margin, yPosition);
      yPosition += 6;
      if (order.sucursal?.phone) {
        doc.text(`Teléfono: ${order.sucursal.phone}`, margin, yPosition);
        yPosition += 6;
      }
      if (order.sucursal?.address) {
        const addressLines = doc.splitTextToSize(`Dirección: ${order.sucursal.address}`, contentWidth);
        doc.text(addressLines, margin, yPosition);
        yPosition += addressLines.length * 6;
      }
      if (order.sucursal?.email) {
        doc.text(`Email: ${order.sucursal.email}`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 10;

      // Datos del cliente - alineados a la izquierda con márgenes
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL CLIENTE", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (order.customer) {
        doc.text(`Nombre: ${order.customer.name}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Teléfono: ${order.customer.phone_country_code || "+56"} ${order.customer.phone}`, margin, yPosition);
        yPosition += 6;
        if (order.customer.email) {
          doc.text(`Email: ${order.customer.email}`, margin, yPosition);
          yPosition += 6;
        }
      }
      yPosition += 8;

      // Fecha de compromiso
      if (order.commitment_date) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`Fecha de Compromiso: ${formatDate(order.commitment_date)}`, margin, yPosition);
        yPosition += 8;
      }

      // Número de orden con recuadro
      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const orderBoxWidth = 50;
      const orderBoxHeight = 7;
      const orderBoxX = (pageWidth - orderBoxWidth) / 2; // Centrado
      doc.setFillColor(80, 80, 80); // Gris oscuro
      doc.rect(orderBoxX, yPosition, orderBoxWidth, orderBoxHeight, "F");
      doc.setTextColor(255, 255, 255);
      const orderLabelText = "N° Orden:";
      const orderLabelWidth = doc.getTextWidth(orderLabelText);
      doc.text(orderLabelText, orderBoxX + (orderBoxWidth - orderLabelWidth) / 2, yPosition + 5);
      yPosition += orderBoxHeight + 10; // Separar más el recuadro del número
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const orderNumberText = order.order_number;
      const orderNumberWidth = doc.getTextWidth(orderNumberText);
      doc.text(orderNumberText, (pageWidth - orderNumberWidth) / 2, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      yPosition += 10;

      // Datos del equipo
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL EQUIPO", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Modelo: ${order.device_model}`, margin, yPosition);
      yPosition += 6;
      if (order.device_serial_number) {
        doc.text(`IMEI: ${order.device_serial_number}`, margin, yPosition);
        yPosition += 6;
      }
      if (order.device_unlock_code) {
        doc.text(`Passcode: ${order.device_unlock_code}`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 8;

      // Servicios
      if (services.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("SERVICIOS", margin, yPosition);
        yPosition += 8;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        services.forEach((service) => {
          doc.text(`• ${service.name}`, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 8;
      }

      // Valor presupuestado - alineado al medio
      yPosition += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const valorPresupuestadoText = "VALOR PRESUPUESTADO";
      const valorPresupuestadoWidth = doc.getTextWidth(valorPresupuestadoText);
      doc.text(valorPresupuestadoText, (pageWidth - valorPresupuestadoWidth) / 2, yPosition);
      yPosition += 10;
      
      // Calcular total con IVA
      const totalConIva = serviceValue + replacementCost;
      const totalSinIva = totalConIva / 1.19;
      const iva = totalConIva - totalSinIva;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const subtotalText = `Subtotal: ${formatCLP(totalSinIva, { withLabel: false })}`;
      const subtotalWidth = doc.getTextWidth(subtotalText);
      doc.text(subtotalText, (pageWidth - subtotalWidth) / 2, yPosition);
      yPosition += 7;
      
      const ivaText = `IVA (19%): ${formatCLP(iva, { withLabel: false })}`;
      const ivaWidth = doc.getTextWidth(ivaText);
      doc.text(ivaText, (pageWidth - ivaWidth) / 2, yPosition);
      yPosition += 7;
      
      doc.setDrawColor(150, 150, 150);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 12; // Separar más la línea del total
      
      // Total - alineado al medio y destacado
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const totalText = `TOTAL: ${formatCLP(totalConIva, { withLabel: true })}`;
      const totalWidth = doc.getTextWidth(totalText);
      doc.text(totalText, (pageWidth - totalWidth) / 2, yPosition);
      yPosition += 15;

      // QR Code en el medio
      if (qrDataUrl) {
        const qrSize = 60;
        const qrX = (pageWidth - qrSize) / 2; // Centrado
        doc.addImage(qrDataUrl, "PNG", qrX, yPosition, qrSize, qrSize);
        yPosition += qrSize + 15;
      }

      // Recuadro de firma
      const signatureBoxWidth = contentWidth;
      const signatureBoxHeight = 40;
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight, "FD");
      yPosition += signatureBoxHeight + 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const signatureText = "FIRMA DEL CLIENTE";
      const signatureTextWidth = doc.getTextWidth(signatureText);
      doc.text(signatureText, (pageWidth - signatureTextWidth) / 2, yPosition);
      yPosition += 12;

      // Garantías - que ocupen el largo que necesiten
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("GARANTÍAS", margin, yPosition);
      yPosition += 10;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      // Usar políticas de garantía desde configuración
      const warrantyTextBoleta = settings.warranty_policies.policies.map(policy => {
        // Reemplazar {warrantyDays} si existe en la política
        return policy.replace("{warrantyDays}", warrantyDays.toString());
      });
      warrantyTextBoleta.forEach((text) => {
        // Agregar punto al inicio de cada política
        const textWithBullet = `• ${text}`;
        const lines = doc.splitTextToSize(textWithBullet, contentWidth);
        
        // Dibujar cada línea manualmente con menos espacio entre líneas (interlineado reducido)
        lines.forEach((line: string, lineIndex: number) => {
          doc.text(line, margin, yPosition);
          // Espaciado reducido entre líneas: 3.5 puntos en lugar de 5
          yPosition += 5.5;
        });
        
        // Espacio moderado después de cada garantía completa
        yPosition += 2;
      });

      const pdfOutput = doc.output("blob");
      return pdfOutput;
    } catch (error) {
      console.error("Error generando PDF boleta:", error);
      throw error;
    }
  }

  async function generatePDFEtiqueta() {
    try {
      // Formato etiqueta 80mm x 2000mm (mismo formato que boleta)
      const widthMM = 80;
      const heightMM = 2000;
      const width = widthMM * 2.83465;
      const height = heightMM * 2.83465;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Título centrado
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const titleText = "ETIQUETA DE ORDEN";
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += 15;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      // Número de orden destacado
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Orden: ${order.order_number}`, margin, yPosition);
      yPosition += 12;

      // Nombre de cliente
      doc.setFontSize(8);
      if (order.customer) {
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        const customerLines = doc.splitTextToSize(order.customer.name, contentWidth - 50);
        doc.text(customerLines, margin + 50, yPosition);
        yPosition += customerLines.length * 6 + 5;
      }

      // Dispositivo
      doc.setFont("helvetica", "bold");
      doc.text("Dispositivo:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      const deviceLines = doc.splitTextToSize(order.device_model, contentWidth - 60);
      doc.text(deviceLines, margin + 60, yPosition);
      yPosition += deviceLines.length * 6 + 5;

      // Problema o descripción
      doc.setFont("helvetica", "bold");
      doc.text("Problema:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      const problemLines = doc.splitTextToSize(order.problem_description, contentWidth - 60);
      doc.text(problemLines, margin + 60, yPosition);
      yPosition += problemLines.length * 6 + 5;

      // Passcode
      if (order.device_unlock_code) {
        doc.setFont("helvetica", "bold");
        doc.text("Passcode:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(order.device_unlock_code, margin + 60, yPosition);
        yPosition += 8;
      }

      // Local asignado
      if (order.sucursal?.name) {
        doc.setFont("helvetica", "bold");
        doc.text("Local:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(order.sucursal.name, margin + 50, yPosition);
        yPosition += 8;
      }

      // Fecha de compromiso
      if (order.commitment_date) {
        doc.setFont("helvetica", "bold");
        doc.text("Fecha Compromiso:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(order.commitment_date), margin + 90, yPosition);
      }

      const pdfOutput = doc.output("blob");
      return pdfOutput;
    } catch (error) {
      console.error("Error generando PDF etiqueta:", error);
      throw error;
    }
  }

  async function handlePrint(format: 'a4' | 'boleta' | 'etiqueta') {
    setLoading(true);
    try {
      let pdfToPrint: Blob;
      
      if (format === 'a4') {
        pdfToPrint = pdfBlob!;
      } else if (format === 'boleta') {
        pdfToPrint = await generatePDFBoleta();
      } else {
        pdfToPrint = await generatePDFEtiqueta();
      }

      const printWindow = window.open(URL.createObjectURL(pdfToPrint), '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
      setShowPrintMenu(false);
    } catch (error) {
      console.error("Error imprimiendo:", error);
      alert("Error al generar el PDF para imprimir");
    } finally {
      setLoading(false);
    }
  }

  function handleWhatsApp() {
    if (!order.customer || !pdfBlob) return;
    
    const phone = order.customer.phone_country_code
      ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
      : "56" + order.customer.phone.replace(/\D/g, "");
    
    const message = encodeURIComponent(
      `Hola ${order.customer.name},\n\nTu orden ${order.order_number} ha sido creada.\n\nTotal: ${formatCLP(order.total_repair_cost)}\n\nDetalle de servicios:\n${services.map(s => `• ${s.name}`).join("\n")}`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Vista Previa del PDF</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">Generando PDF...</p>
            </div>
          ) : pdfBlob ? (
            <div className="bg-white shadow-lg mx-auto" style={{ width: "210mm" }}>
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full border-0"
                style={{ minHeight: "297mm", width: "210mm" }}
                title="PDF Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">Error al generar PDF</p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </button>
          <button
            onClick={handleWhatsApp}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            disabled={!order.customer || !pdfBlob}
          >
            📱 Enviar por WhatsApp
          </button>
          <div className="relative" ref={printMenuRef}>
            <button
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark flex items-center gap-2"
              disabled={!pdfBlob}
            >
              🖨️ Imprimir
              {showPrintMenu ? ' ▲' : ' ▼'}
            </button>
            {showPrintMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-300 rounded-md shadow-lg min-w-[200px] z-50">
                <button
                  onClick={() => handlePrint('a4')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-200 first:rounded-t-md"
                >
                  📄 Formato A4 (Carta)
                </button>
                <button
                  onClick={() => handlePrint('boleta')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-200"
                >
                  📋 Formato 80x2000 (Boleta)
                </button>
                <button
                  onClick={() => handlePrint('etiqueta')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 last:rounded-b-md"
                >
                  🏷️ Formato Etiqueta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
