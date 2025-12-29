import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { currentWeekRange, formatDate } from "@/lib/date";
import { formatCLP } from "@/lib/currency";
import { getCurrentPayoutWeek } from "@/lib/payoutWeek";
import type { Profile, SalaryAdjustment, Order, SalarySettlement, Role } from "@/types";
import SalarySettlementPanel from "./SalarySettlementPanel";

interface TechnicianPaymentsProps {
  refreshKey?: number;
  branchId?: string; // Opcional: filtrar por sucursal
  technicianIds?: string[]; // Opcional: lista de IDs de técnicos a mostrar
}

export default function TechnicianPayments({ refreshKey = 0, branchId, technicianIds }: TechnicianPaymentsProps) {
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<Profile[]>([]);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [adjustmentsByTech, setAdjustmentsByTech] = useState<Record<string, SalaryAdjustment[]>>({});
  const [returnsByTech, setReturnsByTech] = useState<Record<string, Order[]>>({});
  const [weeklyTotals, setWeeklyTotals] = useState<Record<string, number>>({});
  const [weeklyAdjustmentTotals, setWeeklyAdjustmentTotals] = useState<Record<string, number>>({});
  const [weeklyReturnsTotals, setWeeklyReturnsTotals] = useState<Record<string, number>>({});
  const [weeklySettlementTotals, setWeeklySettlementTotals] = useState<Record<string, number>>({});
  const [openSettlementPanels, setOpenSettlementPanels] = useState<Record<string, boolean>>({});
  const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<string | null>(null);
  const [loadingDetailsByTech, setLoadingDetailsByTech] = useState<Record<string, boolean>>({});
  const [settlingAdjustmentsByTech, setSettlingAdjustmentsByTech] = useState<Record<string, boolean>>({});
  const [settlingReturnsByTech, setSettlingReturnsByTech] = useState<Record<string, boolean>>({});
  const [actionErrorsByTech, setActionErrorsByTech] = useState<Record<string, string | null>>({});
  const [deletingReturnId, setDeletingReturnId] = useState<string | null>(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResults, setHistoryResults] = useState<SalarySettlement[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilters, setHistoryFilters] = useState<{
    technicianId: string;
    paymentMethod: "all" | "efectivo" | "transferencia" | "efectivo/transferencia";
    startDate: string;
    endDate: string;
  }>({
    technicianId: "all",
    paymentMethod: "all",
    startDate: "",
    endDate: "",
  });
  const [historyAggregates, setHistoryAggregates] = useState<{
    efectivo: number;
    transferencia: number;
    efectivo_transferencia: number;
  }>({
    efectivo: 0,
    transferencia: 0,
    efectivo_transferencia: 0,
  });
  const technicianNameMap = useMemo(
    () =>
      technicians.reduce<Record<string, string>>((acc, tech) => {
        acc[tech.id] = tech.name;
        return acc;
      }, {}),
    [technicians]
  );

  // Cargar técnicos adicionales que tengan liquidaciones pero que no estén en la lista principal
  const loadSettlementTechnicians = useCallback(async () => {
    // Obtener todos los IDs únicos de técnicos que tienen liquidaciones
    const { data: settlements } = await supabase
      .from("salary_settlements")
      .select("technician_id");
    
    if (settlements && settlements.length > 0) {
      const uniqueTechIds = [...new Set(settlements.map(s => s.technician_id))];
      // Obtener información de esos técnicos que no estén ya en la lista
      const missingTechIds = uniqueTechIds.filter(id => !technicianNameMap[id]);
      
      if (missingTechIds.length > 0) {
        const { data: missingTechs } = await supabase
          .from("users")
          .select("id, name")
          .in("id", missingTechIds);
        
        if (missingTechs && missingTechs.length > 0) {
          console.log("Técnicos adicionales encontrados en liquidaciones:", missingTechs);
          // Agregar estos técnicos al mapa si no están ya presentes
          setTechnicians(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newTechs = missingTechs.filter(t => !existingIds.has(t.id))
              .map(t => ({ ...t, role: "technician" as Role, email: "" }));
            return [...prev, ...newTechs];
          });
        }
      }
    }
  }, [technicianNameMap]);

  // Cargar técnicos adicionales cuando se carga el componente o cuando cambian las liquidaciones
  useEffect(() => {
    if (technicians.length > 0) {
      loadSettlementTechnicians();
    }
  }, [technicians.length, loadSettlementTechnicians]);

  const loadTechnicians = useCallback(async () => {
    let query = supabase
      .from("users")
      .select("*")
      .eq("role", "technician");
    
    // Filtrar por sucursal si se proporciona
    if (branchId) {
      query = query.eq("sucursal_id", branchId);
    }
    
    // Filtrar por lista de IDs si se proporciona
    if (technicianIds && technicianIds.length > 0) {
      query = query.in("id", technicianIds);
    }
    
    const { data } = await query.order("name");
    
    if (data) {
      setTechnicians(data);
      setTechnicianOptions(data);
      // Limpiar la selección si el técnico seleccionado ya no existe
      // No establecer fechas por defecto - dejar vacías para mostrar todas las liquidaciones
      setSelectedTech((currentSelected) => {
        if (currentSelected && !data.find((tech) => tech.id === currentSelected)) {
          return null;
        }
        return currentSelected;
      });
    }
  }, [branchId, technicianIds]);

  useEffect(() => {
    loadTechnicians();
  }, [refreshKey, loadTechnicians]);

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

  const loadWeeklyData = useCallback(async () => {
    if (technicians.length === 0) return;
      const { start, end } = currentWeekRange();
    const weekStartISO = start.toISOString().slice(0, 10);
      // ⚠️ CAMBIO CRÍTICO: Usar payout_week/payout_year para filtrar órdenes pagadas
      const currentPayout = getCurrentPayoutWeek();
      const totals: Record<string, number> = {};
      const adjustmentTotals: Record<string, number> = {};
      const returnsTotals: Record<string, number> = {};
    const settlementTotals: Record<string, number> = {};

      await Promise.all(
        technicians.map(async (tech) => {
        // Consultar liquidaciones para determinar qué excluir
        const { data: settlementsData } = await supabase
          .from("salary_settlements")
          .select("created_at, amount")
          .eq("technician_id", tech.id)
          .eq("week_start", weekStartISO)
          .order("created_at", { ascending: false });

        const lastSettlementDate = settlementsData && settlementsData.length > 0
          ? new Date(settlementsData[0].created_at)
          : null;

        // Consulta para órdenes - excluir las liquidadas
        // ⚠️ CAMBIO CRÍTICO: Usar payout_week/payout_year para órdenes pagadas
        let ordersQuery = supabase
          .from("orders")
          .select("commission_amount")
          .eq("technician_id", tech.id)
          .eq("status", "paid")
          .eq("payout_week", currentPayout.week)
          .eq("payout_year", currentPayout.year);
        
        if (lastSettlementDate) {
          ordersQuery = ordersQuery.gte("paid_at", lastSettlementDate.toISOString());
        }

        // Consulta para ajustes - excluir los liquidadas
        let adjustmentsQuery = supabase
          .from("salary_adjustments")
          .select("amount, available_from, created_at, id, type, note")
          .eq("technician_id", tech.id);
        
        if (lastSettlementDate) {
          // Solo ajustes creados después de la liquidación
          adjustmentsQuery = adjustmentsQuery.gte("created_at", lastSettlementDate.toISOString());
        }

        // Consulta para devoluciones - excluir las liquidadas
        let returnsQuery = supabase
          .from("orders")
          .select("commission_amount")
          .eq("technician_id", tech.id)
          .in("status", ["returned", "cancelled"])
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
        
        if (lastSettlementDate) {
          returnsQuery = returnsQuery.gte("created_at", lastSettlementDate.toISOString());
        }

        const [
          { data: orders },
          { data: adjustmentsData },
          { data: returnedData },
          { data: settlementAmounts },
        ] = await Promise.all([
          ordersQuery,
          adjustmentsQuery.order("created_at", { ascending: false }),
          returnsQuery,
          supabase
            .from("salary_settlements")
            .select("amount")
            .eq("technician_id", tech.id)
            .eq("week_start", weekStartISO),
        ]);

        totals[tech.id] = orders?.reduce((s, o) => s + (o.commission_amount ?? 0), 0) ?? 0;
        
        // Calcular total de ajustes disponibles (ya filtrados por liquidación)
        const adjustmentsForWeek = adjustmentsData
          ?.filter((adj) => {
            const availableFrom = adj.available_from
              ? new Date(adj.available_from)
              : new Date(adj.created_at);
            return availableFrom <= end;
          })
          .reduce((sum, adj) => sum + (adj.amount ?? 0), 0) ?? 0;

        adjustmentTotals[tech.id] = adjustmentsForWeek;
        returnsTotals[tech.id] =
          returnedData?.reduce((s, o) => s + (o.commission_amount ?? 0), 0) ?? 0;
        settlementTotals[tech.id] =
          settlementAmounts?.reduce((sum: number, row: { amount: number }) => sum + (row.amount ?? 0), 0) ?? 0;
        })
      );

      setWeeklyTotals(totals);
      setWeeklyAdjustmentTotals(adjustmentTotals);
      setWeeklyReturnsTotals(returnsTotals);
    setWeeklySettlementTotals(settlementTotals);
  }, [technicians]);

  useEffect(() => {
    if (technicians.length > 0) {
      void loadWeeklyData();
    }
  }, [technicians, loadWeeklyData]);

  const loadAdjustmentsForTech = useCallback(
    async (techId: string | null, force = false) => {
      if (!techId) return;
      if (!force && adjustmentsByTech[techId] && returnsByTech[techId]) {
        return;
      }

      setActionErrorsByTech((prev) => ({ ...prev, [techId]: null }));
      setLoadingDetailsByTech((prev) => ({ ...prev, [techId]: true }));
      // No usar filtro de semana - cargar todos los ajustes y devoluciones pendientes
      // Los ajustes y devoluciones persisten hasta que se liquiden manualmente

      try {
        const [{ data: adjustmentsData, error: adjError }, { data: returnedData, error: retError }] =
          await Promise.all([
        supabase
          .from("salary_adjustments")
          .select("*")
              .eq("technician_id", techId)
          // No filtrar por semana - cargar TODOS los ajustes pendientes
          // Los ajustes persisten hasta que se liquiden manualmente
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
              .eq("technician_id", techId)
          .in("status", ["returned", "cancelled"])
          // No filtrar por semana - cargar TODAS las devoluciones pendientes
          // Las devoluciones persisten hasta que se liquiden manualmente
          .order("created_at", { ascending: false }),
      ]);

        if (adjError || retError) {
          throw adjError || retError;
        }

        setAdjustmentsByTech((prev) => ({
          ...prev,
          [techId]: (adjustmentsData as SalaryAdjustment[]) ?? [],
        }));
        setReturnsByTech((prev) => ({
          ...prev,
          [techId]: (returnedData as Order[]) ?? [],
        }));
      } catch (error) {
        console.error("Error cargando ajustes/devoluciones:", error);
        setActionErrorsByTech((prev) => ({
          ...prev,
          [techId]: "No pudimos cargar los ajustes. Intenta nuevamente.",
        }));
      } finally {
        setLoadingDetailsByTech((prev) => ({ ...prev, [techId]: false }));
      }
    },
    [adjustmentsByTech, returnsByTech]
  );

  const toggleSettlementPanel = useCallback(
    (techId: string) => {
      setOpenSettlementPanels((prev) => {
        const nextOpen = !prev[techId];
        if (nextOpen) {
          void loadAdjustmentsForTech(techId);
        }
        return {
          ...prev,
          [techId]: nextOpen,
        };
      });
    },
    [loadAdjustmentsForTech]
  );

  const fetchHistoryWithFilters = useCallback(
    async (filters: typeof historyFilters) => {
      setHistoryLoading(true);
      setHistoryError(null);
      // Intentar obtener la información del técnico mediante relación
      // Si la relación no existe, usaremos el technicianNameMap del frontend
      let query = supabase
        .from("salary_settlements")
        .select("*")
        .order("created_at", {
        ascending: false,
      });
      if (filters.technicianId !== "all") {
        query = query.eq("technician_id", filters.technicianId);
      }
      if (filters.paymentMethod !== "all") {
        query = query.eq("payment_method", filters.paymentMethod);
      }
      if (filters.startDate && filters.startDate.trim() !== "") {
        query = query.gte("created_at", `${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate && filters.endDate.trim() !== "") {
        query = query.lte("created_at", `${filters.endDate}T23:59:59.999Z`);
      }

      // NO limitar resultados - mostrar TODAS las liquidaciones históricas
      const { data, error } = await query;

      if (error) {
        console.error("Error cargando historial de liquidaciones:", error);
        console.error("Detalles del error:", JSON.stringify(error, null, 2));
        setHistoryResults([]);
        setHistoryAggregates({ efectivo: 0, transferencia: 0, efectivo_transferencia: 0 });
        setHistoryError(`No pudimos cargar el historial: ${error.message}. Verifica la consola para más detalles.`);
      } else {
        const list = (data as SalarySettlement[]) ?? [];
        
        // Obtener todas las semanas únicas con órdenes pagadas para generar liquidaciones automáticas
        const technicianIdsToCheck = filters.technicianId !== "all" 
          ? [filters.technicianId] 
          : technicians.map(t => t.id);
        
        const autoSettlements: SalarySettlement[] = [];
        
        for (const techId of technicianIdsToCheck) {
          // Obtener todas las órdenes pagadas del técnico (sin límite de fecha a menos que se filtre)
          // Usar exactamente los mismos filtros que AdminReports para garantizar consistencia
          let ordersQuery = supabase
            .from("orders")
            .select("id, created_at, commission_amount, week_start, status, receipt_number")
            .eq("technician_id", techId)
            .eq("status", "paid")
            .not("receipt_number", "is", null);
          
          // Usar fechas UTC correctas para el filtro (igual que AdminReports)
          // Solo aplicar filtros de fecha si se proporcionaron
          if (filters.startDate && filters.startDate.trim() !== "") {
            const [startYear, startMonth, startDay] = filters.startDate.split('-').map(Number);
            const startUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
            ordersQuery = ordersQuery.gte("created_at", startUTC.toISOString());
          }
          if (filters.endDate && filters.endDate.trim() !== "") {
            const [endYear, endMonth, endDay] = filters.endDate.split('-').map(Number);
            const endUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
            ordersQuery = ordersQuery.lte("created_at", endUTC.toISOString());
          }
          
          const { data: paidOrders, error: ordersError } = await ordersQuery;
          
          if (ordersError) {
            console.error(`❌ Error obteniendo órdenes para técnico ${techId}:`, ordersError);
            continue;
          }
          
          if (paidOrders && paidOrders.length > 0) {
            // Verificar si hay filtros de fecha
            const hasDateFilters = filters.startDate && filters.endDate && filters.startDate.trim() !== "" && filters.endDate.trim() !== "";
            
            console.log(`🔍 Técnico ${techId}: Se encontraron ${paidOrders.length} órdenes pagadas${hasDateFilters ? ` en el rango ${filters.startDate} al ${filters.endDate}` : ' (todas)'}`);
            
            // Si hay filtros de fecha, calcular total del rango completo
            // Si NO hay filtros de fecha, agrupar por semana para mostrar el historial completo
            let totalRangeAmount = 0;
            let totalRangeOrders = 0;
            if (hasDateFilters) {
              // Calcular total del rango completo cuando hay filtros de fecha
              paidOrders.forEach((order: any) => {
                const commission = order.commission_amount || 0;
                if (commission > 0) {
                  totalRangeAmount += commission;
                  totalRangeOrders += 1;
                }
              });
              console.log(`💰 Total del rango: ${totalRangeOrders} órdenes = ${totalRangeAmount.toLocaleString('es-CL')} CLP`);
            }
            
            // Agrupar por semana (week_start) para mantener compatibilidad
            const weeksMap = new Map<string, { orders: any[], total: number }>();
            
            paidOrders.forEach(order => {
              // Calcular semana laboral: sábado a viernes
              // Si la orden tiene week_start en la BD, usarlo
              // Si no, calcularlo basado en la fecha de la orden
              let weekStart = order.week_start;
              if (!weekStart && order.created_at) {
                const orderDate = new Date(order.created_at);
                // Calcular el sábado que inicia esa semana laboral
                // La semana laboral es sábado (día 6) a viernes siguiente
                const dayOfWeek = orderDate.getDay(); // 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
                const saturdayDate = new Date(orderDate);
                saturdayDate.setHours(0, 0, 0, 0);
                
                if (dayOfWeek === 6) { // Sábado
                  // Ya es sábado, usar ese sábado como inicio de semana
                  weekStart = saturdayDate.toISOString().slice(0, 10);
                } else {
                  // Domingo a viernes, retroceder hasta el sábado anterior
                  // Sábado es día 6, así que si estamos en día X, retrocedemos (X+1) días para llegar al sábado
                  const daysToSubtract = dayOfWeek + 1;
                  saturdayDate.setDate(orderDate.getDate() - daysToSubtract);
                  weekStart = saturdayDate.toISOString().slice(0, 10);
                }
              }
              
              if (weekStart) {
                if (!weeksMap.has(weekStart)) {
                  weeksMap.set(weekStart, { orders: [], total: 0 });
                }
                const weekData = weeksMap.get(weekStart)!;
                weekData.orders.push(order);
                weekData.total += order.commission_amount || 0;
              }
            });
            
            // Si hay filtros de fecha y hay órdenes en el rango, SIEMPRE agregar resumen total del rango completo
            // Esto mostrará el total exacto de las órdenes del rango, no agrupado por semana
            if (hasDateFilters && totalRangeAmount > 0) {
              const rangeStartDate = filters.startDate!;
              const rangeEndDate = filters.endDate!;
              
              console.log(`📊 [${techId}] Calculando liquidación del ${rangeStartDate} al ${rangeEndDate}`);
              console.log(`   📦 Órdenes encontradas: ${paidOrders.length}`);
              console.log(`   💰 Total comisión: ${totalRangeAmount.toLocaleString('es-CL')} CLP`);
              console.log(`   📋 Órdenes con comisión: ${totalRangeOrders}`);
              
              // SIEMPRE crear la liquidación automática del rango completo cuando hay filtros de fecha
              // No verificar si existe una registrada, porque queremos mostrar el cálculo automático del rango
              const rangeSettlement: SalarySettlement = {
                id: `auto-range-${techId}-${rangeStartDate}-${rangeEndDate}`,
                technician_id: techId,
                week_start: rangeStartDate, // Usar fecha inicio como referencia
                amount: totalRangeAmount,
                note: `Calculado automáticamente de ${totalRangeOrders} órdenes pagadas del ${rangeStartDate} al ${rangeEndDate}`,
                context: "admin" as const,
                payment_method: null,
                details: {
                  auto_generated: true,
                  auto_range: true,
                  orders_count: totalRangeOrders,
                  orders_ids: paidOrders.map((o: any) => o.id),
                  range_start: rangeStartDate,
                  range_end: rangeEndDate,
                },
                created_by: null,
                created_at: paidOrders.length > 0 
                  ? paidOrders[paidOrders.length - 1]?.created_at || new Date().toISOString()
                  : new Date().toISOString(),
              };
              
              console.log(`✅ [${techId}] Creando liquidación automática del rango completo:`, rangeSettlement);
              autoSettlements.push(rangeSettlement);
            } else if (hasDateFilters && totalRangeAmount === 0) {
              console.log(`⚠️ [${techId}] No hay órdenes pagadas en el rango ${filters.startDate} al ${filters.endDate}`);
            }
            
            // Para cada semana con órdenes pagadas, verificar si ya existe una liquidación registrada
            for (const [weekStart, weekData] of weeksMap.entries()) {
              const existingSettlement = list.find(
                s => s.technician_id === techId && s.week_start === weekStart
              );
              
              // Si NO existe liquidación registrada pero hay órdenes pagadas, crear una automática
              // Solo si no hay filtros de fecha o si la semana está dentro del rango
              if (!existingSettlement && weekData.total > 0) {
                // Si hay filtros de fecha, verificar que la semana esté dentro del rango
                if (hasDateFilters) {
                  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
                  const filterStartDate = new Date(`${filters.startDate}T00:00:00.000Z`);
                  const filterEndDate = new Date(`${filters.endDate}T23:59:59.999Z`);
                  
                  // Solo incluir si la semana está dentro o se solapa con el rango
                  if (weekStartDate < filterStartDate || weekStartDate > filterEndDate) {
                    continue; // Saltar esta semana si está fuera del rango
                  }
                }
                
                autoSettlements.push({
                  id: `auto-${techId}-${weekStart}`, // ID temporal
                  technician_id: techId,
                  week_start: weekStart,
                  amount: weekData.total,
                  note: `Calculado automáticamente de ${weekData.orders.length} órdenes pagadas`,
                  context: "admin" as const,
                  payment_method: null,
                  details: {
                    auto_generated: true,
                    orders_count: weekData.orders.length,
                    orders_ids: weekData.orders.map(o => o.id),
                  },
                  created_by: null,
                  created_at: weekData.orders[weekData.orders.length - 1]?.created_at || new Date().toISOString(),
                });
              }
            }
          }
        }
        
            // Si hay filtros de fecha, priorizar mostrar el resumen total del rango completo
            // Si NO hay filtros de fecha, mostrar todas las liquidaciones agrupadas por semana
            const hasDateFilters = filters.startDate && filters.endDate && filters.startDate.trim() !== "" && filters.endDate.trim() !== "";
            
            // Separar liquidaciones de rango completo de las agrupadas por semana
            const rangeSettlements = autoSettlements.filter(s => (s.details as any)?.auto_range);
            const weekSettlements = autoSettlements.filter(s => !(s.details as any)?.auto_range);
            
            console.log(`🔍 Separando liquidaciones automáticas:`);
            console.log(`   - Rango completo: ${rangeSettlements.length}`);
            console.log(`   - Por semana: ${weekSettlements.length}`);
            console.log(`   - Total automáticas: ${autoSettlements.length}`);
            console.log(`   - Filtros de fecha activos: ${hasDateFilters ? 'Sí' : 'No'}`);
            
            // Si hay filtros de fecha, mostrar solo liquidaciones de rango completo + las registradas
            // Si NO hay filtros de fecha, mostrar TODO (registradas + automáticas por semana) para ver el historial completo
            let finalAutoSettlements = hasDateFilters ? rangeSettlements : autoSettlements;
        
        console.log(`📋 Liquidaciones automáticas finales a mostrar: ${finalAutoSettlements.length}`);
        if (finalAutoSettlements.length > 0) {
          finalAutoSettlements.forEach((s, idx) => {
            console.log(`   ${idx + 1}. ${technicianNameMap[s.technician_id] || s.technician_id}: ${s.amount} CLP`);
            if ((s.details as any)?.auto_range) {
              console.log(`      Rango: ${(s.details as any).range_start} al ${(s.details as any).range_end}`);
            }
          });
        }
        
        // Combinar liquidaciones registradas con las automáticas
        // Si hay filtros de fecha, también filtrar las registradas por el rango
        let filteredList = list;
        if (hasDateFilters) {
          const filterStartDate = new Date(`${filters.startDate}T00:00:00.000Z`);
          const filterEndDate = new Date(`${filters.endDate}T23:59:59.999Z`);
          
          filteredList = list.filter(settlement => {
            if (!settlement.created_at) return false;
            const createdDate = new Date(settlement.created_at);
            return createdDate >= filterStartDate && createdDate <= filterEndDate;
          });
          
          console.log(`📝 Liquidaciones registradas filtradas: ${filteredList.length} de ${list.length}`);
        }
        
        const combinedList = [...filteredList, ...finalAutoSettlements].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Más recientes primero
        });
        
        console.log(`✅ Total liquidaciones combinadas a mostrar: ${combinedList.length}`);
        
        console.log("=== FILTROS APLICADOS ===");
        console.log("Técnico:", filters.technicianId);
        console.log("Desde:", filters.startDate);
        console.log("Hasta:", filters.endDate);
        console.log("=== RESULTADOS ===");
        console.log("Liquidaciones registradas (total):", list.length);
        console.log("Liquidaciones registradas (filtradas):", filteredList.length);
        console.log("Liquidaciones automáticas (rango completo):", rangeSettlements.length);
        console.log("Liquidaciones automáticas (por semana):", weekSettlements.length);
        console.log("Liquidaciones automáticas (finales):", finalAutoSettlements.length);
        console.log("Total liquidaciones a mostrar:", combinedList.length);
        console.log("=== DETALLE LIQUIDACIONES ===");
        combinedList.forEach((entry, idx) => {
          console.log(`${idx + 1}. Técnico: ${technicianNameMap[entry.technician_id] || entry.technician_id}`);
          console.log(`   Monto: ${entry.amount}`);
          console.log(`   Nota: ${entry.note || "Sin nota"}`);
          console.log(`   Tipo: ${(entry.details as any)?.auto_generated ? "Auto-generada" : "Registrada"}`);
          if ((entry.details as any)?.auto_range) {
            console.log(`   Rango: ${(entry.details as any).range_start} a ${(entry.details as any).range_end}`);
          }
        });
        
        // Verificar si hay liquidaciones sin nombre de técnico
        const liquidacionesSinNombre = combinedList.filter(entry => !technicianNameMap[entry.technician_id]);
        if (liquidacionesSinNombre.length > 0) {
          console.warn("⚠️ Liquidaciones sin nombre de técnico encontradas:", liquidacionesSinNombre);
          console.warn("IDs de técnicos no encontrados:", liquidacionesSinNombre.map(e => e.technician_id));
        }
        
        setHistoryResults(combinedList);
        const aggregates = combinedList.reduce(
          (acc, entry) => {
            if (entry.payment_method === "transferencia") {
              acc.transferencia += entry.amount ?? 0;
            } else if (entry.payment_method === "efectivo") {
              acc.efectivo += entry.amount ?? 0;
            } else if (entry.payment_method === "efectivo/transferencia") {
              acc.efectivo_transferencia += entry.amount ?? 0;
              // También agregar a efectivo y transferencia si hay breakdown
              const breakdown = (entry.details as any)?.payment_breakdown;
              if (breakdown) {
                acc.efectivo += breakdown.efectivo ?? 0;
                acc.transferencia += breakdown.transferencia ?? 0;
              }
            }
            return acc;
          },
          { efectivo: 0, transferencia: 0, efectivo_transferencia: 0 }
        );
        setHistoryAggregates(aggregates);
      }
      setHistoryLoading(false);
    },
    [technicianNameMap]
  );

  const handleManualHistorySearch = useCallback(() => {
    setHistoryPanelOpen(true);
    void fetchHistoryWithFilters(historyFilters);
  }, [historyFilters, fetchHistoryWithFilters]);

  const handleResetHistoryFilters = useCallback(() => {
    // Limpiar filtros para mostrar todas las liquidaciones
    const next = {
      technicianId: "all",
      paymentMethod: "all" as const,
      startDate: "",
      endDate: "",
    };
    setHistoryFilters(next);
    setHistoryPanelOpen(true);
    void fetchHistoryWithFilters(next);
  }, [fetchHistoryWithFilters]);

  const handleOpenHistoryForTech = useCallback(
    (techId: string) => {
      const next = { ...historyFilters, technicianId: techId };
      setHistoryFilters(next);
      setHistoryPanelOpen(true);
      void fetchHistoryWithFilters(next);
    },
    [historyFilters, fetchHistoryWithFilters]
  );

  const toggleHistoryPanel = useCallback(() => {
    setHistoryPanelOpen((prev) => {
      const next = !prev;
      if (next) {
        // Siempre buscar todas las liquidaciones cuando se abre el panel (sin filtros de fecha)
        const filtersToUse = { 
          technicianId: "all", 
          paymentMethod: "all" as const, 
          startDate: "", 
          endDate: "" 
        };
        setHistoryFilters(filtersToUse);
        void fetchHistoryWithFilters(filtersToUse);
      }
      return next;
    });
  }, [fetchHistoryWithFilters]);

  // Escuchar eventos de creación de liquidaciones para actualizar el historial
  // Este useEffect debe estar después de la definición de fetchHistoryWithFilters
  useEffect(() => {
    const handleSettlementCreated = () => {
      console.log("Nueva liquidación creada, actualizando historial...");
      // Si el panel de historial está abierto, actualizar los resultados
      if (historyPanelOpen) {
        void fetchHistoryWithFilters(historyFilters);
      }
      // También recargar los datos semanales
      void loadWeeklyData();
    };

    window.addEventListener('settlementCreated', handleSettlementCreated);

    return () => {
      window.removeEventListener('settlementCreated', handleSettlementCreated);
    };
  }, [historyPanelOpen, historyFilters, fetchHistoryWithFilters, loadWeeklyData]);

  useEffect(() => {
    if (selectedTech) {
      void loadAdjustmentsForTech(selectedTech);
    }
  }, [selectedTech, loadAdjustmentsForTech]);

  const handleDeleteAdjustment = useCallback(
    async (techId: string, adjustmentId: string) => {
      const techAdjustments = adjustmentsByTech[techId] ?? [];
      const target = techAdjustments.find((adj) => adj.id === adjustmentId);
      if (!target) return;

      const confirmed = window.confirm("¿Eliminar este ajuste de sueldo?");
      if (!confirmed) return;

      setActionErrorsByTech((prev) => ({ ...prev, [techId]: null }));
      setDeletingAdjustmentId(adjustmentId);
      const { error } = await supabase
        .from("salary_adjustments")
        .delete()
        .eq("id", adjustmentId)
        .eq("technician_id", techId);
      setDeletingAdjustmentId(null);

      if (error) {
        console.error("Error eliminando ajuste:", error);
        setActionErrorsByTech((prev) => ({
          ...prev,
          [techId]: "No pudimos eliminar el ajuste. Intenta nuevamente.",
        }));
        return;
      }

      setAdjustmentsByTech((prev) => ({
        ...prev,
        [techId]: techAdjustments.filter((adj) => adj.id !== adjustmentId),
      }));
      setWeeklyAdjustmentTotals((prev) => {
        const next = { ...prev };
        next[techId] = Math.max((next[techId] ?? 0) - (target.amount ?? 0), 0);
        return next;
      });
      void loadWeeklyData();
    },
    [adjustmentsByTech, loadWeeklyData]
  );

  const handleSettleAdjustments = useCallback(
    async (techId: string) => {
      const techAdjustments = adjustmentsByTech[techId] ?? [];
      if (techAdjustments.length === 0) return;

      const confirmed = window.confirm("¿Seguro que quieres saldar todos los ajustes de esta semana?");
      if (!confirmed) return;

      setActionErrorsByTech((prev) => ({ ...prev, [techId]: null }));
      setSettlingAdjustmentsByTech((prev) => ({ ...prev, [techId]: true }));
      const { start, end } = currentWeekRange();

      const { error } = await supabase
        .from("salary_adjustments")
        .delete()
        .eq("technician_id", techId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      setSettlingAdjustmentsByTech((prev) => ({ ...prev, [techId]: false }));

      if (error) {
        console.error("Error al saldar ajustes:", error);
        setActionErrorsByTech((prev) => ({
          ...prev,
          [techId]: "No pudimos saldar los ajustes. Intenta nuevamente.",
        }));
        return;
      }

      setAdjustmentsByTech((prev) => ({ ...prev, [techId]: [] }));
      setWeeklyAdjustmentTotals((prev) => ({ ...prev, [techId]: 0 }));
      void loadWeeklyData();
    },
    [adjustmentsByTech, loadWeeklyData]
  );

  const handleDeleteReturn = useCallback(
    async (techId: string, orderId: string) => {
      const techReturns = returnsByTech[techId] ?? [];
      const target = techReturns.find((order) => order.id === orderId);
      if (!target) return;

      const confirmed = window.confirm("¿Eliminar esta devolución/cancelación del historial?");
      if (!confirmed) return;

      setActionErrorsByTech((prev) => ({ ...prev, [techId]: null }));
      setDeletingReturnId(orderId);
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .eq("technician_id", techId)
        .in("status", ["returned", "cancelled"]);
      setDeletingReturnId(null);

      if (error) {
        console.error("Error eliminando devolución:", error);
        setActionErrorsByTech((prev) => ({
          ...prev,
          [techId]: "No pudimos eliminar la devolución. Intenta nuevamente.",
        }));
        return;
      }

      setReturnsByTech((prev) => ({
        ...prev,
        [techId]: techReturns.filter((order) => order.id !== orderId),
      }));
      setWeeklyReturnsTotals((prev) => {
        const next = { ...prev };
        next[techId] = Math.max((next[techId] ?? 0) - (target.commission_amount ?? 0), 0);
        return next;
      });
      void loadWeeklyData();
    },
    [returnsByTech, loadWeeklyData]
  );

  const handleSettleReturns = useCallback(
    async (techId: string) => {
      const techReturns = returnsByTech[techId] ?? [];
      if (techReturns.length === 0) return;

      const confirmed = window.confirm(
        "¿Seguro que quieres eliminar todas las devoluciones/cancelaciones de esta semana?"
      );
      if (!confirmed) return;

      setActionErrorsByTech((prev) => ({ ...prev, [techId]: null }));
      setSettlingReturnsByTech((prev) => ({ ...prev, [techId]: true }));
      const { start, end } = currentWeekRange();

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("technician_id", techId)
        .in("status", ["returned", "cancelled"])
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      setSettlingReturnsByTech((prev) => ({ ...prev, [techId]: false }));

      if (error) {
        console.error("Error al eliminar devoluciones:", error);
        setActionErrorsByTech((prev) => ({
          ...prev,
          [techId]: "No pudimos eliminar las devoluciones. Intenta nuevamente.",
        }));
        return;
      }

      setReturnsByTech((prev) => ({ ...prev, [techId]: [] }));
      setWeeklyReturnsTotals((prev) => ({ ...prev, [techId]: 0 }));
      void loadWeeklyData();
    },
    [returnsByTech, loadWeeklyData]
  );

  return (
    <div className="p-6 bg-white">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Historial y filtros de liquidaciones</p>
            <p className="text-xs text-slate-500">Busca pagos anteriores por técnico, medio de pago o rango de fechas.</p>
          </div>
          <button
            type="button"
            onClick={toggleHistoryPanel}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-white"
          >
            {historyPanelOpen ? "Ocultar historial" : "Mostrar historial"}
          </button>
        </div>

        {historyPanelOpen && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Técnico</label>
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={historyFilters.technicianId}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, technicianId: e.target.value }))
                  }
                >
                  <option value="all">Todos</option>
                  {technicianOptions.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Medio de pago</label>
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={historyFilters.paymentMethod}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value as "all" | "efectivo" | "transferencia" | "efectivo/transferencia",
                    }))
                  }
                >
                  <option value="all">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo/transferencia">Efectivo/Transferencia</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Desde</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={historyFilters.startDate}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Hasta</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={historyFilters.endDate}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleManualHistorySearch}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-brand-light text-white hover:bg-brand/90"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleResetHistoryFilters}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 text-slate-600 hover:bg-white"
              >
                Limpiar
              </button>
            </div>
            <div className="text-xs text-slate-500">
              <span className="mr-4">
                Efectivo:{" "}
                <span className="font-semibold text-emerald-600">{formatCLP(historyAggregates.efectivo)}</span>
              </span>
              <span className="mr-4">
                Transferencia:{" "}
                <span className="font-semibold text-sky-600">
                  {formatCLP(historyAggregates.transferencia)}
                </span>
              </span>
              <span>
                Mixto (Ef./Trans.):{" "}
                <span className="font-semibold text-purple-600">{formatCLP(historyAggregates.efectivo_transferencia)}</span>
              </span>
            </div>
            {historyError && <p className="text-xs text-red-600">{historyError}</p>}
            {historyLoading ? (
              <p className="text-sm text-slate-500">Cargando liquidaciones...</p>
            ) : historyResults.length === 0 ? (
              <div className="space-y-2">
              <p className="text-sm text-slate-500">No hay liquidaciones para los filtros seleccionados.</p>
                <p className="text-xs text-slate-400">Intenta limpiar los filtros de fecha para ver todas las liquidaciones históricas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {historyResults.map((entry) => {
                  const paymentMethodLabel =
                    entry.payment_method === "transferencia"
                      ? "Transferencia"
                      : entry.payment_method === "efectivo"
                      ? "Efectivo"
                      : entry.payment_method === "efectivo/transferencia"
                      ? "Efectivo/Transferencia"
                      : "Sin dato";
                  // Si es pago mixto, mostrar los montos por separado
                  const paymentBreakdown = (entry.details as any)?.payment_breakdown;
                  const isMixedPayment = entry.payment_method === "efectivo/transferencia" && paymentBreakdown;
                  
                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-slate-200 rounded-md p-3 text-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {technicianNameMap[entry.technician_id] || `Técnico (${entry.technician_id.slice(0, 8)}...)`}
                            {(entry.details as any)?.auto_generated && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">(Auto-generada)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(entry.details as any)?.auto_range ? (
                              <>
                                Rango: {formatDate((entry.details as any).range_start)} al {formatDate((entry.details as any).range_end)}
                                {entry.created_at && <> • {formatDate(entry.created_at)}</>}
                              </>
                            ) : (
                              <>
                            Semana {formatDate(entry.week_start)} • Medio: {paymentMethodLabel}
                                {entry.created_at && (
                                  <> • {formatDate(entry.created_at)}</>
                                )}
                              </>
                            )}
                            {(entry.details as any)?.auto_generated && entry.note && (
                              <><br/><span className="text-blue-600">{entry.note}</span></>
                            )}
                            {isMixedPayment && (
                              <>
                                <br/>
                                <span className="text-xs text-emerald-600">
                                  Efectivo: {formatCLP(paymentBreakdown.efectivo || 0)}
                                </span>
                                {" • "}
                                <span className="text-xs text-sky-600">
                                  Transferencia: {formatCLP(paymentBreakdown.transferencia || 0)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="font-semibold text-brand">{formatCLP(entry.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {technicians.map((tech) => {
          const weeklyTotal = weeklyTotals[tech.id] ?? 0;
          const adjustmentTotal = weeklyAdjustmentTotals[tech.id] ?? 0;
          const returnsTotal = weeklyReturnsTotals[tech.id] ?? 0;
          const settlementTotal = weeklySettlementTotals[tech.id] ?? 0;
          const netBeforeSettlement = Math.max(weeklyTotal - adjustmentTotal - returnsTotal, 0);
          const netTotal = Math.max(netBeforeSettlement - settlementTotal, 0);
          const pendingDebt = Math.max(settlementTotal - netBeforeSettlement, 0);
          const baseAmountForSettlement = Math.max(weeklyTotal - returnsTotal, 0);
          const isSelected = selectedTech === tech.id;
          const isSettlementOpen = openSettlementPanels[tech.id] ?? false;
          const cardAdjustments = adjustmentsByTech[tech.id] ?? [];
          const cardReturns = returnsByTech[tech.id] ?? [];
          const cardLoading = loadingDetailsByTech[tech.id] ?? false;
          const cardActionError = actionErrorsByTech[tech.id];
          const isSettlingAdj = settlingAdjustmentsByTech[tech.id] ?? false;
          const isSettlingRet = settlingReturnsByTech[tech.id] ?? false;

          return (
            <div
              key={tech.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                isSelected
                  ? "border-brand bg-brand/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => {
                const nextSelected = isSelected ? null : tech.id;
                setSelectedTech(nextSelected);
                void loadWeeklyData();
                void loadAdjustmentsForTech(tech.id, true);
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">{tech.name}</div>
                  <div className="text-sm text-slate-600">
                    Total semanal (con recibo): {formatCLP(weeklyTotal)}
                    {returnsTotal > 0 && (
                      <span className="ml-2 text-xs text-red-600">
                        (Devoluciones: -{formatCLP(returnsTotal)})
                      </span>
                    )}
                    <span className="ml-2 text-xs text-slate-500">(Neto estimado: {formatCLP(netTotal, { withLabel: true })})</span>
                  </div>
                </div>
                <div className="text-2xl">{isSelected ? "▼" : "▶"}</div>
              </div>

              {isSelected && (
                <div
                  className="mt-4 pt-4 border-t border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="font-medium text-slate-700 mb-2">
                    Pagos y Descuentos
                  </h4>
                  <div className="flex flex-col gap-2 text-sm text-slate-600 mb-3">
                    <div className="flex items-center justify-between">
                      <span>
                        Total ajustes: {formatCLP(adjustmentTotal)}
                      </span>
                    </div>
                    {returnsTotal > 0 && (
                      <div className="flex items-center justify-between text-red-600">
                        <span>Total devoluciones/cancelaciones: -{formatCLP(returnsTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Saldo estimado: {formatCLP(netTotal)}</span>
                    </div>
                    {pendingDebt > 0 && (
                      <div className="flex items-center justify-between text-amber-600">
                        <span>Pendiente próxima semana (el técnico debe): {formatCLP(pendingDebt)}</span>
                      </div>
                    )}
                    {settlementTotal > 0 && (
                      <div className="flex items-center justify-between text-sky-600">
                        <span>Liquidado: {formatCLP(settlementTotal)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSettlementPanel(tech.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold border border-brand-light text-brand rounded-md hover:bg-brand/5 transition"
                    >
                      {isSettlementOpen ? "Ocultar ajustes de sueldo" : "Ajustes de sueldo"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenHistoryForTech(tech.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-600 rounded-md hover:bg-slate-100 transition"
                    >
                      Historial de liquidaciones
                    </button>
                    {cardActionError && (
                      <p className="text-xs text-red-600">{cardActionError}</p>
                    )}
                  </div>
                  {isSettlementOpen && (
                    <div className="mb-4">
                      <SalarySettlementPanel
                        technicianId={tech.id}
                        technicianName={tech.name}
                        baseAmount={weeklyTotal}
                        adjustmentTotal={adjustmentTotal}
                        context="admin"
                        onAfterSettlement={() => {
                          void loadWeeklyData();
                          void loadAdjustmentsForTech(tech.id, true);
                          if (historyPanelOpen) {
                            void fetchHistoryWithFilters(historyFilters);
                          }
                        }}
                      />
                    </div>
                  )}
                  {(cardAdjustments.length > 0 || cardReturns.length > 0) && (
                    <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
                      {cardReturns.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSettleReturns(tech.id);
                          }}
                          disabled={isSettlingRet}
                          className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSettlingRet ? "Eliminando devoluciones..." : "Eliminar devoluciones"}
                        </button>
                      )}
                      {cardAdjustments.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSettleAdjustments(tech.id);
                          }}
                          disabled={isSettlingAdj}
                          className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSettlingAdj ? "Saldando ajustes..." : "Saldar ajustes"}
                        </button>
                      )}
                    </div>
                  )}
                  {cardLoading ? (
                    <p className="text-sm text-slate-500">Actualizando historial...</p>
                  ) : cardAdjustments.length === 0 && cardReturns.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay ajustes ni devoluciones registradas esta semana.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cardReturns.map((order) => {
                        // Usar returned_at o cancelled_at si existe, sino usar created_at como fallback
                        const statusDate = order.status === "returned" 
                          ? (order.returned_at || order.created_at)
                          : (order.cancelled_at || order.created_at);
                        const dateTime = new Date(statusDate).toLocaleString("es-CL", {
                          dateStyle: "short",
                          timeStyle: "short",
                        });
                        return (
                          <div
                            key={order.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm p-3 bg-red-50/30 border border-red-200 rounded-md gap-2"
                          >
                            <div>
                              <div>
                                <span className="font-medium text-red-600">
                                  {order.status === "returned" ? "Devolución" : "Cancelación"}
                                </span>
                                <span className="text-slate-600 ml-2">
                                  - Orden #{order.order_number} • {order.device}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {dateTime}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-red-600">
                                -{formatCLP(order.commission_amount ?? 0)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteReturn(tech.id, order.id);
                                }}
                                disabled={deletingReturnId === order.id || isSettlingRet}
                                className="text-xs text-red-600 hover:text-red-500 disabled:opacity-60"
                              >
                                {deletingReturnId === order.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {cardAdjustments.map((adj) => (
                        <div
                          key={adj.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm p-3 bg-slate-50 border border-slate-200 rounded-md gap-2"
                        >
                          <div>
                          <div>
                            <span
                              className={`font-medium ${
                                adj.type === "advance"
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }`}
                            >
                              {adj.type === "advance" ? "Adelanto" : "Descuento"}
                            </span>
                            {adj.note && (
                              <span className="text-slate-600 ml-2">
                                - {adj.note}
                              </span>
                            )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {formatDate(adj.created_at)} •{" "}
                              {new Date(adj.created_at).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatCLP(adj.amount)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteAdjustment(tech.id, adj.id);
                              }}
                              disabled={deletingAdjustmentId === adj.id || isSettlingAdj}
                              className="text-xs text-red-600 hover:text-red-500 disabled:opacity-60"
                            >
                              {deletingAdjustmentId === adj.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

