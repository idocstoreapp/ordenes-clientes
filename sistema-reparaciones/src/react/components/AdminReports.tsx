import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { currentWeekRange, formatDate, dateStringToUTCStart, dateStringToUTCEnd, dateToUTCStart, dateToUTCEnd } from "@/lib/date";
import { formatCLP } from "@/lib/currency";
import { calculatePayoutWeek, calculatePayoutYear } from "@/lib/payoutWeek";
// Bsale integration removed - now using manual receipt URL
import type { Order, Profile } from "@/types";

export default function AdminReports() {
  const [weekStart, setWeekStart] = useState(currentWeekRange().start);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "paid" | "pending" | "returned" | "cancelled">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"week" | "all" | "custom">("week");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [weeklyOrders, setWeeklyOrders] = useState<Order[]>([]);
  const [calculatedSettlements, setCalculatedSettlements] = useState<Array<{
    technician_id: string;
    technician_name: string;
    week_start: string;
    total_commission: number;
    orders_count: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<string | null>(null);

  // Función para cargar técnicos (reutilizable)
  const loadTechnicians = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "technician")
      .order("name");
    if (data) setTechnicians(data);
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  // Escuchar eventos de actualización de usuarios
  useEffect(() => {
    window.addEventListener('userCreated', loadTechnicians);
    window.addEventListener('userDeleted', loadTechnicians);
    window.addEventListener('userUpdated', loadTechnicians);

    return () => {
      window.removeEventListener('userCreated', loadTechnicians);
      window.removeEventListener('userDeleted', loadTechnicians);
      window.removeEventListener('userUpdated', loadTechnicians);
    };
  }, [loadTechnicians]);

  // Función para calcular liquidaciones basadas en órdenes pagadas
  const calculateSettlementsFromOrders = useCallback(async (startDate: string, endDate: string) => {
    setLoadingSettlements(true);
    try {
      // Usar funciones helper para crear fechas UTC desde strings YYYY-MM-DD
      const startUTC = dateStringToUTCStart(startDate);
      const endUTC = dateStringToUTCEnd(endDate);

      // Obtener todas las órdenes pagadas en ese rango (igual que en loadWeeklyReport)
      let ordersQuery = supabase
        .from("orders")
        .select("id, technician_id, created_at, commission_amount, week_start, status, receipt_number")
        .eq("status", "paid")
        .gte("created_at", startUTC.toISOString())
        .lte("created_at", endUTC.toISOString());

      // Filtrar solo órdenes con recibo (igual que en otros lugares del código)
      ordersQuery = ordersQuery.not("receipt_number", "is", null);

      if (selectedTechnician !== "all") {
        ordersQuery = ordersQuery.eq("technician_id", selectedTechnician);
      }

      const { data: paidOrders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error("Error obteniendo órdenes para liquidaciones:", ordersError);
        setCalculatedSettlements([]);
        setLoadingSettlements(false);
        return;
      }

      if (!paidOrders || paidOrders.length === 0) {
        setCalculatedSettlements([]);
        setLoadingSettlements(false);
        return;
      }

      // Log para depuración
      console.log(`Calculando liquidaciones: ${paidOrders.length} órdenes pagadas encontradas en rango ${startDate} a ${endDate}`);
      const totalByTech = new Map<string, number>();
      paidOrders.forEach((o: any) => {
        const current = totalByTech.get(o.technician_id) || 0;
        totalByTech.set(o.technician_id, current + (o.commission_amount || 0));
      });
      console.log("Total por técnico (sin agrupar por semana):", Array.from(totalByTech.entries()).map(([id, total]) => ({ id, total })));

      // Agrupar órdenes por técnico y por semana (sábado a viernes)
      const settlementsMap = new Map<string, {
        technician_id: string;
        technician_name: string;
        week_start: string;
        total_commission: number;
        orders_count: number;
      }>();

      for (const order of paidOrders) {
        // Verificar que la orden tenga comisión válida
        const commission = order.commission_amount || 0;
        if (commission <= 0) continue;

        // Calcular semana laboral: sábado a viernes
        let weekStart = order.week_start;
        if (!weekStart && order.created_at) {
          const orderDate = new Date(order.created_at);
          const dayOfWeek = orderDate.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
          const saturdayDate = new Date(orderDate);
          saturdayDate.setHours(0, 0, 0, 0);
          
          if (dayOfWeek === 6) { // Sábado
            weekStart = saturdayDate.toISOString().slice(0, 10);
          } else {
            // Domingo a viernes, retroceder hasta el sábado anterior
            const daysToSubtract = dayOfWeek + 1;
            saturdayDate.setDate(orderDate.getDate() - daysToSubtract);
            weekStart = saturdayDate.toISOString().slice(0, 10);
          }
        }

        if (!weekStart) continue;

        const techId = order.technician_id;
        const key = `${techId}-${weekStart}`;

        if (!settlementsMap.has(key)) {
          const tech = technicians.find(t => t.id === techId);
          settlementsMap.set(key, {
            technician_id: techId,
            technician_name: tech?.name || "Técnico desconocido",
            week_start: weekStart,
            total_commission: 0,
            orders_count: 0,
          });
        }

        const settlement = settlementsMap.get(key)!;
        settlement.total_commission += commission;
        settlement.orders_count += 1;
      }

      // Si no hay técnicos cargados, obtener los nombres de los técnicos encontrados
      if (technicians.length === 0 && paidOrders.length > 0) {
        const uniqueTechIds = [...new Set(paidOrders.map(o => o.technician_id))];
        const { data: techsData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", uniqueTechIds);

        if (techsData) {
          const techsMap = new Map(techsData.map(t => [t.id, t.name]));
          settlementsMap.forEach((settlement) => {
            settlement.technician_name = techsMap.get(settlement.technician_id) || "Técnico desconocido";
          });
        }
      } else {
        // Actualizar nombres de técnicos con los ya cargados
        settlementsMap.forEach((settlement) => {
          const tech = technicians.find(t => t.id === settlement.technician_id);
          if (tech) {
            settlement.technician_name = tech.name;
          }
        });
      }

      // Agregar un resumen total por técnico (sin agrupar por semana) para el rango completo
      const technicianTotals = new Map<string, {
        technician_id: string;
        technician_name: string;
        week_start: string;
        total_commission: number;
        orders_count: number;
      }>();

      // Primero, crear resumen total por técnico
      paidOrders.forEach((order) => {
        const techId = order.technician_id;
        const commission = order.commission_amount || 0;
        if (commission <= 0) return;

        if (!technicianTotals.has(techId)) {
          const tech = technicians.find(t => t.id === techId);
          technicianTotals.set(techId, {
            technician_id: techId,
            technician_name: tech?.name || "Técnico desconocido",
            week_start: `${startDate} a ${endDate}`, // Rango completo
            total_commission: 0,
            orders_count: 0,
          });
        }

        const total = technicianTotals.get(techId)!;
        total.total_commission += commission;
        total.orders_count += 1;
      });

      // Actualizar nombres de técnicos
      if (technicians.length === 0 && paidOrders.length > 0) {
        const uniqueTechIds = [...new Set(paidOrders.map(o => o.technician_id))];
        const { data: techsData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", uniqueTechIds);

        if (techsData) {
          const techsMap = new Map(techsData.map(t => [t.id, t.name]));
          technicianTotals.forEach((total) => {
            total.technician_name = techsMap.get(total.technician_id) || "Técnico desconocido";
          });
        }
      } else {
        technicianTotals.forEach((total) => {
          const tech = technicians.find(t => t.id === total.technician_id);
          if (tech) {
            total.technician_name = tech.name;
          }
        });
      }

      // Combinar resumen total con agrupación por semana
      // Mostrar primero el resumen total, luego el desglose por semana
      const totalSummaries = Array.from(technicianTotals.values()).sort((a, b) => 
        a.technician_name.localeCompare(b.technician_name)
      );

      const settlements = Array.from(settlementsMap.values()).sort((a, b) => {
        if (a.technician_name !== b.technician_name) {
          return a.technician_name.localeCompare(b.technician_name);
        }
        return b.week_start.localeCompare(a.week_start);
      });

      // Usar el resumen total en lugar del agrupado por semana
      console.log("Total por técnico (resumen del rango completo):", totalSummaries);
      console.log("Liquidaciones calculadas (agrupadas por semana):", settlements);
      
      setCalculatedSettlements(totalSummaries); // Mostrar resumen total, no agrupado por semana
    } catch (error) {
      console.error("Error calculando liquidaciones:", error);
      setCalculatedSettlements([]);
    } finally {
      setLoadingSettlements(false);
    }
  }, [selectedTechnician, technicians]);

  // Función para cargar reporte (reutilizable con useCallback)
  const loadWeeklyReport = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from("orders")
      .select("*, original_created_at, receipt_number, technician:users!technician_id(name), suppliers(id, name)")
      .order("created_at", { ascending: false });

    // Aplicar filtro de técnico
    if (selectedTechnician !== "all") {
      q = q.eq("technician_id", selectedTechnician);
    }

    // Aplicar filtro de estado
    if (selectedStatus !== "all") {
      q = q.eq("status", selectedStatus);
    } else {
      // Si es "all", excluir devueltas y canceladas por defecto (a menos que se filtren explícitamente)
      // Para ver todo incluyendo devueltas, usar filtro específico
    }

    // Aplicar filtro de fecha según el tipo seleccionado
    if (dateRangeFilter === "week") {
      const { start, end } = currentWeekRange(weekStart);
      // Convertir a UTC para evitar problemas de zona horaria
      const startUTC = dateToUTCStart(start);
      const endUTC = dateToUTCEnd(end);
      q = q.gte("created_at", startUTC.toISOString())
           .lte("created_at", endUTC.toISOString());
    } else if (dateRangeFilter === "custom") {
      if (customStartDate) {
        // Usar función helper para crear fecha UTC desde string YYYY-MM-DD
        const start = dateStringToUTCStart(customStartDate);
        q = q.gte("created_at", start.toISOString());
      }
      if (customEndDate) {
        // Usar función helper para crear fecha UTC desde string YYYY-MM-DD
        const end = dateStringToUTCEnd(customEndDate);
        q = q.lte("created_at", end.toISOString());
      }
    }
    // Si es "all", no aplicar filtro de fecha

    const { data, error } = await q;
    
    if (error) {
      console.error("Error cargando reporte administrativo:", error);
      // Si el error es por columna faltante (receipt_url), intentar sin él
      if (error.message?.includes("receipt_url") || error.code === "42703") {
        console.warn("⚠️ Campo receipt_url no existe, intentando sin él...");
        let q2 = supabase
          .from("orders")
          .select("*, original_created_at, receipt_number, technician:users!technician_id(name), suppliers(id, name)")
          .order("created_at", { ascending: false });
        
        // Aplicar los mismos filtros
        if (selectedTechnician !== "all") {
          q2 = q2.eq("technician_id", selectedTechnician);
        }
        if (selectedStatus !== "all") {
          q2 = q2.eq("status", selectedStatus);
        }
        if (dateRangeFilter === "week") {
          const { start, end } = currentWeekRange(weekStart);
          // Convertir a UTC para evitar problemas de zona horaria
          const startUTC = dateToUTCStart(start);
          const endUTC = dateToUTCEnd(end);
          q2 = q2.gte("created_at", startUTC.toISOString())
               .lte("created_at", endUTC.toISOString());
        } else if (dateRangeFilter === "custom") {
          if (customStartDate) {
            // Usar función helper para crear fecha UTC desde string YYYY-MM-DD
            const start = dateStringToUTCStart(customStartDate);
            q2 = q2.gte("created_at", start.toISOString());
          }
          if (customEndDate) {
            // Usar función helper para crear fecha UTC desde string YYYY-MM-DD
            const end = dateStringToUTCEnd(customEndDate);
            q2 = q2.lte("created_at", end.toISOString());
          }
        }
        
        const { data: data2, error: error2 } = await q2;
        if (error2) {
          console.error("❌ Error en segunda consulta:", error2);
          setWeeklyOrders([]);
          setLoading(false);
          return;
        }
        setWeeklyOrders((data2 as Order[]) ?? []);
      } else {
        console.error("❌ Error desconocido:", error);
        setWeeklyOrders([]);
      }
    } else {
      setWeeklyOrders((data as Order[]) ?? []);
    }
    
    setLoading(false);
    
    // Calcular liquidaciones automáticas si hay un rango de fechas seleccionado
    if (dateRangeFilter === "custom" && customStartDate && customEndDate) {
      await calculateSettlementsFromOrders(customStartDate, customEndDate);
    } else if (dateRangeFilter === "week") {
      const { start, end } = currentWeekRange(weekStart);
      await calculateSettlementsFromOrders(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10)
      );
    } else {
      setCalculatedSettlements([]);
    }
  }, [weekStart, selectedTechnician, selectedStatus, dateRangeFilter, customStartDate, customEndDate, calculateSettlementsFromOrders]);

  useEffect(() => {
    loadWeeklyReport();
  }, [loadWeeklyReport]);

  // Escuchar eventos de eliminación/actualización de órdenes
  useEffect(() => {
    window.addEventListener('orderDeleted', loadWeeklyReport);
    window.addEventListener('orderUpdated', loadWeeklyReport);

    return () => {
      window.removeEventListener('orderDeleted', loadWeeklyReport);
      window.removeEventListener('orderUpdated', loadWeeklyReport);
    };
  }, [loadWeeklyReport]);

  const totalWeek = weeklyOrders.reduce(
    (s, o) => s + (o.commission_amount ?? 0),
    0
  );

  async function handleDeleteOrder(orderId: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta orden definitivamente? Esta acción no se puede deshacer y la orden será borrada permanentemente de la base de datos.")) {
      return;
    }

    setDeletingOrderId(orderId);

    try {
      // Primero eliminar las notas relacionadas
      await supabase
        .from("order_notes")
        .delete()
        .eq("order_id", orderId);

      // Luego eliminar la orden definitivamente
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        alert(`Error al eliminar la orden: ${error.message}`);
      } else {
        // Recargar órdenes usando la función existente
        await loadWeeklyReport();
        
        // Disparar evento personalizado para notificar a otros componentes
        window.dispatchEvent(new CustomEvent('orderDeleted'));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error al eliminar la orden. Intenta nuevamente.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Reportes Administrativos
      </h3>

      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rango de Fechas
            </label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as "week" | "all" | "custom")}
            >
              <option value="week">Semana actual</option>
              <option value="all">Todas las fechas</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </div>
          {dateRangeFilter === "week" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Semana
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formatDate(weekStart).split("/").reverse().join("-")}
                onChange={(e) => setWeekStart(new Date(e.target.value))}
              />
            </div>
          )}
          {dateRangeFilter === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Filtrar por Técnico
            </label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
            >
              <option value="all">Todos los técnicos</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estado
            </label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagadas (con recibo)</option>
              <option value="pending">Pendientes</option>
              <option value="returned">Devueltas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-slate-700 mb-2">
          Historial de Órdenes {dateRangeFilter === "week" ? "Semanal" : dateRangeFilter === "custom" ? "Personalizado" : "Completo"}
        </h4>
        <p className="text-xs text-slate-500 mb-2">
          {weeklyOrders.length} órdenes encontradas
        </p>
        {loading ? (
          <div className="text-center text-slate-500 py-4">Cargando...</div>
        ) : (
          <>
            {/* Vista de Cards para Móvil */}
            <div className="lg:hidden space-y-3">
              {weeklyOrders.map((o) => (
                <div
                  key={o.id}
                  className={`bg-white rounded-lg border ${
                    o.status === "returned" || o.status === "cancelled"
                      ? "border-red-200 bg-red-50/30"
                      : "border-slate-200"
                  } shadow-sm`}
                >
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-500 mb-0.5">N° Orden</div>
                        <div className="text-sm font-bold text-slate-900">{o.order_number || "-"}</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          o.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : o.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : o.status === "returned"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {o.status === "pending" ? "Pend." : o.status === "paid" ? "Pagado" : o.status === "returned" ? "Dev." : "Canc."}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mb-1">
                      {formatDate(o.created_at)}
                      {o.original_created_at && new Date(o.original_created_at).getTime() !== new Date(o.created_at).getTime() && (
                        <button
                          onClick={() => setHistoryModalOpen(o.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 hover:underline text-[10px]"
                        >
                          Ver historial
                        </button>
                      )}
                    </div>
                    {o.receipt_number && (
                      <div className="text-xs">
                        <span className="text-slate-500">Recibo: </span>
                        {o.receipt_url ? (
                          <a
                            href={o.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {o.receipt_number}
                          </a>
                        ) : (
                          <span className="text-slate-700">{o.receipt_number}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5">Técnico</div>
                      <div className="text-sm text-slate-900">{(o as any).technician?.name || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 mb-0.5">Equipo y Servicio</div>
                      <div className="text-sm font-medium text-slate-900">{o.device}</div>
                      <div className="text-xs text-slate-600">{o.service_description}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-0.5">Repuesto</div>
                        <div className="text-sm font-medium text-slate-900">{formatCLP(o.replacement_cost || 0)}</div>
                        <div className="text-xs text-slate-600">{(o as any).suppliers?.name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 mb-0.5">Pago</div>
                        <div className="text-sm text-slate-700">{o.payment_method || "-"}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-0.5">Comisión</div>
                      <div className="text-base font-bold text-brand">{formatCLP(o.commission_amount || 0)}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteOrder(o.id)}
                      disabled={deletingOrderId === o.id}
                      className="w-full mt-2 px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingOrderId === o.id ? "Eliminando..." : "🗑️ Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista de Tabla para Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 px-2 font-semibold text-xs">Fecha</th>
                    <th className="py-2 px-2 font-semibold text-xs">N° Orden</th>
                    <th className="py-2 px-2 font-semibold text-xs">Técnico</th>
                    <th className="py-2 px-2 font-semibold text-xs">Equipo</th>
                    <th className="py-2 px-2 font-semibold text-xs text-right">Repuesto</th>
                    <th className="py-2 px-2 font-semibold text-xs">Proveedor</th>
                    <th className="py-2 px-2 font-semibold text-xs">Método de Pago</th>
                    <th className="py-2 px-2 font-semibold text-xs">N° Recibo</th>
                    <th className="py-2 px-2 font-semibold text-xs text-right">Comisión</th>
                    <th className="py-2 px-2 font-semibold text-xs">Estado</th>
                    <th className="py-2 px-2 font-semibold text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyOrders.map((o) => (
                    <tr key={o.id} className={`border-b border-slate-100 ${
                      o.status === "returned" || o.status === "cancelled" 
                        ? "bg-red-50/30" 
                        : ""
                    }`}>
                      <td className="py-2 px-2 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{formatDate(o.created_at)}</span>
                            {o.original_created_at && new Date(o.original_created_at).getTime() !== new Date(o.created_at).getTime() && (
                              <span className="text-[10px] text-amber-600" title="⚠️ Fecha modificada">⚠️</span>
                            )}
                          </div>
                          {o.original_created_at && new Date(o.original_created_at).getTime() !== new Date(o.created_at).getTime() && (
                            <span className="text-[9px] text-amber-600 italic block">
                              <span className="font-medium">Original:</span> {new Date(o.original_created_at).toLocaleDateString('es-CL')} → 
                              <span className="font-medium"> Cambiada a:</span> {new Date(o.created_at).toLocaleDateString('es-CL')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs font-medium">{o.order_number || "-"}</td>
                      <td className="py-2 px-2 text-xs">
                        {(o as any).technician?.name || "N/A"}
                      </td>
                      <td className="py-2 px-2 text-xs max-w-[120px] truncate" title={o.device}>{o.device}</td>
                      <td className="py-2 px-2 text-xs text-right">{formatCLP(o.replacement_cost || 0)}</td>
                      <td className="py-2 px-2 text-xs">
                        {(o as any).suppliers?.name || "-"}
                      </td>
                      <td className="py-2 px-2 text-xs">{o.payment_method || "-"}</td>
                      <td className="py-2 px-2 text-xs">
                        {o.receipt_number ? (
                          o.receipt_url ? (
                            <a
                              href={o.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                              title="Abrir recibo (se abre en nueva pestaña)"
                            >
                              {o.receipt_number}
                              <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-slate-700">{o.receipt_number}</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs font-semibold text-brand">
                        {formatCLP(o.commission_amount || 0)}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            o.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : o.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.status === "returned"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {o.status === "pending" ? "Pendiente" : 
                           o.status === "paid" ? "Pagado" :
                           o.status === "returned" ? "Devuelto" : "Cancelado"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleDeleteOrder(o.id)}
                          disabled={deletingOrderId === o.id}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingOrderId === o.id ? "..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-slate-600">
                {weeklyOrders.length === 0 
                  ? "No hay órdenes para los filtros seleccionados" 
                  : `${weeklyOrders.length} orden${weeklyOrders.length !== 1 ? 'es' : ''} encontrada${weeklyOrders.length !== 1 ? 's' : ''}`}
              </span>
              {selectedStatus === "all" || selectedStatus === "paid" ? (
                <span className="font-semibold text-slate-700">
                  Total comisiones: {formatCLP(totalWeek)}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Modal de Historial de Cambios */}
      {historyModalOpen && (() => {
        const order = weeklyOrders.find(o => o.id === historyModalOpen);
        if (!order || !order.original_created_at) return null;
        const originalDate = new Date(order.original_created_at);
        const currentDate = new Date(order.created_at);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHistoryModalOpen(null)}>
            <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Historial de Cambios</h3>
                <button onClick={() => setHistoryModalOpen(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-slate-600">Fecha Original:</span>
                  <span className="ml-2 text-slate-700">{originalDate.toLocaleDateString('es-CL')}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Fecha Actual:</span>
                  <span className="ml-2 text-slate-700">{currentDate.toLocaleDateString('es-CL')}</span>
                </div>
                {originalDate.getTime() !== currentDate.getTime() && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700">
                    ⚠️ La fecha fue modificada
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sección de Historial de Liquidaciones Calculadas */}
      {(dateRangeFilter === "custom" && customStartDate && customEndDate) || dateRangeFilter === "week" ? (
        <div className="mt-8 mb-4">
          <h4 className="font-medium text-slate-700 mb-2">
            Historial de Liquidaciones Calculadas
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Liquidaciones calculadas automáticamente basadas en órdenes pagadas del rango seleccionado
          </p>
          {loadingSettlements ? (
            <div className="text-center text-slate-500 py-4">Calculando liquidaciones...</div>
          ) : calculatedSettlements.length === 0 ? (
            <div className="text-center text-slate-500 py-4">
              No hay órdenes pagadas en el rango seleccionado para calcular liquidaciones
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 px-2 font-semibold text-xs">Técnico</th>
                    <th className="py-2 px-2 font-semibold text-xs">Semana (Inicio)</th>
                    <th className="py-2 px-2 font-semibold text-xs text-right">Órdenes</th>
                    <th className="py-2 px-2 font-semibold text-xs text-right">Total Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedSettlements.map((settlement, idx) => (
                    <tr key={`${settlement.technician_id}-${settlement.week_start}-${idx}`} className="border-b border-slate-100">
                      <td className="py-2 px-2 text-xs font-medium">{settlement.technician_name}</td>
                      <td className="py-2 px-2 text-xs">{formatDate(settlement.week_start)}</td>
                      <td className="py-2 px-2 text-xs text-right">{settlement.orders_count}</td>
                      <td className="py-2 px-2 text-xs font-semibold text-brand text-right">
                        {formatCLP(settlement.total_commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right">
                <span className="font-semibold text-slate-700">
                  Total calculado: {formatCLP(calculatedSettlements.reduce((sum, s) => sum + s.total_commission, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

