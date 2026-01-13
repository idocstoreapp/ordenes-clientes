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
    // Forzar regeneración del PDF cuando cambian los datos críticos
    if (order) {
      console.log("[PDF Preview] Regenerando PDF con order:", {
        order_number: order.order_number,
        has_all_devices: !!(order as any).all_devices,
        all_devices_length: (order as any).all_devices?.length || 0,
        all_devices: (order as any).all_devices
      });
    generatePDF();
    }
  }, [order?.id, order?.order_number]);

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

      // QR Code ELIMINADO según solicitud del usuario
      // No generar QR Code

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
      // Reducir altura del header (eliminado QR)
      const headerHeight = 25; // Reducido de 28 a 25 para más espacio
      doc.setFillColor(...darkStripeColor);
      doc.rect(0, 0, pageWidth, headerHeight, "F");

      // Logo de la empresa (sobre la franja, izquierda)
      if (logoDataUrl) {
        const logoHeight = settings.pdf_logo.height;
        const logoWidth = settings.pdf_logo.width;
        const logoY = (headerHeight - logoHeight) / 2;
        doc.addImage(logoDataUrl, "PNG", margin, logoY, logoWidth, logoHeight);
      }

      // N° Orden en caja pequeña (CENTRO del header) - solo el texto "N° Orden:" dentro
      doc.setFillColor(180, 180, 180); // Gris mucho más claro pero que se distinga del header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const orderLabelText = "N° Orden:";
      const orderLabelWidth = doc.getTextWidth(orderLabelText);
      const orderBoxWidth = orderLabelWidth + 6; // Solo el ancho necesario + padding
      const orderBoxHeight = 7; // Altura más pequeña
      const orderBoxX = (pageWidth - orderBoxWidth) / 2;
      const orderBoxY = 5; // Ajustado para header más pequeño
      doc.rect(orderBoxX, orderBoxY, orderBoxWidth, orderBoxHeight, "F");
      
      // Texto "N° Orden:" dentro del cuadro (blanco)
      doc.setTextColor(255, 255, 255);
      doc.text(orderLabelText, orderBoxX + 3, orderBoxY + 5);
      
      // Número de orden y fecha fuera del cuadro, abajo (negro)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const orderNumberY = orderBoxY + orderBoxHeight + 3; // Reducido de 4 a 3
      doc.text(order.order_number, orderBoxX + (orderBoxWidth - doc.getTextWidth(order.order_number)) / 2, orderNumberY);
      doc.setFontSize(7);
      const dateTimeText = formatDateTime(order.created_at);
      const dateTimeY = orderNumberY + 3; // Reducido de 4 a 3
      doc.text(dateTimeText, orderBoxX + (orderBoxWidth - doc.getTextWidth(dateTimeText)) / 2, dateTimeY);

      // QR Code ELIMINADO según solicitud del usuario

      // ELIMINAR espacio excesivo después del header (área marcada en rojo)
      yPosition = headerHeight + 2; // Casi pegado al header (solo 2 puntos de separación)

      // === PANEL NEGOCIO (Izquierda) ===
      const panelStartY = yPosition;
      
      // Ancho disponible para contenido de paneles (ajustado para que texto se adapte)
      const panelContentWidth = (contentWidth - 10) / 2 - 25;
      
      // Calcular altura necesaria PRECISAMENTE antes de dibujar
      // Usar tamaño de fuente estándar para el cálculo
      doc.setFontSize(9);
      let tempPanelY = yPosition + 8; // Padding superior
      const branchName = orderForPDF.sucursal?.name || "Sucursal";
      
      // Calcular líneas de texto reales
      const nameLines = doc.splitTextToSize(branchName, panelContentWidth);
      tempPanelY += nameLines.length * 4; // Interlineado compacto (4pt por línea)
      
      if (orderForPDF.sucursal?.address) {
        const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address, panelContentWidth);
        tempPanelY += addressLines.length * 4; // Interlineado compacto
      }
      if (orderForPDF.sucursal?.phone) {
        const phoneLines = doc.splitTextToSize(orderForPDF.sucursal.phone, panelContentWidth);
        tempPanelY += phoneLines.length * 4; // Altura estándar
      }
      if (orderForPDF.sucursal?.email) {
        const emailLines = doc.splitTextToSize(orderForPDF.sucursal.email, panelContentWidth);
        tempPanelY += emailLines.length * 4; // Altura estándar
      }
      
      // Altura del panel de negocio
      const businessPanelHeight = tempPanelY - panelStartY + 1; // +1 para padding inferior mínimo
      
      // === PANEL CLIENTE (Derecha) - calcular antes de dibujar ===
      const clientPanelX = margin + (contentWidth - 10) / 2 + 10;
      const clientPanelStartY = yPosition;
      
      // Calcular altura necesaria PRECISAMENTE antes de dibujar
      doc.setFontSize(9);
      let tempClientPanelY = yPosition + 8; // Padding superior
      if (order.customer) {
        const customerNameLines = doc.splitTextToSize(order.customer.name, panelContentWidth);
        tempClientPanelY += customerNameLines.length * 4; // Nombre (interlineado compacto)
        
        const phoneText = order.customer.phone_country_code
          ? `${order.customer.phone_country_code} ${order.customer.phone}`
          : order.customer.phone;
        const phoneLines = doc.splitTextToSize(phoneText, panelContentWidth);
        tempClientPanelY += phoneLines.length * 4; // Teléfono
        
        const emailLines = doc.splitTextToSize(order.customer.email, panelContentWidth);
        tempClientPanelY += emailLines.length * 4; // Correo
        
        if (order.customer.address) {
          const addressLines = doc.splitTextToSize(order.customer.address, panelContentWidth);
          tempClientPanelY += addressLines.length * 4; // Dirección (interlineado compacto)
        }
      }
      // Altura del panel de cliente
      const clientPanelHeight = tempClientPanelY - clientPanelStartY + 1; // +1 para padding inferior mínimo
      
      // ALTURA FIJA IGUAL PARA AMBOS PANELES - el panel más alto determina la altura
      const fixedPanelHeight = Math.max(businessPanelHeight, clientPanelHeight);
      
      // Dibujar fondo y borde de AMBOS paneles con ALTURA FIJA
      // El panel NO se deforma - el texto se ajusta dentro
      const panelWidth = (contentWidth - 10) / 2;
      
      // Panel de negocio (izquierda)
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, panelStartY, panelWidth, fixedPanelHeight, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, panelStartY, panelWidth, fixedPanelHeight, "S");
      
      // Panel de cliente (derecha)
      doc.setFillColor(250, 250, 250);
      doc.rect(clientPanelX, clientPanelStartY, panelWidth, fixedPanelHeight, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(clientPanelX, clientPanelStartY, panelWidth, fixedPanelHeight, "S");
      
      // Títulos de los paneles con franja azul
      doc.setFillColor(...stripeColor);
      doc.rect(margin, yPosition, panelWidth, 8, "F");
      doc.rect(clientPanelX, yPosition, panelWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("iDocStore", margin + 3, yPosition + 6);
      doc.text("CLIENTE", clientPanelX + 3, yPosition + 6);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      // Reducir margen superior (de 12 a 10)
      let panelY = yPosition + 10;

      // Nombre de la sucursal - texto se ajusta dentro del cuadro fijo
      doc.setFont("helvetica", "bold");
      doc.text("Sucursal:", margin + 3, panelY);
      doc.setFont("helvetica", "normal");
      // Usar panelContentWidth para ajuste automático de texto - NO se sale del cuadro
      const nameLinesFinal = doc.splitTextToSize(branchName, panelContentWidth);
      doc.text(nameLinesFinal, margin + 25, panelY);
      panelY += nameLinesFinal.length * 4; // Interlineado compacto (4pt)

      if (orderForPDF.sucursal?.address) {
        doc.setFont("helvetica", "bold");
        doc.text("Dirección:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        // El texto se ajusta automáticamente - SIEMPRE dentro del cuadro
        const addressLines = doc.splitTextToSize(orderForPDF.sucursal.address, panelContentWidth);
        doc.text(addressLines, margin + 25, panelY);
        panelY += addressLines.length * 4; // Interlineado compacto (4pt)
      }

      if (orderForPDF.sucursal?.phone) {
        doc.setFont("helvetica", "bold");
        doc.text("Teléfono:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        const phoneText = doc.splitTextToSize(orderForPDF.sucursal.phone, panelContentWidth);
        doc.text(phoneText, margin + 25, panelY);
        panelY += phoneText.length * 4;
      }

      if (orderForPDF.sucursal?.email) {
        doc.setFont("helvetica", "bold");
        doc.text("Correo:", margin + 3, panelY);
        doc.setFont("helvetica", "normal");
        const emailText = doc.splitTextToSize(orderForPDF.sucursal.email, panelContentWidth);
        doc.text(emailText, margin + 25, panelY);
        panelY += emailText.length * 4;
      }

      // Panel de cliente ya está dibujado arriba, ahora solo el contenido
      if (order.customer) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        // Reducir margen superior (de 12 a 10)
        let clientPanelY = yPosition + 10;

        doc.setFont("helvetica", "bold");
        doc.text("Nombre:", clientPanelX + 3, clientPanelY);
        doc.setFont("helvetica", "normal");
        // Texto se ajusta dentro del cuadro fijo - NO se sale
        const customerNameLines = doc.splitTextToSize(order.customer.name, panelContentWidth);
        doc.text(customerNameLines, clientPanelX + 25, clientPanelY);
        clientPanelY += customerNameLines.length * 4; // Interlineado compacto (4pt)

        const phoneText = order.customer.phone_country_code
          ? `${order.customer.phone_country_code} ${order.customer.phone}`
          : order.customer.phone;
        doc.setFont("helvetica", "bold");
        doc.text("Teléfono:", clientPanelX + 3, clientPanelY);
        doc.setFont("helvetica", "normal");
        const phoneLines = doc.splitTextToSize(phoneText, panelContentWidth);
        doc.text(phoneLines, clientPanelX + 25, clientPanelY);
        clientPanelY += phoneLines.length * 4; // Interlineado compacto

        doc.setFont("helvetica", "bold");
        doc.text("Correo:", clientPanelX + 3, clientPanelY);
        doc.setFont("helvetica", "normal");
        const emailLines = doc.splitTextToSize(order.customer.email, panelContentWidth);
        doc.text(emailLines, clientPanelX + 25, clientPanelY);
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

      // Usar la altura fija para continuar
      // ELIMINAR completamente el espacio entre paneles de sucursal/cliente y datos del equipo (área marcada en rojo)
      yPosition = panelStartY + fixedPanelHeight + 0;

      // === RECOPILAR TODOS LOS EQUIPOS ===
      // El primer equipo es el principal (orden principal)
      // Los equipos adicionales están en devices_data (JSONB) o all_devices (pasado desde OrderForm)
      const allDevices: Array<{
        index: number;
        device_type: string;
        device_model: string;
        device_serial_number?: string | null;
        device_unlock_code?: string | null;
        device_unlock_pattern?: number[] | null;
        problem_description: string;
        checklist_data?: Record<string, 'ok' | 'damaged' | 'replaced' | 'no_probado'> | null;
        replacement_cost: number;
        labor_cost: number;
        selected_services?: Array<{ id?: string; name: string; description?: string | null; quantity: number; unit_price: number; total_price: number }>;
      }> = [];

      // Agregar el primer equipo (equipo principal de la orden)
      // Si all_devices ya incluye el primer equipo, usarlo directamente; sino construirlo
      if ((order as any).all_devices && Array.isArray((order as any).all_devices) && (order as any).all_devices.length > 0) {
        // Si viene desde OrderForm o OrdersTable con all_devices, usar el primer elemento
        const firstDeviceData = (order as any).all_devices[0];
        console.log("[PDF Preview] firstDeviceData completo:", firstDeviceData);
        console.log("[PDF Preview] firstDeviceData.selected_services:", firstDeviceData.selected_services);
        console.log("[PDF Preview] firstDeviceData.selected_services tipo:", typeof firstDeviceData.selected_services);
        console.log("[PDF Preview] firstDeviceData.selected_services es array?:", Array.isArray(firstDeviceData.selected_services));
        console.log("[PDF Preview] all_devices completo:", (order as any).all_devices);
        console.log("[PDF Preview] all_devices[0] completo:", JSON.stringify((order as any).all_devices[0], null, 2));
        console.log("[PDF Preview] all_devices[0].selected_services:", (order as any).all_devices[0]?.selected_services);
        console.log("[PDF Preview] all_devices[0].selected_services length:", (order as any).all_devices[0]?.selected_services?.length);
        console.log("[PDF Preview] all_devices[0].labor_cost:", (order as any).all_devices[0]?.labor_cost);
        
        // Asegurar que selected_services sea un array válido
        let firstDeviceServices = firstDeviceData.selected_services;
        if (!Array.isArray(firstDeviceServices)) {
          console.warn("[PDF Preview] firstDeviceData.selected_services no es un array, convirtiendo...");
          firstDeviceServices = [];
        }
        
        // Si selected_services está vacío, intentar reconstruir desde orderServices o desde all_devices del OrderForm
        if (firstDeviceServices.length === 0) {
          console.log("[PDF Preview] selected_services está vacío, intentando reconstruir...");
          
          // Primero intentar desde orderServices si está disponible
          if (orderServices && orderServices.length > 0) {
            console.log("[PDF Preview] Reconstruyendo desde orderServices...");
            // Si hay devices_data, separar servicios del primer equipo
            if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
              const additionalDevicesServices = new Set<string>();
              ((order as any).devices_data as any[]).forEach((device: any) => {
                if (device.selected_services && Array.isArray(device.selected_services)) {
                  device.selected_services.forEach((service: any) => {
                    const serviceId = service.id || service.service_id;
                    if (serviceId) {
                      additionalDevicesServices.add(serviceId);
                    }
                    if (service.name) {
                      additionalDevicesServices.add(service.name);
                    }
                  });
                }
              });
              
              const firstDeviceOrderServices = orderServices.filter((os: any) => {
                const serviceId = (os as any).service_id || (os as any).id;
                const serviceName = os.service_name;
                return !additionalDevicesServices.has(serviceId) && !additionalDevicesServices.has(serviceName);
              });
              
              firstDeviceServices = firstDeviceOrderServices.map((os: any) => ({
                id: (os as any).service_id || (os as any).id,
                name: os.service_name,
                description: (os as any).description || null,
                quantity: os.quantity || 1,
                unit_price: os.unit_price || 0,
                total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
              }));
              
              console.log("[PDF Preview] Servicios reconstruidos desde orderServices (con equipos adicionales):", firstDeviceServices);
            } else {
              // Si no hay equipos adicionales, todos los orderServices son del primer equipo
              firstDeviceServices = orderServices.map((os: any) => ({
                id: (os as any).service_id || (os as any).id,
                name: os.service_name,
                description: (os as any).description || null,
                quantity: os.quantity || 1,
                unit_price: os.unit_price || 0,
                total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
              }));
              console.log("[PDF Preview] Servicios reconstruidos desde orderServices (sin equipos adicionales):", firstDeviceServices);
            }
          } else {
            // Si orderServices está vacío, verificar si hay servicios en all_devices[0] que se perdieron
            // Esto puede pasar si all_devices se construyó correctamente pero selected_services se perdió
            console.log("[PDF Preview] orderServices está vacío, verificando all_devices completo...");
            console.log("[PDF Preview] all_devices[0] completo:", JSON.stringify((order as any).all_devices[0], null, 2));
            
            // Si el primer equipo tiene labor_cost > 0, significa que tiene servicios pero no se guardaron
            // En este caso, no podemos reconstruir los servicios sin más información
            if (firstDeviceData.labor_cost > 0) {
              console.warn("[PDF Preview] ADVERTENCIA: El primer equipo tiene labor_cost > 0 pero no tiene servicios. Esto indica que los servicios no se guardaron correctamente en order_services.");
            }
          }
        }
        
        allDevices.push({
          index: 1,
          device_type: firstDeviceData.device_type || order.device_type || "iphone",
          device_model: firstDeviceData.device_model || order.device_model || "",
          device_serial_number: firstDeviceData.device_serial_number || order.device_serial_number || null,
          device_unlock_code: firstDeviceData.device_unlock_code || order.device_unlock_code || null,
          device_unlock_pattern: firstDeviceData.device_unlock_pattern || order.device_unlock_pattern || null,
          problem_description: firstDeviceData.problem_description || order.problem_description || "",
          checklist_data: firstDeviceData.checklist_data || checklistData || null,
          replacement_cost: firstDeviceData.replacement_cost || 0,
          labor_cost: firstDeviceData.labor_cost || 0,
          selected_services: firstDeviceServices,
        });
      } else {
        // Si no hay all_devices, construir el primer equipo desde los datos de la orden
        // Calcular costos del primer equipo: si hay devices_data, restar los costos adicionales
        let firstDeviceReplacementCost = order.replacement_cost || 0;
        let firstDeviceLaborCost = order.labor_cost || 0;
        
        if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
          // Calcular costos del primer equipo restando los costos de los equipos adicionales
          const additionalDevicesTotalReplacement = ((order as any).devices_data as any[]).reduce(
            (sum: number, device: any) => sum + (device.replacement_cost || 0), 
            0
          );
          const additionalDevicesTotalLabor = ((order as any).devices_data as any[]).reduce(
            (sum: number, device: any) => sum + (device.labor_cost || 0), 
            0
          );
          
          firstDeviceReplacementCost = Math.max(0, (order.replacement_cost || 0) - additionalDevicesTotalReplacement);
          firstDeviceLaborCost = Math.max(0, (order.labor_cost || 0) - additionalDevicesTotalLabor);
        }
        
        // Construir selected_services: preferir orderServices si está disponible (tiene precios reales)
        // IMPORTANTE: Si hay devices_data, separar servicios del primer equipo de los servicios de equipos adicionales
        let firstDeviceServices: Array<{ id?: string; name: string; description?: string | null; quantity: number; unit_price: number; total_price: number }> = [];
        
        if (orderServices && orderServices.length > 0) {
          // Si hay devices_data con equipos adicionales, filtrar servicios del primer equipo
          if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
            // Obtener todos los servicios de los equipos adicionales
            const additionalDevicesServices = new Set<string>();
            ((order as any).devices_data as any[]).forEach((device: any) => {
              if (device.selected_services && Array.isArray(device.selected_services)) {
                device.selected_services.forEach((service: any) => {
                  const serviceId = service.id || service.service_id;
                  if (serviceId) {
                    additionalDevicesServices.add(serviceId);
                  }
                  if (service.name) {
                    additionalDevicesServices.add(service.name);
                  }
                });
              }
            });
            
            // Filtrar orderServices: excluir los que están en equipos adicionales
            const firstDeviceOrderServices = orderServices.filter((os: any) => {
              const serviceId = (os as any).service_id || (os as any).id;
              const serviceName = os.service_name;
              return !additionalDevicesServices.has(serviceId) && !additionalDevicesServices.has(serviceName);
            });
            
            // Mapear a formato correcto
            firstDeviceServices = firstDeviceOrderServices.map((os: any) => ({
              id: (os as any).service_id || (os as any).id,
              name: os.service_name,
              description: (os as any).description || null,
              quantity: os.quantity || 1,
              unit_price: os.unit_price || 0,
              total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
            }));
            
            console.log("[PDF Preview] Servicios del primer equipo separados:", {
              total_orderServices: orderServices.length,
              servicios_equipos_adicionales: additionalDevicesServices.size,
              servicios_primer_equipo: firstDeviceServices.length,
              servicios_primer_equipo_detalle: firstDeviceServices,
            });
          } else {
            // Si no hay equipos adicionales, usar todos los orderServices para el primer equipo
            firstDeviceServices = orderServices.map((os: any) => ({
              id: (os as any).service_id || (os as any).id,
              name: os.service_name,
              description: (os as any).description || null,
              quantity: os.quantity || 1,
              unit_price: os.unit_price || 0,
              total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
            }));
          }
        } else if (services && services.length > 0) {
          // Fallback a services si no hay orderServices
          // Si hay devices_data, también filtrar aquí
          if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
            const additionalDevicesServices = new Set<string>();
            ((order as any).devices_data as any[]).forEach((device: any) => {
              if (device.selected_services && Array.isArray(device.selected_services)) {
                device.selected_services.forEach((service: any) => {
                  const serviceId = service.id || service.service_id;
                  if (serviceId) {
                    additionalDevicesServices.add(serviceId);
                  }
                  if (service.name) {
                    additionalDevicesServices.add(service.name);
                  }
                });
              }
            });
            
            firstDeviceServices = services
              .filter(s => !additionalDevicesServices.has(s.id) && !additionalDevicesServices.has(s.name))
              .map(s => ({
                id: s.id,
                name: s.name,
                description: s.description || null,
                quantity: 1,
                unit_price: s.default_price || 0,
                total_price: s.default_price || 0,
              }));
          } else {
            firstDeviceServices = services.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description || null,
              quantity: 1,
              unit_price: s.default_price || 0,
              total_price: s.default_price || 0,
            }));
          }
        }
        
        allDevices.push({
          index: 1,
          device_type: order.device_type || "iphone",
          device_model: order.device_model || "",
          device_serial_number: order.device_serial_number || null,
          device_unlock_code: order.device_unlock_code || null,
          device_unlock_pattern: order.device_unlock_pattern || null,
          problem_description: order.problem_description || "",
          checklist_data: checklistData || null,
          replacement_cost: firstDeviceReplacementCost,
          labor_cost: firstDeviceLaborCost,
          selected_services: firstDeviceServices,
        });
      }

      // Agregar equipos adicionales si existen
      // IMPORTANTE: Si ya usamos all_devices para el primer equipo, usar all_devices para los adicionales también
      if ((order as any).all_devices && Array.isArray((order as any).all_devices) && (order as any).all_devices.length > 1) {
        // Si viene desde OrderForm o OrdersTable con all_devices, usar los elementos adicionales
        ((order as any).all_devices as any[]).slice(1).forEach((device: any, idx: number) => {
          allDevices.push({
            index: idx + 2,
            device_type: device.device_type || "iphone",
            device_model: device.device_model || "",
            device_serial_number: device.device_serial_number || null,
            device_unlock_code: device.device_unlock_code || null,
            device_unlock_pattern: device.device_unlock_pattern || null,
            problem_description: device.problem_description || "",
            checklist_data: device.checklist_data || null,
            replacement_cost: device.replacement_cost || 0,
            labor_cost: device.labor_cost || 0,
            selected_services: device.selected_services || [],
          });
        });
      } else if ((order as any).devices_data && Array.isArray((order as any).devices_data)) {
        // Si no hay all_devices pero sí devices_data (desde la base de datos con JSONB)
        ((order as any).devices_data as any[]).forEach((device: any, idx: number) => {
          allDevices.push({
            index: idx + 2,
            device_type: device.device_type || "iphone",
            device_model: device.device_model || "",
            device_serial_number: device.device_serial_number || null,
            device_unlock_code: device.device_unlock_code || null,
            device_unlock_pattern: device.device_unlock_pattern || null,
            problem_description: device.problem_description || "",
            checklist_data: device.checklist_data || null,
            replacement_cost: device.replacement_cost || 0,
            labor_cost: device.labor_cost || 0,
            selected_services: device.selected_services || [],
          });
        });
      }
      
      // Debug: Log para verificar que se están cargando los equipos
      console.log("[PDF Preview] ====== INICIO DEBUG EQUIPOS ======");
      console.log("[PDF Preview] order.all_devices:", (order as any).all_devices);
      console.log("[PDF Preview] order.devices_data:", (order as any).devices_data);
      console.log("[PDF Preview] orderServices:", orderServices);
      console.log("[PDF Preview] services:", services);
      console.log("[PDF Preview] Total equipos encontrados:", allDevices.length);
      allDevices.forEach((d, idx) => {
        console.log(`[PDF Preview] Equipo ${idx + 1}:`, {
          index: d.index,
          model: d.device_model,
          has_selected_services: !!d.selected_services,
          selected_services_count: d.selected_services?.length || 0,
          selected_services: d.selected_services,
          labor_cost: d.labor_cost,
          replacement_cost: d.replacement_cost
        });
      });
      console.log("[PDF Preview] ====== FIN DEBUG EQUIPOS ======");

      // === PANEL DATOS DEL EQUIPO ===
      const equipmentPanelStartY = yPosition;
      
      // DIBUJAR EL FONDO DEL PANEL PRIMERO (antes del contenido)
      // Usar una altura estimada grande que luego se ajustará con el borde
      const estimatedPanelHeight = 300; // Altura estimada grande
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, equipmentPanelStartY, contentWidth, estimatedPanelHeight, "F");
      
      // === CÁLCULO DE ESPACIO DISPONIBLE CON PRESUPUESTOS DE ALTURA ===
      // IMPORTANTE: Las garantías SIEMPRE deben tener un espacio mínimo garantizado
      // Calcular espacio necesario para garantías y firma (NUNCA se invaden)
      const pageHeight = doc.internal.pageSize.getHeight();
      const sigBoxHeight = 18;
      const sigTextHeight = 6;
      const spaceAfterWarranty = 2; // Reducido al mínimo para maximizar espacio de garantías
      const bottomMargin = 1; // Mínimo absoluto - firma al final de la hoja
      const signatureTextSpacing = 5; // Espacio entre el cuadro de firma y el texto "FIRMA DEL CLIENTE"
      const spaceNeededForSignature = sigBoxHeight + sigTextHeight + spaceAfterWarranty + bottomMargin;
      const warrantyTitleHeight = 6;
      const warrantyPaddingTop = 8;
      const warrantyPaddingBottom = 3;
      // ESPACIO MÍNIMO GARANTIZADO PARA GARANTÍAS (calculado dinámicamente según número de garantías)
      // Calcular altura mínima basada en el número real de garantías
      const warrantyTextForCalculation = settings.warranty_policies.policies.map(policy => {
        return policy.replace("{warrantyDays}", warrantyDays.toString());
      });
      const numWarrantiesForCalculation = warrantyTextForCalculation.length;
      // CALCULAR espacio mínimo necesario para garantías de forma más realista
      // Reducir el espacio reservado inicialmente para dar más flexibilidad
      const minHeightPerWarranty = 3.5; // Reducido para dar más espacio a equipos
      const warrantyMinHeight = Math.max(25, numWarrantiesForCalculation * minHeightPerWarranty); // Mínimo reducido
      const spaceNeededForWarranty = warrantyTitleHeight + warrantyPaddingTop + warrantyMinHeight + warrantyPaddingBottom;
      const totalSpaceNeeded = spaceNeededForWarranty + spaceNeededForSignature;
      // ESPACIO MÁXIMO PARA EQUIPOS: El resto del espacio disponible
      // Reducir margen para dar más espacio a los equipos
      const maxAllowedYForEquipment = pageHeight - totalSpaceNeeded - 3; // Reducido margen
      const maxEquipmentPanelHeight = Math.max(120, maxAllowedYForEquipment - equipmentPanelStartY); // Reducido mínimo
      
      console.log("[PDF Preview] Número de garantías:", numWarrantiesForCalculation);
      console.log("[PDF Preview] Espacio reservado para garantías:", warrantyMinHeight, "puntos");
      console.log("[PDF Preview] Posición Y máxima para equipos:", maxAllowedYForEquipment, "puntos");
      console.log("[PDF Preview] Espacio máximo para panel de equipos:", maxEquipmentPanelHeight, "puntos");
      
      // === PRESUPUESTO DE ALTURA POR ZONA ===
      // Distribuir el espacio disponible entre las diferentes zonas del panel
      const equipmentPanelHeaderHeight = 12; // Header "DATOS DEL EQUIPO" (renombrado para evitar conflicto)
      const tableHeaderHeight = 10; // Header de la tabla (#, Modelo, Nota, Total)
      const totalBoxHeight = 20; // Cuadro de totales
      const spacingBetweenSections = 5; // Espacio entre secciones
      
      // Calcular espacio disponible para la zona de ítems (equipos + servicios)
      const reservedHeight = equipmentPanelHeaderHeight + tableHeaderHeight + totalBoxHeight + spacingBetweenSections;
      const maxItemsZoneHeight = Math.max(150, maxEquipmentPanelHeight - reservedHeight - 10); // Aumentado mínimo de 100 a 150
      
      // Calcular altura disponible por equipo (distribución proporcional)
      const numberOfDevices = allDevices.length;
      const estimatedServicesPerDevice = Math.ceil((orderServices?.length || services?.length || 0) / numberOfDevices) || 1;
      const servicesEstimatedHeight = estimatedServicesPerDevice * 10; // Altura estimada por servicio
      const minHeightPerDevice = 15; // Altura mínima por equipo
      const maxHeightPerDevice = Math.max(
        minHeightPerDevice,
        (maxItemsZoneHeight - (numberOfDevices - 1) * spacingBetweenSections) / numberOfDevices
      );
      
      // Si hay muchos equipos, reducir la altura por equipo proporcionalmente
      const availableHeightPerDevice = Math.max(minHeightPerDevice, maxHeightPerDevice - servicesEstimatedHeight);
      
      // === TIPOGRAFÍA ADAPTATIVA ===
      // Ajustar tamaño de fuente según cantidad de equipos y contenido
      // Más equipos = fuente más pequeña para que quepa todo
      let adaptiveFontSize = 8; // Tamaño base
      if (numberOfDevices > 2) {
        adaptiveFontSize = 7; // Reducir si hay más de 2 equipos
      }
      if (numberOfDevices > 3) {
        adaptiveFontSize = 6; // Reducir aún más si hay más de 3 equipos
      }
      doc.setFontSize(adaptiveFontSize);
      
      // NO dibujar el fondo ahora - se dibujará DESPUÉS del loop con la altura real
      // Solo dibujar el header del panel
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

      // === MOSTRAR TODOS LOS EQUIPOS EN FILAS DE LA TABLA ===
      // Iterar sobre todos los equipos con layout adaptativo
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      for (let deviceIndex = 0; deviceIndex < allDevices.length; deviceIndex++) {
        const device = allDevices[deviceIndex];
        const equipmentRowY = yPosition;
        colX = margin + 3;
        
        // Número de equipo
        doc.text(device.index.toString(), colX, yPosition);
        colX += colWidths[0];
        
        // Construir el texto del modelo con identificación clara del equipo
        // Agregar "EQUIPO X" al inicio para identificar claramente cada equipo
        let modelText = `EQUIPO ${device.index}\n${device.device_model || ""}`;
        if (device.device_serial_number) {
          modelText += `\nIMEI: ${device.device_serial_number}`;
        }
        if (device.device_unlock_code) {
          modelText += `\nPASSCODE: ${device.device_unlock_code}`;
        }
        if (device.device_unlock_pattern && Array.isArray(device.device_unlock_pattern)) {
          modelText += `\nPASSCODE: ${device.device_unlock_pattern.join("")}`;
        }
        
        // Dividir el texto del modelo en líneas
        const modelColWidth = colWidths[1] - 4;
        const modelLines = doc.splitTextToSize(modelText, modelColWidth);
        
        colX += colWidths[1];
        
        // Construir la descripción del problema con identificación clara del equipo
        // Agregar "EQUIPO X - " al inicio de la descripción para asociarla claramente
        let deviceDescription = `EQUIPO ${device.index} - ${device.problem_description || ""}`;
        
        // Notas adicionales (solo para el primer equipo)
        if (deviceIndex === 0 && notes && notes.length > 0) {
          if (deviceDescription) deviceDescription += "\n";
          notes.forEach((note) => {
            deviceDescription += `${note}\n`;
          });
        }
        
        // Dividir el texto en líneas que quepan en el ancho de la columna
        const descriptionColWidth = colWidths[2] - 6; // Ancho de la columna menos margen
        
        // === CALCULAR ALTURA DISPONIBLE PARA ESTE EQUIPO ===
        // Usar el presupuesto de altura calculado anteriormente
        const maxHeightForThisDevice = availableHeightPerDevice;
        const maxDescriptionHeightForDevice = Math.max(10, maxHeightForThisDevice - (modelLines.length * 4));
        
        // Dividir la descripción en líneas con límite de altura
        // Aplicar tipografía adaptativa: usar el tamaño de fuente adaptativo calculado arriba
        doc.setFontSize(adaptiveFontSize);
        let descriptionLines = doc.splitTextToSize(deviceDescription || "-", descriptionColWidth);
        
        // Calcular interlineado adaptativo para que el texto quepa en el espacio asignado
        // El interlineado se ajusta según el tamaño de fuente
        const baseLineSpacing = adaptiveFontSize * 0.45; // 45% del tamaño de fuente
        let descLineSpacing = baseLineSpacing;
        
        if (descriptionLines.length > 0) {
          const requiredHeight = descriptionLines.length * descLineSpacing;
          if (requiredHeight > maxDescriptionHeightForDevice) {
            // Ajustar interlineado o truncar si es necesario
            descLineSpacing = Math.max(adaptiveFontSize * 0.35, maxDescriptionHeightForDevice / descriptionLines.length);
            // Si aún no cabe, limitar número de líneas
            const maxLines = Math.floor(maxDescriptionHeightForDevice / descLineSpacing);
            if (descriptionLines.length > maxLines) {
              descriptionLines = descriptionLines.slice(0, maxLines);
              descriptionLines[descriptionLines.length - 1] += "...";
            }
          }
        }
        
        // Dibujar modelo (izquierda) - usar fuente adaptativa
        doc.setFontSize(adaptiveFontSize);
        let modelY = yPosition;
        const modelLineSpacing = adaptiveFontSize * 0.5; // 50% del tamaño de fuente
        modelLines.forEach((line: string) => {
          doc.text(line, margin + 3 + colWidths[0] + 2, modelY);
          modelY += modelLineSpacing; // Espaciado adaptativo entre líneas del modelo
        });
        
        // Dibujar descripción (centro)
        let descY = yPosition;
        descriptionLines.forEach((line: string) => {
          doc.text(line, colX + 2, descY);
          descY += descLineSpacing;
        });
        
        // Calcular altura real usada por este equipo con espaciado adaptativo
        const modelHeight = Math.max(7, modelLines.length * modelLineSpacing);
        const descHeight = Math.max(7, descriptionLines.length * descLineSpacing);
        const deviceRowHeight = Math.max(modelHeight, descHeight);
        
        // === PROTECCIÓN: Verificar que el equipo no exceda el espacio disponible ===
        // PERMITIR que el equipo use más espacio si es necesario - no truncar agresivamente
        // Las garantías se ajustarán después
        // NO limitar estrictamente aquí - permitir que el contenido se muestre completo
        
        // === MOSTRAR TOTAL DEL EQUIPO ===
        // Calcular total del equipo: replacement_cost + labor_cost
        const deviceTotal = (device.replacement_cost || 0) + (device.labor_cost || 0);
        const deviceTotalText = formatCLP(deviceTotal, { withLabel: false });
        
        colX = margin + 3 + colWidths[0] + colWidths[1] + colWidths[2];
        // Total del equipo alineado a la derecha, en negrita para destacarlo
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const deviceTotalWidth = doc.getTextWidth(deviceTotalText);
        const deviceTotalX = colX + colWidths[3] - deviceTotalWidth - 2;
        doc.text(deviceTotalText, deviceTotalX, equipmentRowY);
        
        // Mostrar detalles del total (repuesto + servicio) de manera discreta debajo
        doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        const deviceDetailText = `${formatCLP(device.replacement_cost || 0, { withLabel: false })} + ${formatCLP(device.labor_cost || 0, { withLabel: false })}`;
        const deviceDetailWidth = doc.getTextWidth(deviceDetailText);
        const deviceDetailX = colX + colWidths[3] - deviceDetailWidth - 2;
        doc.text(deviceDetailText, deviceDetailX, equipmentRowY + 4);
        
        // Restaurar valores por defecto
        doc.setFontSize(adaptiveFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        // Actualizar posición Y después de los datos del equipo
        yPosition = equipmentRowY + deviceRowHeight + 2; // Reducido de 3 a 2
        
        // === MOSTRAR SERVICIOS DEL EQUIPO (ANTES DEL CHECKLIST) ===
        const deviceServices = device.selected_services || [];
        console.log(`[PDF Preview] Equipo ${device.index} - Servicios encontrados:`, deviceServices.length);
        console.log(`[PDF Preview] Equipo ${device.index} - device.selected_services:`, device.selected_services);
        console.log(`[PDF Preview] Equipo ${device.index} - device completo:`, {
          index: device.index,
          model: device.device_model,
          has_selected_services: !!device.selected_services,
          selected_services_length: device.selected_services?.length || 0,
          selected_services: device.selected_services
        });
        
        // SIEMPRE mostrar los servicios si existen, sin restricciones de espacio
        if (deviceServices && deviceServices.length > 0) {
          doc.setFontSize(adaptiveFontSize);
          // REDUCIR espaciado entre servicios para aprovechar mejor el espacio
          const serviceLineSpacing = adaptiveFontSize * 0.25; // Reducido de 0.35 a 0.25
          
          // Mostrar título "Servicios a realizar" antes de los servicios
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(`Servicios a realizar - Equipo ${device.index}:`, margin + 3, yPosition);
          yPosition += 3; // Reducido de 4 a 3
          
          deviceServices.forEach((serviceItem: any) => {
            colX = margin + 3;
            doc.text("-", colX + 2, yPosition);
            colX += colWidths[0];
            
            // UNIFICAR FORMATO: Todos los servicios en negritas, sin mayúsculas forzadas
            const serviceNameText = serviceItem.name || serviceItem.service_name || "";
            doc.setFontSize(adaptiveFontSize);
            doc.setFont("helvetica", "bold"); // NEGRITAS para todos
            doc.setTextColor(0, 0, 0);
            const serviceNameLines = doc.splitTextToSize(serviceNameText, colWidths[1] - 4);
            doc.text(serviceNameLines, colX + 2, yPosition);
            colX += colWidths[1];
            
            let serviceNote = serviceItem.description || "Servicio de reparación";
            if (serviceNote === device.problem_description) {
              serviceNote = "Servicio de reparación";
            }
            doc.setFont("helvetica", "normal"); // Descripción en normal
            const noteLines = doc.splitTextToSize(serviceNote, colWidths[2] - 4);
            let noteY = yPosition;
            noteLines.forEach((line: string) => {
              doc.text(line, colX + 2, noteY);
              noteY += serviceLineSpacing;
            });
            colX += colWidths[2];
            
            // Mostrar total del servicio
            const totalAmount = serviceItem.total_price || (serviceItem.unit_price || 0) * (serviceItem.quantity || 1);
            const totalText = formatCLP(totalAmount, { withLabel: false });
            
            doc.setFontSize(adaptiveFontSize);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            const totalWidth = doc.getTextWidth(totalText);
            const totalX = colX + colWidths[3] - totalWidth - 2;
            doc.text(totalText, totalX, yPosition);
            
            // Mostrar cantidad y precio unitario
            doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            const detailText = `${serviceItem.quantity || 1} x ${formatCLP(serviceItem.unit_price || 0, { withLabel: false })}`;
            const detailWidth = doc.getTextWidth(detailText);
            const detailX = colX + colWidths[3] - detailWidth - 2;
            doc.text(detailText, detailX, yPosition + 3);
            
            // Restaurar valores por defecto
            doc.setFontSize(adaptiveFontSize);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            
            // REDUCIR altura entre servicios para aprovechar mejor el espacio
            const maxHeight = Math.max(
              serviceNameLines.length * serviceLineSpacing,
              noteLines.length * serviceLineSpacing,
              5 + 1 // Reducido de 6+2 a 5+1
            );
            yPosition += maxHeight + 0.5; // Reducido de 1 a 0.5 puntos de separación entre servicios
          });
        }
        
        // === MOSTRAR CHECKLIST DEL EQUIPO (DESPUÉS DE SERVICIOS, SIN TÍTULO) ===
        if (device.checklist_data && Object.keys(device.checklist_data).length > 0) {
          // Cargar items del checklist para este tipo de dispositivo
          let deviceChecklistItems: DeviceChecklistItem[] = [];
          try {
            const { data: checklistData } = await supabase
              .from("device_checklist_items")
              .select("*")
              .eq("device_type", device.device_type)
              .order("item_order");
            if (checklistData) {
              deviceChecklistItems = checklistData;
            }
          } catch (error) {
            console.error(`[PDF Preview] Error cargando checklist para equipo ${device.index}:`, error);
          }
          
          if (deviceChecklistItems.length > 0 || Object.keys(device.checklist_data).length > 0) {
            // SIN TÍTULO - mostrar checklist directamente después de servicios
            // Items del checklist
            doc.setFontSize(adaptiveFontSize);
            doc.setFont("helvetica", "normal");
            const checklistItemsList: string[] = [];
            deviceChecklistItems.forEach((item) => {
              const status = device.checklist_data?.[item.item_name];
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
            // También incluir items personalizados que no están en device_checklist_items
            Object.keys(device.checklist_data).forEach((itemName) => {
              if (!deviceChecklistItems.some(item => item.item_name === itemName)) {
                const status = device.checklist_data?.[itemName];
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
                checklistItemsList.push(`${itemName}${statusText}`);
              }
            });
            
            if (checklistItemsList.length > 0) {
              const checklistText = checklistItemsList.join(", ");
              const totalBoxWidthForChecklist = 30;
              const totalBoxXForChecklist = margin + contentWidth - totalBoxWidthForChecklist - 3;
              const leftSideWidth = totalBoxXForChecklist - margin - 6;
              const checklistLines = doc.splitTextToSize(checklistText, leftSideWidth);
              checklistLines.forEach((line: string) => {
                doc.text(line, margin + 3, yPosition);
                yPosition += 2.5; // Reducido de 3 a 2.5
              });
              yPosition += 1; // Reducido de 2 a 1 punto después del checklist
            }
          }
        }
        
        
        // === MOSTRAR REPUESTO DEL EQUIPO ===
        if (device.replacement_cost > 0) {
          // NO limitar - mostrar siempre si hay repuesto
          // Las garantías se ajustarán después
        colX = margin + 3;
        doc.text("-", colX + 2, yPosition);
        colX += colWidths[0];
        doc.text("REPUESTO", colX, yPosition);
        colX += colWidths[1];
        const repuestoNote = doc.splitTextToSize("Repuesto original", colWidths[2] - 2);
        doc.text(repuestoNote, colX, yPosition);
        colX += colWidths[2];
          
          const repuestoTotalAmount = device.replacement_cost;
        const repuestoTotalText = formatCLP(repuestoTotalAmount, { withLabel: false });
          doc.setFontSize(adaptiveFontSize);
          doc.setFont("helvetica", "bold");
        const repuestoTotalWidth = doc.getTextWidth(repuestoTotalText);
        const repuestoTotalX = colX + colWidths[3] - repuestoTotalWidth - 2;
        doc.text(repuestoTotalText, repuestoTotalX, yPosition);
          
          doc.setFontSize(Math.max(5, adaptiveFontSize * 0.65));
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 120, 120);
          const repuestoDetailText = `1 x ${formatCLP(device.replacement_cost, { withLabel: false })}`;
        const repuestoDetailWidth = doc.getTextWidth(repuestoDetailText);
        const repuestoDetailX = colX + colWidths[3] - repuestoDetailWidth - 2;
          doc.text(repuestoDetailText, repuestoDetailX, yPosition + 4);
          
          doc.setFontSize(adaptiveFontSize);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        yPosition += 7;
      }

        // Espacio adicional antes del siguiente equipo
        yPosition += 3;
      }

      // NO mostrar servicios mezclados si ya se mostraron por equipo (allDevices con selected_services)
      // Los servicios ya se mostraron dentro del bucle de equipos

      // === TOTAL GENERAL ===
      // IMPORTANTE: Calcular posición del total DESPUÉS de que todos los equipos se hayan mostrado
      // yPosition ahora refleja dónde terminó el último equipo
      const totalBoxWidth = 30;
      const totalBoxX = margin + contentWidth - totalBoxWidth - 3;
      const totalYPosition = yPosition + 5; // Espacio después del último equipo
      const actualTotalBoxHeight = 20;
      
      // Calcular panelEndY basándose en dónde terminó realmente el último equipo (yPosition)
      // y el total box que se dibujará después
      const calculatedPanelEndY = Math.max(yPosition + 10, totalYPosition + actualTotalBoxHeight + 5);
      // NO limitar estrictamente - usar el espacio real que necesita el contenido
      // Las garantías se ajustarán después
      const panelEndY = calculatedPanelEndY; // Usar el espacio real, no limitar
      const finalPanelHeight = panelEndY - equipmentPanelStartY;
      
      console.log("[PDF Preview] yPosition después de equipos:", yPosition, "puntos");
      console.log("[PDF Preview] totalYPosition:", totalYPosition, "puntos");
      console.log("[PDF Preview] Panel de equipos termina en:", panelEndY, "puntos (máximo permitido:", maxAllowedYForEquipment, "puntos)");
      
      // El fondo ya se dibujó antes del loop, ahora solo necesitamos redibujar el borde con la altura correcta
      // Dibujar el cuadro del total DENTRO del panel
      // Asegurar que el total box sea visible y no se tape
      doc.setFillColor(240, 240, 240);
      doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "F");
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(totalBoxX, totalYPosition, totalBoxWidth, actualTotalBoxHeight, "S");

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      
      // Calcular total con IVA - sumar todos los costos de todos los equipos
      const totalConIva = allDevices.reduce((sum, device) => {
        return sum + (device.replacement_cost || 0) + (device.labor_cost || 0);
      }, 0);
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

      // Garantía de días (solo el texto, sin checklist duplicado)
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      const warrantyDaysText = `Garantía ${warrantyDays} días`;
      doc.text(warrantyDaysText, margin + 3, totalYPosition + 4);
      
      // Dibujar borde del panel DESPUÉS de todos los equipos y el total
      // Esto asegura que el recuadro encierre TODOS los equipos
      // Primero tapar el fondo excedente dibujando un rectángulo blanco
      const excessHeight = estimatedPanelHeight - finalPanelHeight;
      if (excessHeight > 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, panelEndY, contentWidth, excessHeight, "F");
      }
      // Luego dibujar el borde con la altura correcta
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin, equipmentPanelStartY, contentWidth, finalPanelHeight, "S");

      // Actualizar yPosition para las políticas de garantía (después de TODO el panel)
      // IMPORTANTE: Las garantías DEBEN empezar DESPUÉS de donde terminó realmente el panel de equipos
      // El panel termina en panelEndY (incluye el total box), así que las garantías empiezan después de eso
      // REDUCIR el espacio al mínimo para aprovechar todo el espacio disponible
      const spaceAfterPanel = 2; // Espacio mínimo después del panel antes de las garantías
      yPosition = panelEndY + spaceAfterPanel;
      
      console.log("[PDF Preview] Posición final del panel (panelEndY):", panelEndY);
      console.log("[PDF Preview] Posición Y para garantías:", yPosition);

      // === POLÍTICAS DE GARANTÍA - en dos columnas con texto pequeño ===
      const warrantyPanelStartY = yPosition;
      
      console.log("[PDF Preview] Panel de equipos termina en:", panelEndY, "puntos");
      console.log("[PDF Preview] Garantías empiezan en:", warrantyPanelStartY, "puntos (después del panel con espacio de", spaceAfterPanel, "puntos)");
      
      // Usar políticas de garantía desde configuración (ya calculadas arriba)
      const warrantyText = warrantyTextForCalculation;
      
      // Calcular espacio disponible para garantías (asegurando que el cuadro de firma siempre quepa)
      // IMPORTANTE: Usar TODO el espacio REAL disponible, especialmente cuando hay un solo equipo
      const minSeparationForSignature = 2; // Separación MÍNIMA entre garantías y firma (reducido)
      const spaceForSignature = sigBoxHeight + signatureTextSpacing + sigTextHeight + minSeparationForSignature + bottomMargin;
      // Calcular el espacio disponible REAL - usar TODO el espacio disponible
      // Reducir el espacio para la firma para dar más espacio a las garantías
      const reducedSpaceForSignature = spaceForSignature - 8; // Reducir 8 puntos del espacio de la firma (aumentado de 5)
      const calculatedAvailableHeight = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - reducedSpaceForSignature;
      // Cuando hay un solo equipo, aprovechar TODO el espacio disponible (sin mínimo)
      // Cuando hay más equipos, usar el espacio disponible pero con un mínimo razonable
      const isSingleDevice = allDevices.length === 1;
      let availableHeight = isSingleDevice 
        ? Math.max(calculatedAvailableHeight, 30) // Usar TODO el espacio disponible, mínimo 30 solo para seguridad
        : Math.max(15, calculatedAvailableHeight); // Mínimo de 15 puntos cuando hay múltiples equipos (reducido de 20)
      
      console.log("[PDF Preview] Espacio calculado disponible para garantías:", calculatedAvailableHeight, "puntos");
      console.log("[PDF Preview] Espacio real disponible (con mínimo garantizado):", availableHeight, "puntos");
      
      // Asegurar que el espacio disponible sea positivo
      if (availableHeight <= 0) {
        console.error("[PDF Preview] ERROR: No hay espacio disponible para garantías. Ajustando layout.");
        // En caso extremo, reducir el espacio de la firma y usar más espacio
        const emergencySpace = pageHeight - warrantyPanelStartY - warrantyTitleHeight - warrantyPaddingTop - warrantyPaddingBottom - 15; // Reducir altura de firma de 20 a 15
        if (emergencySpace > 0) {
          console.warn("[PDF Preview] Usando espacio de emergencia:", emergencySpace);
          // Usar el espacio de emergencia si es mayor que el disponible
          if (emergencySpace > availableHeight) {
            availableHeight = emergencySpace;
          }
        }
      }
      
      // Debug: mostrar espacio disponible
      console.log("[PDF Preview] Espacio disponible para garantías:", availableHeight, "puntos");
      console.log("[PDF Preview] Número de garantías:", warrantyText.length);
      
      // Asegurar que siempre haya espacio mínimo para garantías
      if (availableHeight < 30) {
        console.warn("[PDF Preview] Espacio muy limitado para garantías, ajustando layout");
      }
      
      // === CÁLCULO DINÁMICO DE TAMAÑO DE FUENTE PARA GARANTÍAS ===
      // Fórmula según especificaciones:
      // - 14 garantías = 6pt
      // - 10 garantías = 7pt
      // - 12 garantías = 8pt (usuario solicita 1pt más)
      // - Cada garantía suma/resta 0.25pt
      // - Fórmula ajustada: tamaño = 7 - (num_garantias - 10) * 0.25 + 1 (para garantías >= 10 y < 14)
      const columnWidth = (contentWidth - 12) / 2;
      const numWarranties = numWarrantiesForCalculation;
      let fontSize = 7 - (numWarranties - 10) * 0.25;
      
      // Ajuste: para 12 garantías debe ser 8pt (1pt más que el calculado)
      if (numWarranties === 12) {
        fontSize = 8;
      }
      // Para otras cantidades, usar la fórmula pero con ajuste para hacer texto más grande
      if (numWarranties >= 10 && numWarranties < 14) {
        fontSize = Math.max(fontSize, 7); // Mínimo 7pt para este rango
      }
      
      // Asegurar tamaño mínimo razonable (no menos de 5pt) y máximo (no más de 12pt)
      fontSize = Math.max(5, Math.min(12, fontSize));
      
      console.log("[PDF Preview] Número de garantías:", numWarranties);
      console.log("[PDF Preview] Tamaño de fuente calculado:", fontSize, "puntos");
      
      // Calcular interlineado y espacio entre garantías
      // AJUSTAR dinámicamente el tamaño de fuente para que TODAS las garantías quepan
      // Primero calcular cuánto espacio necesita cada garantía con el tamaño actual
      doc.setFontSize(fontSize);
      // jsPDF usa aproximadamente fontSize para el espaciado entre líneas cuando usas doc.text(lines, x, y)
      // Usar un valor intermedio que sea realista pero permita aprovechar el espacio
      let optimalLineSpacing = fontSize * 0.5; // Espaciado compacto pero realista
      
      // Calcular el espacio total necesario con el tamaño de fuente actual
      // Primero calcular cuánto espacio necesita cada garantía en cada columna
      let leftColumnHeight = 0;
      let rightColumnHeight = 0;
      warrantyText.forEach((text, index) => {
        const textWithBullet = `• ${text}`;
        const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
        const textHeight = lines.length * optimalLineSpacing;
        if (index % 2 === 0) {
          leftColumnHeight += textHeight;
        } else {
          rightColumnHeight += textHeight;
        }
      });
      
      // El espacio necesario es el máximo de las dos columnas
      let totalHeightNeeded = Math.max(leftColumnHeight, rightColumnHeight);
      
      // AJUSTAR el tamaño de fuente para que TODAS las garantías quepan
      // Usar 99% del espacio disponible para aprovechar mejor el espacio
      const maxUsableHeight = availableHeight * 0.99;
      
      // Si el espacio necesario excede el disponible, reducir el tamaño de fuente
      if (totalHeightNeeded > maxUsableHeight) {
        const ratio = maxUsableHeight / totalHeightNeeded;
        fontSize = Math.max(3, fontSize * ratio); // Mínimo 3pt para que sea legible (reducido de 4)
        optimalLineSpacing = fontSize * 0.45; // Reducir interlineado para que quepan más garantías
        doc.setFontSize(fontSize);
        
        // Recalcular el espacio necesario con el nuevo tamaño
        leftColumnHeight = 0;
        rightColumnHeight = 0;
        warrantyText.forEach((text, index) => {
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
          const textHeight = lines.length * optimalLineSpacing;
          if (index % 2 === 0) {
            leftColumnHeight += textHeight;
          } else {
            rightColumnHeight += textHeight;
          }
        });
        totalHeightNeeded = Math.max(leftColumnHeight, rightColumnHeight);
        
        console.log("[PDF Preview] Tamaño de fuente REDUCIDO:", fontSize, "puntos");
        console.log("[PDF Preview] Espacio necesario:", totalHeightNeeded, "puntos, disponible:", availableHeight, "puntos");
      }
      
      // SIEMPRE intentar optimizar cuando hay un solo equipo y hay espacio disponible
      if (isSingleDevice && totalHeightNeeded < maxUsableHeight) {
        // Cuando hay un solo equipo, AUMENTAR el tamaño de fuente para ocupar TODO el espacio disponible
        // Usar búsqueda para encontrar el tamaño máximo que quepa
        let minFontSize = fontSize;
        let maxFontSize = Math.min(12, fontSize * 3); // Máximo 12pt o el triple del tamaño actual
        let bestFontSize = fontSize;
        
        // Probar diferentes tamaños desde el máximo hacia abajo hasta encontrar el que quepa
        for (let testSize = maxFontSize; testSize >= minFontSize; testSize -= 0.25) {
          doc.setFontSize(testSize);
          const testLineSpacing = testSize * 0.5;
          let testLeftHeight = 0;
          let testRightHeight = 0;
          
          warrantyText.forEach((text, index) => {
            const textWithBullet = `• ${text}`;
            const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
            const textHeight = lines.length * testLineSpacing;
            if (index % 2 === 0) {
              testLeftHeight += textHeight;
            } else {
              testRightHeight += textHeight;
            }
          });
          
          const testTotalHeight = Math.max(testLeftHeight, testRightHeight);
          
          // Si todas las garantías caben con este tamaño, usarlo
          if (testTotalHeight <= maxUsableHeight) {
            bestFontSize = testSize;
            fontSize = testSize;
            optimalLineSpacing = testLineSpacing;
            totalHeightNeeded = testTotalHeight;
            leftColumnHeight = testLeftHeight;
            rightColumnHeight = testRightHeight;
            break; // Usar el primer tamaño que quepa (el más grande)
          }
        }
        
        console.log("[PDF Preview] Tamaño de fuente OPTIMIZADO para aprovechar TODO el espacio (un solo equipo):", fontSize, "puntos");
        console.log("[PDF Preview] Espacio necesario:", totalHeightNeeded, "puntos, disponible:", availableHeight, "puntos (usando", (totalHeightNeeded / availableHeight * 100).toFixed(1), "%)");
      }
      
      // Asegurar que el tamaño de fuente esté aplicado
      doc.setFontSize(fontSize);
      
      let maxY = 0;
      let warrantyPanelHeight = 0;
      
      // Calcular altura real necesaria con el tamaño calculado
        let tempLeftY = warrantyPanelStartY + warrantyPaddingTop;
        let tempRightY = warrantyPanelStartY + warrantyPaddingTop;
        const maxYPerColumn: number[] = [];
        
        warrantyText.forEach((text, index) => {
          const isLeftColumn = index % 2 === 0;
          const textWithBullet = `• ${text}`;
          const lines = doc.splitTextToSize(textWithBullet, columnWidth - 3);
        const textHeight = lines.length * optimalLineSpacing;
        // ELIMINAR espacio entre garantías (solo el interlineado del texto)
        const minSpaceBetween = 0; // Sin espacio extra entre garantías
          const spaceBetweenWarranties = textHeight + minSpaceBetween;
          if (isLeftColumn) {
            tempLeftY += spaceBetweenWarranties;
            maxYPerColumn.push(tempLeftY);
          } else {
            tempRightY += spaceBetweenWarranties;
            maxYPerColumn.push(tempRightY);
          }
        });
        
      let testMaxY = Math.max(...maxYPerColumn, warrantyPanelStartY + warrantyPaddingTop);
      let testPanelHeight = testMaxY - warrantyPanelStartY + warrantyPaddingBottom;
      
      // NO expandir el interlineado - esto causa espacio excesivo entre garantías
      // El espacio debe ser mínimo y compacto para dejar lugar a los equipos
      // Usar el interlineado mínimo calculado sin expansión
      
          maxY = testMaxY;
      warrantyPanelHeight = Math.min(testPanelHeight, availableHeight + warrantyTitleHeight + warrantyPaddingTop + warrantyPaddingBottom);
      
      console.log("[PDF Preview] Altura del panel de garantías:", warrantyPanelHeight, "puntos");
      console.log("[PDF Preview] Interlineado óptimo:", optimalLineSpacing, "puntos");
      
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
      
      // Usar el espaciado óptimo calculado (ya ajustado para ocupar todo el espacio)
      const lineSpacing = optimalLineSpacing;
      
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
        // ELIMINAR espacio entre garantías (solo el interlineado del texto)
        const minSpaceBetween = 0; // Sin espacio extra entre garantías
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
      
      // Calcular total con IVA (esta función no tiene acceso a allDevices, usar serviceValue + replacementCost)
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
