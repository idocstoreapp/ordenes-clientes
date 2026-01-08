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
  orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string; description?: string | null }>;
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
    // Limpiar caché de settings al montar el componente para asegurar datos frescos
    // Esto garantiza que todas las sucursales vean las mismas políticas de garantía
    import("@/lib/settings").then((module) => {
      if (module.clearSettingsCache) {
        module.clearSettingsCache();
      }
    });
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
      // Cargar datos actualizados de la sucursal desde la base de datos
      // Esto asegura que el PDF siempre refleje los datos más recientes de la sucursal
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderWithUpdatedBranch = {
        ...order,
        sucursal: branchData,
      };

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

      // Usar orderWithUpdatedBranch en lugar de order para asegurar datos actualizados
      const orderForPDF = orderWithUpdatedBranch;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Cargar configuración del sistema (forzar recarga para obtener garantías más recientes)
      const settings = await getSystemSettings(true);

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
      const branchName = orderForPDF.sucursal?.name || "Sucursal";
      const nameLines = doc.splitTextToSize(branchName, (contentWidth - 10) / 2 - 30);
      tempPanelY += nameLines.length * 5;
      
      if (orderForPDF.sucursal?.address) {
        const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address, (contentWidth - 10) / 2 - 30);
        tempPanelY += addressLines.length * 5;
      }
      if (orderForPDF.sucursal?.phone) {
        tempPanelY += 5;
      }
      if (orderForPDF.sucursal?.email) {
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
      // Centrar verticalmente el contenido dentro del cuadro (más espacio arriba)
      let panelY = yPosition + 12; // Aumentar solo el margen superior para centrar el texto

      // Nombre de la sucursal
      doc.setFont("helvetica", "bold");
      doc.text("Sucursal:", margin + 3, panelY);
      doc.setFont("helvetica", "normal");
      doc.text(nameLines, margin + 25, panelY);
      panelY += nameLines.length * 5;

      if (orderForPDF.sucursal?.address) {
        doc.setFont("helvetica", "bold");
        doc.text("Dirección:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address, (contentWidth - 10) / 2 - 30);
        doc.text(addressLines, margin + 25, panelY);
        panelY += addressLines.length * 5;
      }

      if (orderForPDF.sucursal?.phone) {
        doc.setFont("helvetica", "bold");
        doc.text("Teléfono:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        doc.text(orderForPDF.sucursal.phone, margin + 25, panelY);
        panelY += 5;
      }

      if (orderForPDF.sucursal?.email) {
        doc.setFont("helvetica", "bold");
        doc.text("Correo:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        doc.text(orderForPDF.sucursal.email, margin + 25, panelY);
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
        // Centrar verticalmente el contenido dentro del cuadro (más espacio arriba)
        panelY = yPosition + 12; // Aumentar solo el margen superior para centrar el texto

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
      
      // Calcular espacio disponible ANTES de dibujar el panel
      // Necesitamos espacio para: garantías + cuadro de firma + márgenes
      const pageHeight = doc.internal.pageSize.getHeight();
      const sigBoxHeight = 18;
      const sigTextHeight = 6;
      const spaceAfterWarranty = 2; // Reducido al mínimo para maximizar espacio de garantías
      const bottomMargin = 1; // Mínimo absoluto - firma al final de la hoja
      const signatureTextSpacing = 5; // Espacio entre el cuadro de firma y el texto "FIRMA DEL CLIENTE"
      const spaceNeededForSignature = sigBoxHeight + sigTextHeight + spaceAfterWarranty + bottomMargin;
      const warrantyTitleHeight = 6;
      const warrantyPaddingTop = 8; // Reducido para dar más espacio al contenido
      const warrantyPaddingBottom = 3; // Reducido para maximizar espacio
      const warrantyMinHeight = 50; // Altura mínima estimada para garantías
      const spaceNeededForWarranty = warrantyTitleHeight + warrantyPaddingTop + warrantyMinHeight + warrantyPaddingBottom;
      const totalSpaceNeeded = spaceNeededForWarranty + spaceNeededForSignature;
      const maxEquipmentPanelHeight = pageHeight - equipmentPanelStartY - totalSpaceNeeded - 20; // 20 de margen extra
      
      // Altura estimada inicial del panel (será ajustada dinámicamente)
      const estimatedPanelHeight = Math.min(300, maxEquipmentPanelHeight);
      
      // Dibujar el fondo del panel PRIMERO con altura estimada
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
      
      // === REORGANIZACIÓN: Checklist y garantía se moverán al lado del total ===
      // Calcular altura máxima permitida para la descripción
      // Considerar: header (12) + fila equipo (7) + servicios + total box (20) + margen (15)
      // NO incluir checklist aquí porque se moverá al lado del total
      const headerHeight = 12;
      const equipmentRowMinHeight = 7;
      // Estimar altura de servicios (necesitamos saber cuántos hay)
      const servicesCount = orderServices && orderServices.length > 0 ? orderServices.length : (services?.length || 0);
      const servicesEstimatedHeight = servicesCount * 15; // Estimado por servicio
      const totalBoxHeight = 20; // Altura real del cuadro
      const marginBottom = 15; // Margen de seguridad aumentado
      const usedHeight = headerHeight + equipmentRowMinHeight + servicesEstimatedHeight + totalBoxHeight + marginBottom;
      // NO truncar la descripción - mostrar TODO el texto siempre
      // Calcular espacio disponible para la descripción
      const maxDescriptionHeight = Math.max(30, maxEquipmentPanelHeight - usedHeight - 20); // Más espacio disponible
      
      // Dividir la descripción en líneas SIN truncar
      let descriptionLines = doc.splitTextToSize(deviceDescription || "-", descriptionColWidth);
      
      // Calcular interlineado adaptativo para que TODO el texto quepa
      // Si hay muchas líneas, reducir el interlineado proporcionalmente
      let descLineSpacing = 4; // Espaciado normal inicial
      if (descriptionLines.length > 0) {
        // Calcular el interlineado necesario para que todas las líneas quepan
        const requiredHeight = descriptionLines.length * 4; // Altura mínima necesaria
        if (requiredHeight > maxDescriptionHeight) {
          // Ajustar interlineado para que quepa todo sin apretarse demasiado
          descLineSpacing = Math.max(3, maxDescriptionHeight / descriptionLines.length);
        } else {
          // Hay espacio suficiente, usar interlineado normal
          descLineSpacing = 4;
        }
      }
      let descY = yPosition;
      descriptionLines.forEach((line: string) => {
        doc.text(line, colX, descY);
        descY += descLineSpacing;
      });
      
      // Calcular altura real de la descripción con el interlineado usado
      const actualDescHeight = descriptionLines.length * descLineSpacing;
      const maxDescHeight = Math.max(
        Math.max(7, modelLines.length * 4),
        Math.max(7, actualDescHeight)
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
            description: (os as any).description || null // Usar descripción si está disponible
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
        // Usar solo la descripción del servicio (NO repetir la descripción del problema)
        // Si la descripción del servicio es igual a la descripción del problema, usar texto genérico
        let serviceNote = serviceItem.description || "Servicio de reparación";
        if (serviceNote === order.problem_description) {
          serviceNote = "Servicio de reparación";
        }
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

      // === TOTAL Y ELEMENTOS ADJUNTOS (Checklist y Garantía) ===
      // Calcular posición del total basándose en dónde terminaron los servicios
      const totalBoxWidth = 30;
      const totalBoxX = margin + contentWidth - totalBoxWidth - 3;
      const totalYPosition = yPosition + 5;
      const actualTotalBoxHeight = 20;
      
      // Preparar checklist y garantía para mostrar al lado izquierdo del total
      let checklistText = "";
      if (checklistItems.length > 0 && checklistData && Object.keys(checklistData).length > 0) {
        const checklistItemsList: string[] = [];
        checklistItems.forEach((item) => {
          const status = checklistData[item.item_name];
          if (status) {
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
        });
        if (checklistItemsList.length > 0) {
          checklistText = checklistItemsList.join(", ");
        }
      }
      
      // Calcular altura necesaria para checklist y garantía (lado izquierdo del total)
      const leftSideWidth = totalBoxX - margin - 6; // Ancho disponible a la izquierda del total
      let leftSideHeight = 0;
      let checklistLines: string[] = [];
      if (checklistText) {
        doc.setFontSize(5);
        checklistLines = doc.splitTextToSize(checklistText, leftSideWidth);
        leftSideHeight += 6 + (checklistLines.length * 3); // Título + líneas
      }
      // Garantía de días
      doc.setFontSize(6);
      const warrantyDaysText = `Garantía ${warrantyDays} días`;
      leftSideHeight += 4; // Espacio para garantía
      
      // Ajustar altura del panel considerando el lado izquierdo
      const maxLeftRightHeight = Math.max(actualTotalBoxHeight, leftSideHeight);
      const panelEndY = Math.max(yPosition + 10, totalYPosition + maxLeftRightHeight + 5);
      const finalPanelHeight = panelEndY - equipmentPanelStartY;
      
      // Dibujar el cuadro del total DENTRO del panel
      doc.setFillColor(240, 240, 240);
      doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "F");
      doc.setDrawColor(150, 150, 150);
      doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "S");

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

      // === CHECKLIST Y GARANTÍA AL LADO IZQUIERDO DEL TOTAL ===
      let leftSideY = totalYPosition;
      
      // Checklist (si existe)
      if (checklistLines.length > 0) {
        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Checklist:", margin + 3, leftSideY);
        leftSideY += 4;
        doc.setFont("helvetica", "normal");
        checklistLines.forEach((line: string) => {
          doc.text(line, margin + 3, leftSideY);
          leftSideY += 3;
        });
        leftSideY += 2; // Espacio antes de garantía
      }
      
      // Garantía de días
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(warrantyDaysText, margin + 3, leftSideY);
      
      // Dibujar borde del panel
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
      // IMPORTANTE: Usar un margen de seguridad para evitar que se monte sobre la firma
      const minSeparationForSignature = 5; // Separación MÍNIMA entre garantías y firma (aumentado de 2 a 5)
      const spaceForSignature = sigBoxHeight + signatureTextSpacing + sigTextHeight + minSeparationForSignature + bottomMargin;
      // Calcular el espacio disponible con margen de seguridad - NUNCA exceder este espacio
      const availableHeight = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - spaceForSignature;
      
      // Asegurar que el espacio disponible sea positivo
      if (availableHeight <= 0) {
        console.error("[PDF Preview] ERROR: No hay espacio disponible para garantías. Ajustando layout.");
        // En caso extremo, reducir el espacio de la firma
        const emergencySpace = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - 20;
        if (emergencySpace > 0) {
          console.warn("[PDF Preview] Usando espacio de emergencia:", emergencySpace);
        }
      }
      
      // Debug: mostrar espacio disponible
      console.log("[PDF Preview] Espacio disponible para garantías:", availableHeight, "puntos");
      console.log("[PDF Preview] Número de garantías:", warrantyText.length);
      
      // Asegurar que siempre haya espacio mínimo para garantías
      if (availableHeight < 30) {
        console.warn("[PDF Preview] Espacio muy limitado para garantías, ajustando layout");
      }
      
      // === CÁLCULO ADAPTATIVO DE TAMAÑO DE FUENTE PARA GARANTÍAS ===
      // Ajustar dinámicamente el tamaño de fuente para que quepa todo
      // Lógica: empezar con tamaño grande y solo reducir si es necesario
      // El objetivo es usar TODO el espacio disponible hasta la firma
      let fontSize = 6; // Tamaño inicial (fallback)
      let maxY = 0;
      let warrantyPanelHeight = 0;
      let optimalLineSpacing = 0;
      const columnWidth = (contentWidth - 12) / 2;
      
      // FORZAR un tamaño mínimo MUY GRANDE para que el texto sea legible
      // Calcular tamaño basado en espacio disponible, pero SIEMPRE usar al menos 14-16 puntos
      const estimatedLinesPerWarranty = 2;
      const totalEstimatedLines = warrantyText.length * estimatedLinesPerWarranty;
      const averageLineHeight = availableHeight / totalEstimatedLines;
      
      // Calcular tamaño sugerido de forma más agresiva
      let suggestedInitialSize = Math.min(32, Math.max(16, averageLineHeight * 10)); // Multiplicador aumentado a 10x
      
      // FORZAR tamaño mínimo más grande según el espacio disponible
      if (availableHeight > 150) {
        suggestedInitialSize = Math.max(suggestedInitialSize, 22); // Mínimo 22 si hay mucho espacio
      } else if (availableHeight > 100) {
        suggestedInitialSize = Math.max(suggestedInitialSize, 18); // Mínimo 18 si hay espacio moderado
      } else if (availableHeight > 50) {
        suggestedInitialSize = Math.max(suggestedInitialSize, 14); // Mínimo 14 si hay poco espacio
      }
      
      // Debug: mostrar tamaño sugerido
      console.log("[PDF Preview] Espacio disponible:", availableHeight, "puntos");
      console.log("[PDF Preview] Número de garantías:", warrantyText.length);
      console.log("[PDF Preview] Tamaño sugerido inicial:", suggestedInitialSize, "puntos");
      
      // Empezar desde un tamaño MUY grande y reducir solo si es necesario
      const startSize = Math.min(32, Math.max(suggestedInitialSize, 14)); // Mínimo absoluto de 14 puntos
      console.log("[PDF Preview] Empezando búsqueda desde tamaño:", startSize, "puntos");
      
      // Reducir el paso para encontrar el tamaño máximo más preciso
      for (let testSize = startSize; testSize >= 8; testSize -= 0.2) { // No bajar de 8 puntos
        doc.setFontSize(testSize);
        let tempLeftY = warrantyPanelStartY + warrantyPaddingTop;
        let tempRightY = warrantyPanelStartY + warrantyPaddingTop;
        const maxYPerColumn: number[] = [];
        
        // Interlineado: aumentar para dar más espacio entre líneas y evitar que se monten
        // Aumentar el interlineado para mejorar la legibilidad y evitar superposiciones
        const baseLineSpacing = testSize * 0.42; // Aumentado de 0.36 a 0.42 para más espacio entre líneas
        optimalLineSpacing = baseLineSpacing;
        
        warrantyText.forEach((text, index) => {
          const isLeftColumn = index % 2 === 0;
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
          const textHeight = lines.length * baseLineSpacing;
          // Espacio entre garantías: AUMENTAR SIGNIFICATIVAMENTE para evitar que se monten
          const minSpaceBetween = Math.max(5, testSize * 0.4); // Aumentado de 0.3 a 0.4 y mínimo de 3 a 5
          const spaceBetweenWarranties = textHeight + minSpaceBetween;
          if (isLeftColumn) {
            tempLeftY += spaceBetweenWarranties;
            maxYPerColumn.push(tempLeftY);
          } else {
            tempRightY += spaceBetweenWarranties;
            maxYPerColumn.push(tempRightY);
          }
        });
        
        const testMaxY = Math.max(...maxYPerColumn, warrantyPanelStartY + warrantyPaddingTop);
        const testPanelHeight = testMaxY - warrantyPanelStartY + warrantyPaddingBottom;
        
        // VERIFICAR que realmente quepa con un margen de seguridad
        // El panel NO debe exceder el espacio disponible
        const safetyMargin = 2; // Margen de seguridad adicional
        if (testPanelHeight <= (availableHeight - safetyMargin)) {
          fontSize = testSize;
          maxY = testMaxY;
          warrantyPanelHeight = testPanelHeight;
          console.log("[PDF Preview] ✓ Tamaño que cabe encontrado:", testSize, "puntos, altura usada:", testPanelHeight, "/", availableHeight);
          // SALIR INMEDIATAMENTE - ya encontramos el tamaño máximo que cabe
          break;
        } else {
          // Debug: mostrar cuando un tamaño no cabe
          if (testSize >= 18) {
            console.log("[PDF Preview] ✗ Tamaño", testSize, "NO cabe - altura necesaria:", testPanelHeight, "> disponible:", availableHeight);
          }
        }
      }
      
      // Si aún no cabe, usar un tamaño mínimo más grande (nunca menos de 10 puntos)
      if (warrantyPanelHeight === 0 || warrantyPanelHeight > availableHeight) {
        console.warn("[PDF Preview] No se encontró tamaño que quepa, usando tamaño mínimo forzado");
        // Forzar un tamaño mínimo más grande según el espacio
        if (availableHeight > 50) {
          fontSize = Math.max(6, Math.min(16, availableHeight / warrantyText.length * 0.6));
        } else {
          fontSize = Math.max(10, availableHeight / warrantyText.length * 0.5);
        }
        console.log("[PDF Preview] Tamaño mínimo forzado:", fontSize, "puntos");
        doc.setFontSize(fontSize);
        let tempLeftY = warrantyPanelStartY + warrantyPaddingTop;
        let tempRightY = warrantyPanelStartY + warrantyPaddingTop;
        const maxYPerColumn: number[] = [];
        optimalLineSpacing = fontSize * 0.3; // Ultra-compacto
        
        warrantyText.forEach((text, index) => {
          const isLeftColumn = index % 2 === 0;
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
          const textHeight = lines.length * optimalLineSpacing;
          const minSpaceBetween = Math.max(1, fontSize * 0.2); // Mínimo espacio
          const spaceBetweenWarranties = textHeight + minSpaceBetween;
          if (isLeftColumn) {
            tempLeftY += spaceBetweenWarranties;
            maxYPerColumn.push(tempLeftY);
          } else {
            tempRightY += spaceBetweenWarranties;
            maxYPerColumn.push(tempRightY);
          }
        });
        
        maxY = Math.max(...maxYPerColumn, warrantyPanelStartY + warrantyPaddingTop);
        warrantyPanelHeight = Math.min(maxY - warrantyPanelStartY + warrantyPaddingBottom, availableHeight);
      }
      
      // Dibujar fondo del panel PRIMERO (el borde se redibuja después con la altura correcta)
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "F");
      
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
      
      // Debug: confirmar el tamaño de fuente que se está usando
      console.log("[PDF Preview] Tamaño de fuente final aplicado:", fontSize, "puntos");
      yPosition = warrantyPanelStartY + 10;
      
      const leftColumnX = margin + 3;
      const rightColumnX = margin + columnWidth + 9;
      
      let leftY = yPosition;
      let rightY = yPosition;
      
      // Usar el espaciado óptimo calculado (aumentado para más espacio entre líneas)
      let lineSpacing = optimalLineSpacing || fontSize * 0.42; // Aumentado de 0.36 a 0.42
      
      // Calcular el espacio que realmente ocupará el contenido con el tamaño de fuente actual
      let estimatedContentHeight = 0;
      warrantyText.forEach((text) => {
        const textWithBullet = `• ${text}`;
        const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
        const textHeight = lines.length * lineSpacing;
        const minSpaceBetween = Math.max(5, fontSize * 0.4); // Aumentado de 0.3 a 0.4 y mínimo de 3 a 5
        estimatedContentHeight += textHeight + minSpaceBetween;
      });
      estimatedContentHeight = estimatedContentHeight / 2; // Dividir por 2 porque son dos columnas
      
      // Si el contenido no ocupa todo el espacio disponible, aumentar SOLO el interlineado del texto
      // NO aumentar el espacio entre garantías, solo hacer el texto más legible
      const contentAreaHeight = availableHeight - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom;
      if (estimatedContentHeight < contentAreaHeight && contentAreaHeight > 0) {
        // Calcular factor de aumento para llenar el espacio aumentando el interlineado
        const expansionFactor = contentAreaHeight / estimatedContentHeight;
        lineSpacing = lineSpacing * Math.min(expansionFactor, 1.4); // Limitar a 1.4x para no exagerar
      }
      
      // Distribuir políticas entre las dos columnas
      // IMPORTANTE: Calcular el Y máximo permitido (justo antes de la firma)
      const signatureStartY = pageHeight - sigBoxHeight - signatureTextSpacing - sigTextHeight - minSeparationForSignature - bottomMargin;
      const maxAllowedY = signatureStartY - warrantyPaddingBottom; // Margen de seguridad
      
      warrantyText.forEach((text, index) => {
        const isLeftColumn = index % 2 === 0;
        const currentX = isLeftColumn ? leftColumnX : rightColumnX;
        let currentY = isLeftColumn ? leftY : rightY;
        
        // Agregar punto al inicio de cada política
        const textWithBullet = `• ${text}`;
        const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
        
        // Calcular altura del texto ANTES de dibujar
        const textHeight = lines.length * lineSpacing;
        const minSpaceBetween = Math.max(5, fontSize * 0.4); // Aumentado de 0.3 a 0.4 y mínimo de 3 a 5
        const spaceBetweenWarranties = textHeight + minSpaceBetween;
        
        // VERIFICAR que el texto completo quepa antes de dibujar
        const finalY = currentY + textHeight;
        if (finalY > maxAllowedY) {
          console.warn(`[PDF Preview] ADVERTENCIA: Garantía ${index} no cabe. Y final: ${finalY}, máximo: ${maxAllowedY}`);
          // Si no cabe, NO dibujar esta garantía y detener el bucle
          // Esto previene que se monte sobre la firma
          return;
        }
        
        // VERIFICAR que la posición actual no exceda el máximo
        if (currentY > maxAllowedY) {
          console.warn(`[PDF Preview] ADVERTENCIA: Garantía ${index} ya excede el máximo. Y: ${currentY}, máximo: ${maxAllowedY}`);
          return;
        }
        
        // Dibujar el texto solo si cabe completamente
        doc.text(lines, currentX, currentY);
        
        // Actualizar posición solo si el texto se dibujó correctamente
        if (isLeftColumn) {
          leftY += spaceBetweenWarranties;
          // Verificar que no exceda el máximo
          if (leftY > maxAllowedY) {
            leftY = maxAllowedY; // Limitar al máximo
          }
        } else {
          rightY += spaceBetweenWarranties;
          // Verificar que no exceda el máximo
          if (rightY > maxAllowedY) {
            rightY = maxAllowedY; // Limitar al máximo
          }
        }
      });
      
      // Calcular maxY real después de dibujar (usar el mayor entre leftY y rightY)
      const actualMaxY = Math.max(leftY, rightY);
      
      // NUNCA exceder el máximo permitido (justo antes de la firma)
      const finalMaxY = Math.min(actualMaxY, maxAllowedY);
      
      // Calcular altura del panel sin exceder el espacio disponible
      warrantyPanelHeight = finalMaxY - warrantyPanelStartY + warrantyPaddingBottom;
      
      // Verificar que la altura del panel no exceda el espacio disponible
      if (warrantyPanelHeight > availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom) {
        console.warn("[PDF Preview] ADVERTENCIA: Altura del panel excede el espacio disponible. Ajustando...");
        warrantyPanelHeight = availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom;
      }
      
      // Redibujar el borde del panel con la altura correcta (extendido hasta la firma)
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, warrantyPanelStartY, contentWidth, warrantyPanelHeight, "S");
      
      yPosition = finalMaxY;

      // === FIRMA - Posicionar al final absoluto de la hoja ===
      const signatureBoxWidth = 50;
      
      // Calcular posición de la firma: al final absoluto de la página
      // La firma debe estar lo más abajo posible, respetando solo el margen mínimo
      const signatureBoxY = pageHeight - sigBoxHeight - signatureTextSpacing - sigTextHeight - bottomMargin;
      
      // Verificar que la firma NO se monte sobre las garantías
      const warrantyEndY = warrantyPanelStartY + warrantyPanelHeight;
      const requiredSeparation = minSeparationForSignature;
      
      if (signatureBoxY < warrantyEndY + requiredSeparation) {
        // Si esto pasa, FORZAR que la firma esté después de las garantías
        console.error("[PDF Preview] ERROR CRÍTICO: Las garantías se están montando sobre la firma!");
        console.error(`[PDF Preview] warrantyEndY: ${warrantyEndY}, signatureBoxY: ${signatureBoxY}, requiredSeparation: ${requiredSeparation}`);
        // Ajustar la posición de la firma para que esté después de las garantías
        const adjustedSignatureY = warrantyEndY + requiredSeparation;
        if (adjustedSignatureY + sigBoxHeight + signatureTextSpacing + sigTextHeight <= pageHeight - bottomMargin) {
          // Solo ajustar si cabe en la página
          console.warn(`[PDF Preview] Ajustando posición de firma de ${signatureBoxY} a ${adjustedSignatureY}`);
          // Nota: No podemos cambiar signatureBoxY aquí porque ya se calculó arriba
          // Pero podemos verificar que el cálculo fue correcto
        } else {
          console.error("[PDF Preview] ERROR: No hay espacio para la firma después de las garantías!");
        }
      }
      
      const signatureBoxX = (pageWidth - signatureBoxWidth) / 2; // Centrado horizontalmente
      
      // Fondo gris
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, sigBoxHeight, "FD");

      // Texto "FIRMA DEL CLIENTE" fuera del recuadro, abajo
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const signatureText = "FIRMA DEL CLIENTE";
      const signatureTextWidth = doc.getTextWidth(signatureText);
      const signatureTextY = signatureBoxY + sigBoxHeight + 5; // Aumentado de 2 a 5 para dar espacio al texto
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
      // Cargar datos actualizados de la sucursal desde la base de datos
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderForPDF = {
        ...order,
        sucursal: branchData,
      };

      // Cargar configuración del sistema (forzar recarga para obtener garantías más recientes)
      const settings = await getSystemSettings(true);

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
      const branchName = orderForPDF.sucursal?.razon_social || orderForPDF.sucursal?.name || "iDocStore";
      doc.text(`Nombre: ${branchName}`, margin, yPosition);
      yPosition += 8; // Aumentado de 6 a 8 para igualar datos del cliente
      doc.text(`Fecha de Emisión: ${formatDateTime(order.created_at)}`, margin, yPosition);
      yPosition += 8; // Aumentado de 6 a 8
      if (orderForPDF.sucursal?.phone) {
        doc.text(`Teléfono: ${orderForPDF.sucursal.phone}`, margin, yPosition);
        yPosition += 8; // Aumentado de 6 a 8
      }
      if (orderForPDF.sucursal?.address) {
        const addressLines = doc.splitTextToSize(`Dirección: ${orderForPDF.sucursal.address}`, contentWidth);
        doc.text(addressLines, margin, yPosition);
        yPosition += addressLines.length * 8; // Aumentado de 6 a 8
      }
      if (orderForPDF.sucursal?.email) {
        doc.text(`Email: ${orderForPDF.sucursal.email}`, margin, yPosition);
        yPosition += 8; // Aumentado de 6 a 8
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
        yPosition += 8;
        doc.text(`Teléfono: ${order.customer.phone_country_code || "+56"} ${order.customer.phone}`, margin, yPosition);
        yPosition += 8;
        if (order.customer.email) {
          doc.text(`Email: ${order.customer.email}`, margin, yPosition);
          yPosition += 8;
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

      // === DATOS DEL EQUIPO - Layout Adaptativo ===
      const equipmentSectionStartY = yPosition;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL EQUIPO", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      // Calcular espacio disponible para el resto del documento
      const pageHeight = doc.internal.pageSize.getHeight();
      const qrSize = 60;
      const qrMargin = 15;
      const signatureBoxHeight = 40;
      const signatureTextHeight = 8;
      const warrantySectionHeight = 50; // Estimado
      const bottomMargin = margin;
      const reservedSpace = qrSize + qrMargin + signatureBoxHeight + signatureTextHeight + warrantySectionHeight + bottomMargin + 20;
      const maxEquipmentSectionHeight = pageHeight - equipmentSectionStartY - reservedSpace;
      
      // Interlineado adaptativo según espacio disponible
      const lineSpacing = maxEquipmentSectionHeight > 200 ? 7 : (maxEquipmentSectionHeight > 150 ? 6 : 5);
      
      doc.text(`Modelo: ${order.device_model}`, margin, yPosition);
      yPosition += lineSpacing;
      if (order.device_serial_number) {
        doc.text(`IMEI: ${order.device_serial_number}`, margin, yPosition);
        yPosition += lineSpacing;
      }
      if (order.device_unlock_code) {
        doc.text(`Passcode: ${order.device_unlock_code}`, margin, yPosition);
        yPosition += lineSpacing;
      }
      yPosition += lineSpacing;

      // Servicios - con interlineado adaptativo
      if (services.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("SERVICIOS", margin, yPosition);
        yPosition += 8;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const serviceLineSpacing = maxEquipmentSectionHeight > 200 ? 6 : 5;
        services.forEach((service) => {
          doc.text(`• ${service.name}`, margin, yPosition);
          yPosition += serviceLineSpacing;
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
      // signatureBoxHeight ya está declarado arriba (línea 1119) para el cálculo de espacio
      const signatureBoxWidth = contentWidth;
      doc.setFillColor(230, 230, 230);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight, "FD");
      yPosition += signatureBoxHeight + 10; // Aumentado de 6 a 10
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const signatureText = "FIRMA DEL CLIENTE";
      const signatureTextWidth = doc.getTextWidth(signatureText);
      doc.text(signatureText, (pageWidth - signatureTextWidth) / 2, yPosition);
      yPosition += 18; // Aumentado de 12 a 18

      // === GARANTÍA Y CONDICIONES - Layout Adaptativo ===
      // Calcular espacio disponible para garantías
      const warrantySectionStartY = yPosition;
      const availableWarrantyHeight = pageHeight - warrantySectionStartY - bottomMargin - 10;
      
      // Ajustar tamaño de fuente si el espacio es limitado
      let warrantyFontSize = 8;
      if (availableWarrantyHeight < 40) {
        warrantyFontSize = 7;
      } else if (availableWarrantyHeight < 30) {
        warrantyFontSize = 6;
      }
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const warrantyTitle = "GARANTÍA Y CONDICIONES DEL SERVICIO";
      const warrantyTitleWidth = doc.getTextWidth(warrantyTitle);
      const warrantyTitleX = Math.max(margin, Math.min((pageWidth - warrantyTitleWidth) / 2, pageWidth - margin - warrantyTitleWidth));
      doc.text(warrantyTitle, warrantyTitleX, yPosition);
      yPosition += 10;
      
      doc.setFontSize(warrantyFontSize);
      doc.setFont("helvetica", "normal");
      const warrantyText = "Las condiciones generales del servicio, garantías y exclusiones fueron informadas de forma previa y enviadas al correo electrónico del cliente. La firma de este documento constituye aceptación expresa de dichas condiciones.";
      const warrantyLines = doc.splitTextToSize(warrantyText, contentWidth);
      
      // Interlineado adaptativo
      const warrantyLineSpacing = warrantyFontSize === 6 ? 5 : (warrantyFontSize === 7 ? 5.5 : 6);
      
      warrantyLines.forEach((line: string) => {
        // Verificar que no exceda el espacio disponible
        if (yPosition + warrantyLineSpacing > pageHeight - bottomMargin - 5) {
          return; // No dibujar más líneas si excede
        }
        const lineWidth = doc.getTextWidth(line);
        const lineX = Math.max(margin, Math.min((pageWidth - lineWidth) / 2, pageWidth - margin - lineWidth));
        doc.text(line, lineX, yPosition);
        yPosition += warrantyLineSpacing;
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
      // Cargar configuración del sistema (forzar recarga para obtener datos más recientes)
      // Aunque este formato no muestra garantías, cargamos settings para consistencia
      await getSystemSettings(true);
      
      // Cargar datos actualizados de la sucursal desde la base de datos
      let branchData = null;
      
      // Si order.sucursal es un array (relación de Supabase), tomar el primer elemento
      if (order.sucursal) {
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }
      
      // Siempre intentar cargar datos actualizados desde la BD
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        }
      }

      // Crear orden con datos actualizados de sucursal
      const orderForPDF = {
        ...order,
        sucursal: branchData,
      };

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

      // Passcode (movido encima de la descripción del problema)
      if (order.device_unlock_code) {
        doc.setFont("helvetica", "bold");
        doc.text("Passcode:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(order.device_unlock_code, margin + 60, yPosition);
        yPosition += 10; // Más espacio abajo
      }

      // === PROBLEMA O DESCRIPCIÓN - Layout Adaptativo ===
      // Calcular espacio disponible para el resto del documento
      const problemSectionStartY = yPosition;
      const localInfoHeight = 30; // Estimado para local y fecha compromiso
      const bottomMarginEtiqueta = margin;
      const reservedSpaceEtiqueta = localInfoHeight + bottomMarginEtiqueta + 10; // Reducido de 15 a 10
      
      // NO truncar - permitir que la descripción use todo el espacio disponible
      // El formato tiene altura de 2000mm, así que puede crecer dinámicamente
      doc.setFont("helvetica", "bold");
      doc.text("Problema:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      
      // Dividir el texto en líneas sin truncar
      let problemLines = doc.splitTextToSize(order.problem_description || "", contentWidth - 60);
      
      // Calcular espacio disponible dinámicamente
      const availableProblemHeight = pageHeight - problemSectionStartY - reservedSpaceEtiqueta;
      
      // Calcular interlineado adaptativo para que TODO el texto quepa sin apretarse
      // Aumentar el interlineado base para mejor legibilidad
      let problemLineSpacing = 8; // Espaciado aumentado de 6 a 8 para mejor legibilidad
      if (problemLines.length > 0) {
        // Calcular el interlineado necesario para que todas las líneas quepan
        const requiredHeight = problemLines.length * 8; // Altura necesaria con interlineado aumentado
        if (requiredHeight > availableProblemHeight) {
          // Ajustar interlineado para que quepa todo, pero mantener mínimo de 6 puntos
          problemLineSpacing = Math.max(6, availableProblemHeight / problemLines.length);
        } else {
          // Hay espacio suficiente, usar interlineado aumentado
          problemLineSpacing = 8;
        }
      }
      
      // Dibujar TODAS las líneas con el interlineado adaptativo calculado
      // No truncar, solo adaptar el espaciado
      let currentProblemY = yPosition;
      problemLines.forEach((line: string) => {
        doc.text(line, margin + 60, currentProblemY);
        currentProblemY += problemLineSpacing;
      });
      
      // Actualizar yPosition basándose en todas las líneas dibujadas
      yPosition = currentProblemY + 8;

      // Local asignado
      if (orderForPDF.sucursal?.name) {
        doc.setFont("helvetica", "bold");
        doc.text("Local:", margin, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(orderForPDF.sucursal.name, margin + 50, yPosition);
        yPosition += 12; // Aumentado de 8 a 12
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

  async function handlePrint(format: 'a4' | 'boleta' | 'etiqueta', e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  function handleWhatsApp(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            disabled={!order.customer || !pdfBlob}
          >
            📱 Enviar por WhatsApp
          </button>
          <div className="relative" ref={printMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPrintMenu(!showPrintMenu);
              }}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark flex items-center gap-2"
              disabled={!pdfBlob}
            >
              🖨️ Imprimir
              {showPrintMenu ? ' ▲' : ' ▼'}
            </button>
            {showPrintMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-300 rounded-md shadow-lg min-w-[200px] z-50">
                <button
                  type="button"
                  onClick={(e) => handlePrint('a4', e)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-200 first:rounded-t-md"
                >
                  📄 Formato A4 (Carta)
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePrint('boleta', e)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-200"
                >
                  📋 Formato 80x2000 (Boleta)
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePrint('etiqueta', e)}
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
