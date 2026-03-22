import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkOrder, Service, Customer, User, Branch } from "@/types";
import { formatCLP } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { hasPermission } from "@/lib/permissions";
import OrderDetail from "./OrderDetail";
import PDFPreview from "./PDFPreview";
import CustomerEditModal from "./CustomerEditModal";
import OrderEditModal from "./OrderEditModal";
import { generatePDFBlob } from "@/lib/generate-pdf-blob";

interface OrdersTableProps {
  technicianId?: string;
  isAdmin?: boolean;
  user?: User;
  onNewOrder?: () => void;
}

export default function OrdersTable({ technicianId, isAdmin = false, user, onNewOrder }: OrdersTableProps) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderNumberFilter, setOrderNumberFilter] = useState<string>("");
  const [orderNumberInput, setOrderNumberInput] = useState<string>(""); // Estado local para el input
  const [dateFilter, setDateFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null);
  const [showNotificationDialog, setShowNotificationDialog] = useState<{
    orderId: string;
    newStatus: string;
    order: WorkOrder;
  } | null>(null);
  const [notificationMethods, setNotificationMethods] = useState<{
    email: boolean;
    whatsapp: boolean;
  }>({ email: true, whatsapp: false });
  const [pdfOrderData, setPdfOrderData] = useState<{
    order: WorkOrder;
    services: Service[];
    orderServices?: Array<{ quantity: number; unit_price: number; total_price: number; service_name: string; description?: string | null }>;
    serviceValue: number;
    replacementCost: number;
    warrantyDays: number;
    checklistData?: Record<string, 'ok' | 'damaged' | 'replaced'> | null;
    notes?: string[];
  } | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const orderNumberInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce para el filtro de número de orden
  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Si el input está vacío, actualizar inmediatamente para limpiar el filtro
    if (orderNumberInput.trim() === "") {
      setOrderNumberFilter("");
      return;
    }

    // Crear nuevo timeout para actualizar el filtro después de 500ms
    debounceTimeoutRef.current = setTimeout(() => {
      setOrderNumberFilter(orderNumberInput);
    }, 500);

    // Limpiar timeout al desmontar
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [orderNumberInput]);

  useEffect(() => {
    if (isAdmin) {
      loadBranches();
    }
    loadOrders();
  }, [technicianId, statusFilter, orderNumberFilter, dateFilter, dateToFilter, branchFilter]);

  async function loadBranches() {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  }

  // Cerrar menú de acciones al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openActionsMenu) {
        setOpenActionsMenu(null);
      }
    }

    if (openActionsMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openActionsMenu]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("work_orders")
        .select(`
          *,
          customer:customers(*),
          technician:users(*),
          sucursal:branches(*)
        `)
        .order("created_at", { ascending: false });

      // Filtrar órdenes según permisos y rol
      // Solo admin puede ver todas las órdenes (isAdmin=true solo para admin)
      // Los demás usuarios solo ven órdenes de su sucursal o las que crearon
      if (!isAdmin) {
        if (user?.sucursal_id) {
          // Si tiene sucursal_id, filtrar por sucursal (usuarios de sucursal)
          query = query.eq("sucursal_id", user.sucursal_id);
        } else if (technicianId) {
          // Si tiene technician_id pero no sucursal_id, filtrar por técnico
          query = query.eq("technician_id", technicianId);
        }
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Filtro por número de orden
      if (orderNumberFilter.trim() !== "") {
        query = query.eq("order_number", orderNumberFilter.trim());
      }

      // Filtro por sucursal (solo para admin)
      if (isAdmin && branchFilter !== "all") {
        query = query.eq("sucursal_id", branchFilter);
      }

      // Filtro por fecha (desde fecha seleccionada)
      if (dateFilter) {
        const fromDate = new Date(dateFilter);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", fromDate.toISOString());
      }

      // Filtro por fecha hasta (opcional)
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error cargando órdenes:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.sucursal_id, technicianId, statusFilter, orderNumberFilter, dateFilter, dateToFilter, branchFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_proceso":
        return "bg-blue-100 text-blue-800";
      case "por_entregar":
        return "bg-yellow-100 text-yellow-800";
      case "entregada":
        return "bg-green-100 text-green-800";
      case "rechazada":
        return "bg-red-100 text-red-800";
      case "garantia":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "bg-red-500";
      case "media":
        return "bg-yellow-500";
      case "baja":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "Urgente";
      case "media":
        return "Media";
      case "baja":
        return "Baja";
      default:
        return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "en_proceso":
        return "En Proceso";
      case "por_entregar":
        return "Por Entregar";
      case "entregada":
        return "Entregada";
      case "rechazada":
        return "Rechazada";
      case "sin_solucion":
        return "Sin Solución";
      case "garantia":
        return "Garantía";
      default:
        return status.replace("_", " ");
    }
  };

  async function handleStatusChange(orderId: string, newStatus: string) {
    // Verificar permiso para modificar órdenes
    if (!hasPermission(user || null, "modify_orders") && !isAdmin) {
      alert("No tienes permisos para modificar órdenes");
      return;
    }

    // Obtener la orden
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert("Orden no encontrada");
      return;
    }

    // Si el estado cambió a "por_entregar" y hay cliente, mostrar diálogo de notificación
    if (newStatus === 'por_entregar' && order.customer) {
      // Resetear métodos de notificación (email por defecto)
      setNotificationMethods({ email: true, whatsapp: false });
      // Mostrar diálogo
      setShowNotificationDialog({ orderId, newStatus, order });
      return;
    }

    // Para otros estados, cambiar directamente sin notificación
    await updateOrderStatus(orderId, newStatus, order, { email: false, whatsapp: false });
  }

  async function updateOrderStatus(
    orderId: string,
    newStatus: string,
    order: WorkOrder,
    methods: { email: boolean; whatsapp: boolean }
  ) {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);

      if (error) throw error;

      // Enviar notificaciones según los métodos seleccionados
      if (newStatus === 'por_entregar' && order.customer) {
        const notifications: string[] = [];

        // Enviar email si está seleccionado
        if (methods.email && order.customer.email) {
          try {
            console.log("[ORDERS TABLE] Enviando email de notificación para orden:", order.order_number);
            const emailResponse = await fetch('/api/send-order-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: order.customer.email,
                customerName: order.customer.name,
                orderNumber: order.order_number,
                branchName: order.sucursal?.name,
                branchEmail: order.sucursal?.email,
                emailType: 'ready_for_pickup',
              }),
            });

            if (!emailResponse.ok) {
              let errorData: any = {};
              try {
                const text = await emailResponse.text();
                if (text) {
                  try {
                    errorData = JSON.parse(text);
                  } catch {
                    errorData = { error: text || 'Error desconocido' };
                  }
                }
              } catch {
                errorData = { error: `Error ${emailResponse.status}` };
              }
              notifications.push(`⚠️ Error al enviar email: ${errorData.error || 'Error desconocido'}`);
            } else {
              notifications.push(`✅ Email enviado a ${order.customer.email}`);
            }
          } catch (emailError: any) {
            console.error("[ORDERS TABLE] Excepción al enviar email:", emailError);
            notifications.push(`⚠️ Error al enviar email: ${emailError.message || 'Error de red'}`);
          }
        }

        // Enviar WhatsApp si está seleccionado
        if (methods.whatsapp && order.customer.phone) {
          try {
            await sendWhatsAppNotification(order);
            notifications.push(`✅ WhatsApp abierto para ${order.customer.name}`);
          } catch (whatsappError: any) {
            console.error("[ORDERS TABLE] Excepción al enviar WhatsApp:", whatsappError);
            notifications.push(`⚠️ Error al abrir WhatsApp: ${whatsappError.message || 'Error desconocido'}`);
          }
        }

        // Mostrar resumen de notificaciones
        if (notifications.length > 0) {
          alert(`Orden actualizada a "Por entregar"\n\n${notifications.join('\n')}`);
        } else if (methods.email || methods.whatsapp) {
          alert(`Orden actualizada a "Por entregar"\n\n⚠️ No se pudo enviar ninguna notificación (faltan datos del cliente)`);
        }
      }

      // Actualizar estado local
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus as any } : o
      ));
      
      setEditingStatus(null);
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert("Error al actualizar el estado de la orden");
    }
  }

  async function handleConfirmNotification() {
    if (!showNotificationDialog) return;

    const { orderId, newStatus, order } = showNotificationDialog;
    setShowNotificationDialog(null);
    
    await updateOrderStatus(orderId, newStatus, order, notificationMethods);
  }

  async function sendWhatsAppNotification(order: WorkOrder) {
    if (!order.customer || !order.customer.phone) {
      throw new Error("El cliente no tiene teléfono configurado");
    }

    // Preparar número de teléfono
    const phone = order.customer.phone_country_code
      ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
      : "56" + order.customer.phone.replace(/\D/g, "");

    // Mensaje de notificación de cambio de estado (sin PDF, solo texto)
    const message = encodeURIComponent(
      `Hola ${order.customer.name},\n\n` +
      `Te informamos que tu orden ${order.order_number} está lista para retirar.\n\n` +
      `Estado: Por Entregar\n` +
      `${order.sucursal?.name ? `Sucursal: ${order.sucursal.name}\n` : ''}` +
      `${order.sucursal?.address ? `Dirección: ${order.sucursal.address}\n` : ''}` +
      `${order.sucursal?.phone ? `Teléfono: ${order.sucursal.phone}\n` : ''}\n` +
      `Por favor acércate a retirar tu equipo.\n\n` +
      `Saludos,\n${order.sucursal?.name || 'iDocStore'}`
    );

    // Abrir WhatsApp Web con el mensaje
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  async function handleViewPDF(order: WorkOrder) {
    try {
      // Cargar servicios de la orden con JOIN a services para obtener descripciones
      console.log("[OrdersTable] Cargando orderServices para orden:", order.id, "order_number:", order.order_number);
      const { data: orderServices, error: servicesError } = await supabase
        .from("order_services")
        .select(`
          *,
          service:services(description)
        `)
        .eq("order_id", order.id);

      if (servicesError) {
        console.error("[OrdersTable] Error cargando orderServices:", servicesError);
        throw servicesError;
      }
      
      console.log("[OrdersTable] orderServices cargados:", orderServices?.length || 0, orderServices);
      
      // Agregar descripción a orderServices si está disponible
      const orderServicesWithDescription = (orderServices || []).map((os: any) => ({
        ...os,
        description: os.service?.description || null
      }));

      // Cargar notas de la orden
      let { data: orderNotes, error: notesError } = await supabase
        .from("work_order_notes")
        .select("note")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (notesError) {
        const message = String(notesError.message || "").toLowerCase();
        const missingTable = message.includes("work_order_notes") &&
          (message.includes("could not find the table") || message.includes("schema cache") || message.includes("does not exist"));
        if (missingTable) {
          const fallback = await supabase
            .from("order_notes")
            .select("note")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false });
          orderNotes = fallback.data;
          notesError = fallback.error;
        }
      }

      if (notesError) throw notesError;

      // Cargar datos actualizados de la sucursal desde la base de datos
      // Esto asegura que el PDF siempre refleje los datos más recientes de la sucursal
      let branchData = null;
      if (order.sucursal_id) {
        const { data: updatedBranch, error: branchError } = await supabase
          .from("branches")
          .select("*")
          .eq("id", order.sucursal_id)
          .single();
        
        if (!branchError && updatedBranch) {
          branchData = updatedBranch;
        } else if (order.sucursal) {
          // Si falla la carga pero existe en la relación, usar la relación
          branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
        }
      } else if (order.sucursal) {
        // Si no hay sucursal_id pero existe la relación, usar la relación
        branchData = Array.isArray(order.sucursal) ? order.sucursal[0] : order.sucursal;
      }

      // Convertir order_services a servicios
      const services: Service[] = (orderServices || []).map((os: any) => ({
        id: os.service_id || os.id,
        name: os.service_name,
        description: null,
        default_price: os.unit_price || 0,
        created_at: os.created_at || new Date().toISOString(),
      }));

      // Calcular serviceValue: suma de todos los total_price de los servicios
      // Si no hay servicios guardados, usar labor_cost
      let serviceValue = order.labor_cost || 0;
      if (orderServices && orderServices.length > 0) {
        serviceValue = orderServices.reduce((sum: number, os: any) => sum + (os.total_price || 0), 0);
      }

      const replacementCost = order.replacement_cost || 0;
      const warrantyDays = order.warranty_days || 30;
      const notes = (orderNotes || []).map((n: any) => n.note);

      // Construir all_devices para el PDF si hay devices_data
      let allDevices = null;
      if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
        // Calcular costos del primer equipo restando los costos de los equipos adicionales del total
        const additionalDevicesTotalReplacement = ((order as any).devices_data as any[]).reduce(
          (sum: number, device: any) => sum + (device.replacement_cost || 0), 
          0
        );
        const additionalDevicesTotalLabor = ((order as any).devices_data as any[]).reduce(
          (sum: number, device: any) => sum + (device.labor_cost || 0), 
          0
        );
        
        // El costo del primer equipo es el total menos los costos de los equipos adicionales
        const firstDeviceReplacementCost = Math.max(0, (order.replacement_cost || 0) - additionalDevicesTotalReplacement);
        const firstDeviceLaborCost = Math.max(0, (order.labor_cost || 0) - additionalDevicesTotalLabor);
        
        // IMPORTANTE: Separar servicios del primer equipo de los servicios de equipos adicionales
        // Los equipos adicionales tienen sus servicios en devices_data[].selected_services
        // ESTRATEGIA: Usar el orden de inserción en lugar de filtrar por nombre/ID
        // Los servicios se guardan primero para el primer equipo, luego para los equipos adicionales
        // Por lo tanto, los primeros N servicios (donde N = cantidad de servicios del primer equipo) son del primer equipo
        
        console.log("[OrdersTable] DEBUG: Separando servicios. Total servicios en orderServices:", orderServices?.length);
        console.log("[OrdersTable] DEBUG: devices_data:", (order as any).devices_data);
        
        // Calcular cuántos servicios tiene el primer equipo
        // Si hay devices_data, el primer equipo tiene: total_servicios - servicios_equipos_adicionales
        let firstDeviceServicesCount = services.length;
        let additionalDevicesServicesCount = 0;
        
        if ((order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0) {
          ((order as any).devices_data as any[]).forEach((device: any, deviceIdx: number) => {
            console.log(`[OrdersTable] DEBUG: Equipo adicional ${deviceIdx + 1}:`, {
              model: device.device_model,
              selected_services: device.selected_services,
              selected_services_count: device.selected_services?.length || 0,
            });
            
            if (device.selected_services && Array.isArray(device.selected_services)) {
              additionalDevicesServicesCount += device.selected_services.length;
            }
          });
          
          firstDeviceServicesCount = services.length - additionalDevicesServicesCount;
          console.log(`[OrdersTable] DEBUG: Servicios del primer equipo (calculado): ${firstDeviceServicesCount}, Servicios de equipos adicionales: ${additionalDevicesServicesCount}`);
        }
        
        // Los primeros N servicios en orderServices son del primer equipo (orden de inserción)
        // Tomar los primeros firstDeviceServicesCount servicios de orderServices
        const firstDeviceOrderServices = (orderServices || []).slice(0, firstDeviceServicesCount);
        
        console.log("[OrdersTable] DEBUG: Servicios del primer equipo (por orden):", firstDeviceOrderServices.length, firstDeviceOrderServices.map((os: any) => ({ 
          service_id: os.service_id, 
          service_name: os.service_name,
          unit_price: os.unit_price 
        })));
        
        // Convertir firstDeviceOrderServices al formato correcto
        const firstDeviceServicesWithPrices = firstDeviceOrderServices.map((os: any) => {
          return {
            id: (os as any).service_id || (os as any).id,
            name: os.service_name,
            description: (os as any).description || null,
            quantity: os.quantity || 1,
            unit_price: os.unit_price || 0,
            total_price: os.total_price || (os.unit_price || 0) * (os.quantity || 1),
          };
        });
        
        console.log("[OrdersTable] Servicios del primer equipo calculados:", {
          total_servicios: services.length,
          servicios_equipos_adicionales: additionalDevicesServicesCount,
          servicios_primer_equipo: firstDeviceServicesWithPrices.length,
          servicios_primer_equipo_detalle: firstDeviceServicesWithPrices,
        });
        
        // Construir all_devices con el primer equipo (principal) y los adicionales
        allDevices = [
          // Equipo principal (primer equipo)
          {
            index: 1,
            device_type: order.device_type || "iphone",
            device_model: order.device_model || "",
            device_serial_number: order.device_serial_number || null,
            device_unlock_code: order.device_unlock_code || null,
            device_unlock_pattern: order.device_unlock_pattern || null,
            problem_description: order.problem_description || "",
            checklist_data: order.checklist_data || null,
            replacement_cost: firstDeviceReplacementCost,
            labor_cost: firstDeviceLaborCost,
            selected_services: firstDeviceServicesWithPrices,
          },
          // Equipos adicionales desde devices_data
          ...((order as any).devices_data as any[]).map((device: any, idx: number) => ({
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
          })),
        ];
      }

      // Crear orden con datos actualizados de sucursal y all_devices
      const orderWithUpdatedBranch = {
        ...order,
        sucursal: branchData,
        ...(allDevices ? { all_devices: allDevices } : {}),
      };

      setPdfOrderData({
        order: orderWithUpdatedBranch,
        services,
        orderServices: orderServicesWithDescription || undefined,
        serviceValue,
        replacementCost,
        warrantyDays,
        checklistData: order.checklist_data as Record<string, 'ok' | 'damaged' | 'replaced'> | null,
        notes: notes.length > 0 ? notes : undefined,
      });
    } catch (error) {
      console.error("Error cargando datos para PDF:", error);
      alert("Error al cargar los datos del PDF");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!isAdmin) {
      alert("Solo los administradores pueden eliminar órdenes");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar esta orden definitivamente? Esta acción no se puede deshacer y la orden será borrada permanentemente de la base de datos.")) {
      return;
    }

    setDeletingOrderId(orderId);

    try {
      // Primero eliminar las notas relacionadas (aunque deberían eliminarse automáticamente por CASCADE)
      let { error: notesDeleteError } = await supabase
        .from("work_order_notes")
        .delete()
        .eq("order_id", orderId);

      if (notesDeleteError) {
        const message = String(notesDeleteError.message || "").toLowerCase();
        const missingTable = message.includes("work_order_notes") &&
          (message.includes("could not find the table") || message.includes("schema cache") || message.includes("does not exist"));
        if (missingTable) {
          const fallback = await supabase
            .from("order_notes")
            .delete()
            .eq("order_id", orderId);
          notesDeleteError = fallback.error;
        }
      }

      if (notesDeleteError) throw notesDeleteError;

      // Eliminar los servicios relacionados (aunque deberían eliminarse automáticamente por CASCADE)
      await supabase
        .from("order_services")
        .delete()
        .eq("order_id", orderId);

      // Luego eliminar la orden definitivamente
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        alert(`Error al eliminar la orden: ${error.message}`);
      } else {
        // Recargar órdenes
        loadOrders();
        alert("Orden eliminada exitosamente");
      }
    } catch (error: any) {
      console.error("Error eliminando orden:", error);
      alert("Error al eliminar la orden. Intenta nuevamente.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  async function handleSendWhatsApp(order: WorkOrder) {
    if (!order.customer) {
      alert("No hay información del cliente");
      return;
    }

    try {
      // Cargar datos necesarios para el PDF con JOIN a services para obtener descripciones
      const { data: orderServices, error: servicesError } = await supabase
        .from("order_services")
        .select(`
          *,
          service:services(description)
        `)
        .eq("order_id", order.id);

      if (servicesError) throw servicesError;
      
      // Agregar descripción a orderServices si está disponible
      const orderServicesWithDescription = (orderServices || []).map((os: any) => ({
        ...os,
        description: os.service?.description || null
      }));

      // Convertir order_services a servicios
      const services: Service[] = (orderServicesWithDescription || []).map((os: any) => ({
        id: os.service_id || os.id,
        name: os.service_name,
        description: os.description,
        default_price: os.unit_price || 0,
        created_at: os.created_at || new Date().toISOString(),
      }));

      let serviceValue = order.labor_cost || 0;
      if (orderServicesWithDescription && orderServicesWithDescription.length > 0) {
        serviceValue = orderServicesWithDescription.reduce((sum: number, os: any) => sum + (os.total_price || 0), 0);
      }

      const replacementCost = order.replacement_cost || 0;
      const warrantyDays = order.warranty_days || 30;

      // Generar PDF
      const pdfBlob = await generatePDFBlob(
        order,
        services,
        serviceValue,
        replacementCost,
        warrantyDays,
        order.checklist_data as Record<string, 'ok' | 'damaged' | 'replaced'> | null,
        undefined,
        orderServicesWithDescription
      );

      // Descargar PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `orden-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      // Preparar número de teléfono
      const phone = order.customer.phone_country_code
        ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
        : "56" + order.customer.phone.replace(/\D/g, "");

      // Mensaje para WhatsApp
      const message = encodeURIComponent(
        `Hola ${order.customer.name},\n\nTe envío el PDF de tu orden ${order.order_number}.\n\nPor favor adjunta el archivo PDF que se descargó automáticamente.\n\nSaludos,\niDocStore`
      );

      // Abrir WhatsApp Web
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

      // Nota al usuario
      setTimeout(() => {
        alert("El PDF se ha descargado. Por favor arrástralo a WhatsApp Web para enviarlo.");
      }, 500);
    } catch (error) {
      console.error("Error enviando por WhatsApp:", error);
      alert("Error al generar el PDF para WhatsApp");
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-900">Órdenes de Trabajo</h2>
        <div className="flex gap-2">
          {onNewOrder && (
            <button
              onClick={onNewOrder}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors font-medium"
            >
              ➕ Nueva Orden
            </button>
          )}
          <select
            className="border border-slate-300 rounded-md px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="en_proceso">En Proceso</option>
            <option value="por_entregar">Por Entregar</option>
            <option value="entregada">Entregada</option>
            <option value="rechazada">Rechazada</option>
            <option value="sin_solucion">Sin Solución</option>
            <option value="garantia">Garantía</option>
          </select>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-end gap-4">
          {/* Filtro por número de orden */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número de Orden
            </label>
            <input
              ref={orderNumberInputRef}
              type="text"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="Ej: 24900"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              onKeyDown={(e) => {
                // Prevenir que Enter recargue la página
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Actualizar el filtro inmediatamente al presionar Enter
                  if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current);
                  }
                  setOrderNumberFilter(orderNumberInput);
                }
              }}
            />
          </div>

          {/* Filtro por fecha (inicio obligatorio, fin opcional) */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Filtro por fecha hasta (opcional) */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha Hasta (Opcional)
            </label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </div>

          {/* Filtro por sucursal (solo admin) */}
          {isAdmin && (
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sucursal
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">Todas las sucursales</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name || branch.razon_social}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botón para limpiar filtros */}
          <div className="flex-shrink-0">
            <button
              onClick={() => {
                setOrderNumberInput("");
                setOrderNumberFilter("");
                setDateFilter("");
                setDateToFilter("");
                setBranchFilter("all");
                setStatusFilter("all");
              }}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-slate-600 text-center py-8">No hay órdenes registradas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">N° Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Dispositivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Prioridad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  className="hover:bg-slate-50"
                >
                  <td 
                    className="px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const customer = order.customer as any as Customer;
                        if (customer) {
                          setEditingCustomer(customer);
                        }
                      }}
                      className="text-brand-light hover:text-brand-dark hover:underline cursor-pointer font-medium"
                      title="Click para editar cliente"
                    >
                      {(order.customer as any)?.name || "N/A"}
                    </button>
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-slate-700 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{order.device_model}</span>
                      {(order as any).devices_data && Array.isArray((order as any).devices_data) && (order as any).devices_data.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          +{(order as any).devices_data.length} más
                        </span>
                      )}
                    </div>
                  </td>
                  <td 
                    className="px-4 py-3 text-sm cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${getPriorityColor(order.priority)}`}></span>
                      <span className="text-slate-700">{getPriorityText(order.priority)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingStatus === order.id ? (
                      <select
                        className={`text-xs font-medium rounded-full border ${getStatusColor(order.status)} px-2 py-1`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        onBlur={() => setEditingStatus(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="en_proceso">En Proceso</option>
                        <option value="por_entregar">Por Entregar</option>
                        <option value="entregada">Entregada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="sin_solucion">Sin Solución</option>
                        <option value="garantia">Garantía</option>
                      </select>
                    ) : (
                      <span 
                        className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(order.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStatus(order.id);
                        }}
                        title="Clic para cambiar estado"
                      >
                        {getStatusText(order.status)}
                      </span>
                    )}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm font-medium text-slate-900 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {formatCLP(order.total_repair_cost, { withLabel: false })}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-slate-600 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPDF(order);
                        }}
                        className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors"
                        title="Ver PDF"
                      >
                        📄 PDF
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionsMenu(openActionsMenu === order.id ? null : order.id);
                          }}
                          className="px-3 py-1 text-sm bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors flex items-center gap-1"
                          title="Más acciones"
                        >
                          ⚙️ Acciones
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openActionsMenu === order.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                            {order.customer && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendWhatsApp(order);
                                  setOpenActionsMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                              >
                                <span>📱</span> WhatsApp
                              </button>
                            )}
                            {(isAdmin || hasPermission(user || null, "modify_orders")) && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOrder(order);
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                >
                                  <span>✏️</span> Editar
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOrder(order.id);
                                      setOpenActionsMenu(null);
                                    }}
                                    disabled={deletingOrderId === order.id}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span>🗑️</span> {deletingOrderId === order.id ? "Eliminando..." : "Eliminar"}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetail 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}

      {pdfOrderData && (
        <PDFPreview
          order={pdfOrderData.order}
          services={pdfOrderData.services}
          orderServices={pdfOrderData.orderServices}
          serviceValue={pdfOrderData.serviceValue}
          replacementCost={pdfOrderData.replacementCost}
          warrantyDays={pdfOrderData.warrantyDays}
          checklistData={pdfOrderData.checklistData}
          notes={pdfOrderData.notes}
          onClose={() => setPdfOrderData(null)}
          onDownload={() => setPdfOrderData(null)}
        />
      )}

      {/* Diálogo de selección de método de notificación */}
      {showNotificationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Seleccionar método de notificación
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              La orden se cambiará a "Por entregar". ¿Cómo deseas notificar al cliente?
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={notificationMethods.email}
                  onChange={(e) => setNotificationMethods({ ...notificationMethods, email: e.target.checked })}
                  className="w-4 h-4 text-brand-light focus:ring-brand-light"
                  disabled={!showNotificationDialog.order.customer?.email}
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">📧 Enviar por correo</div>
                  {showNotificationDialog.order.customer?.email ? (
                    <div className="text-xs text-slate-500">{showNotificationDialog.order.customer.email}</div>
                  ) : (
                    <div className="text-xs text-red-500">El cliente no tiene email configurado</div>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={notificationMethods.whatsapp}
                  onChange={(e) => setNotificationMethods({ ...notificationMethods, whatsapp: e.target.checked })}
                  className="w-4 h-4 text-brand-light focus:ring-brand-light"
                  disabled={!showNotificationDialog.order.customer?.phone}
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">📱 Enviar por WhatsApp</div>
                  {showNotificationDialog.order.customer?.phone ? (
                    <div className="text-xs text-slate-500">{showNotificationDialog.order.customer.phone}</div>
                  ) : (
                    <div className="text-xs text-red-500">El cliente no tiene teléfono configurado</div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNotificationDialog(null);
                  setNotificationMethods({ email: true, whatsapp: false });
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNotification}
                disabled={!notificationMethods.email && !notificationMethods.whatsapp}
                className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar y Cambiar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={async (updatedCustomer) => {
            console.log("[OrdersTable] Cliente actualizado recibido:", updatedCustomer);
            // Actualizar el cliente en todas las órdenes que lo referencian
            setOrders(orders.map(order => {
              const customerId = (order.customer as any)?.id || (order.customer as Customer)?.id;
              if (customerId === updatedCustomer.id) {
                console.log("[OrdersTable] Actualizando cliente en orden:", order.order_number);
                return { ...order, customer: updatedCustomer };
              }
              return order;
            }));
            setEditingCustomer(null);
            // Recargar órdenes para asegurar consistencia con la base de datos
            await loadOrders();
          }}
        />
      )}

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            loadOrders(); // Recargar órdenes después de editar
          }}
        />
      )}
    </div>
  );
}
