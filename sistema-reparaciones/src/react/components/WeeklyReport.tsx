import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currentWeekRange, formatDate, dateToUTCStart, dateToUTCEnd } from "@/lib/date";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import { calcCommission } from "@/lib/commission";
import { getCurrentPayoutWeek } from "@/lib/payoutWeek";
import type { PaymentMethod } from "@/lib/commission";
import type { SalaryAdjustment, Order } from "@/types";
import SalarySettlementPanel from "./SalarySettlementPanel";

interface WeeklyReportProps {
  technicianId: string;
  refreshKey?: number;
  userRole?: string; // Opcional: rol del usuario para restringir funcionalidades
}

export default function WeeklyReport({ technicianId, refreshKey = 0, userRole }: WeeklyReportProps) {
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [returnsDiscount, setReturnsDiscount] = useState(0);
  const [returnedOrders, setReturnedOrders] = useState<Order[]>([]);
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [adjustmentFormOpen, setAdjustmentFormOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<SalaryAdjustment["type"]>("advance");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | "">("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const formattedAdjustmentAmount =
    adjustmentAmount === "" ? "" : formatCLPInput(Number(adjustmentAmount));

  const handleAdjustmentAmountChange = (raw: string) => {
    if (raw.trim() === "") {
      setAdjustmentAmount("");
      return;
    }
    const parsed = parseCLPInput(raw);
    setAdjustmentAmount(parsed);
  };
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<string | null>(null);
  const [settlingReturns, setSettlingReturns] = useState(false);
  const [deletingReturnId, setDeletingReturnId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlementPanelOpen, setSettlementPanelOpen] = useState(true);
  const [settledAmount, setSettledAmount] = useState(0);

  const loadData = useCallback(async () => {
      setLoading(true);
    setLoadingAdjustments(true);
    try {
      const { start, end } = currentWeekRange();
      const weekStartISO = start.toISOString().slice(0, 10);
      
      // Convertir fechas a UTC para evitar problemas de zona horaria
      const startUTC = dateToUTCStart(start);
      const endUTC = dateToUTCEnd(end);
      
      // ⚠️ CAMBIO CRÍTICO: Usar payout_week y payout_year en lugar de created_at
      // Las órdenes se asignan a una semana según cuando fueron pagadas, no cuando fueron creadas
      const currentPayout = getCurrentPayoutWeek();

      // Consultar si hay liquidaciones registradas para esta semana
      const { data: settlementsData } = await supabase
        .from("salary_settlements")
        .select("created_at")
        .eq("technician_id", technicianId)
        .eq("week_start", weekStartISO)
        .order("created_at", { ascending: false });

      // Fecha de la última liquidación de la semana (si existe)
      const lastSettlementDate = settlementsData && settlementsData.length > 0
        ? new Date(settlementsData[0].created_at)
        : null;

      // Consulta para órdenes de la semana
      // ⚠️ CAMBIO: Simplificar la consulta para mostrar TODAS las órdenes relevantes
      // Hacer consultas separadas para cada tipo de orden para evitar problemas con .or()
      
      let allOrders: any[] = [];
      
      // 1. Órdenes pagadas: 
      //    - Si hay liquidación: solo las pagadas DESPUÉS de la liquidación
      //    - Si NO hay liquidación: todas las pagadas de la semana actual
      // Hacer múltiples consultas para cubrir todos los casos
      let paidOrdersList: any[] = [];
      
      if (lastSettlementDate) {
        // Si hay liquidación, solo mostrar órdenes pagadas DESPUÉS de la liquidación
        const { data: paidAfterSettlement, error: paidError1 } = await supabase
          .from("orders")
          .select("*")
          .eq("technician_id", technicianId)
          .eq("status", "paid")
          .gte("paid_at", lastSettlementDate.toISOString());
        
        if (paidError1) {
          console.error("❌ Error cargando órdenes pagadas (después de liquidación):", paidError1);
        } else if (paidAfterSettlement) {
          paidOrdersList = [...paidOrdersList, ...paidAfterSettlement];
        }
      } else {
        // Si NO hay liquidación, buscar órdenes pagadas de la semana actual de múltiples formas:
        
        // a) Por paid_at dentro del rango de la semana
        const { data: paidByPaidAt, error: paidError2 } = await supabase
          .from("orders")
          .select("*")
          .eq("technician_id", technicianId)
          .eq("status", "paid")
          .gte("paid_at", startUTC.toISOString())
          .lte("paid_at", endUTC.toISOString());
        
        if (paidError2) {
          console.error("❌ Error cargando órdenes pagadas (por paid_at):", paidError2);
        } else if (paidByPaidAt) {
          paidOrdersList = [...paidOrdersList, ...paidByPaidAt];
        }
        
        // b) Por payout_week/payout_year (para órdenes que ya tienen estos campos)
        const { data: paidByPayoutWeek, error: paidError3 } = await supabase
          .from("orders")
          .select("*")
          .eq("technician_id", technicianId)
          .eq("status", "paid")
          .eq("payout_week", currentPayout.week)
          .eq("payout_year", currentPayout.year);
        
        if (paidError3) {
          console.error("❌ Error cargando órdenes pagadas (por payout_week):", paidError3);
        } else if (paidByPayoutWeek) {
          // Evitar duplicados
          const existingIds = new Set(paidOrdersList.map(o => o.id));
          const newPaidOrders = paidByPayoutWeek.filter(o => !existingIds.has(o.id));
          paidOrdersList = [...paidOrdersList, ...newPaidOrders];
        }
        
        // c) Por created_at dentro del rango si no tienen paid_at (fallback para órdenes antiguas)
        const { data: paidByCreatedAt, error: paidError4 } = await supabase
          .from("orders")
          .select("*")
          .eq("technician_id", technicianId)
          .eq("status", "paid")
          .is("paid_at", null)
          .gte("created_at", startUTC.toISOString())
          .lte("created_at", endUTC.toISOString());
        
        if (paidError4) {
          console.error("❌ Error cargando órdenes pagadas (por created_at fallback):", paidError4);
        } else if (paidByCreatedAt) {
          // Evitar duplicados
          const existingIds = new Set(paidOrdersList.map(o => o.id));
          const newPaidOrders = paidByCreatedAt.filter(o => !existingIds.has(o.id));
          paidOrdersList = [...paidOrdersList, ...newPaidOrders];
        }
      }
      
      console.log("✅ Órdenes pagadas encontradas:", paidOrdersList.length);
      allOrders = [...allOrders, ...paidOrdersList];
      
      // 2. Órdenes pendientes (TODAS, sin filtro de fecha para que se vean las nuevas)
      let pendingQuery = supabase
        .from("orders")
        .select("*")
        .eq("technician_id", technicianId)
        .eq("status", "pending");
      
      if (lastSettlementDate) {
        pendingQuery = pendingQuery.gte("created_at", lastSettlementDate.toISOString());
      }
      
      const { data: pendingOrders, error: pendingError } = await pendingQuery;
      if (pendingError) {
        console.error("❌ Error cargando órdenes pendientes:", pendingError);
      }
      if (pendingOrders) {
        console.log("✅ Órdenes pendientes encontradas:", pendingOrders.length);
        allOrders = [...allOrders, ...pendingOrders];
      }
      
      // 3. Órdenes devueltas/canceladas de la semana actual
      let returnedQuery = supabase
        .from("orders")
        .select("*")
        .eq("technician_id", technicianId)
        .in("status", ["returned", "cancelled"])
        .gte("created_at", startUTC.toISOString())
        .lte("created_at", endUTC.toISOString());
      
      if (lastSettlementDate) {
        returnedQuery = returnedQuery.gte("created_at", lastSettlementDate.toISOString());
      }
      
      const { data: returnedOrders, error: returnedError } = await returnedQuery;
      if (returnedError) {
        console.error("❌ Error cargando órdenes devueltas:", returnedError);
      }
      if (returnedOrders) {
        console.log("✅ Órdenes devueltas encontradas:", returnedOrders.length);
        allOrders = [...allOrders, ...returnedOrders];
      }
      
      // Usar las órdenes combinadas y ordenarlas por fecha
      const orders = allOrders.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Más recientes primero
      });

      // Consulta para ajustes
      // Mostrar TODOS los ajustes no liquidadas para que se vean todos los ajustes nuevos
      // Si hay liquidación, solo contar ajustes creados DESPUÉS de la liquidación
      let adjustmentsQuery = supabase
        .from("salary_adjustments")
        .select("*")
        .eq("technician_id", technicianId);
      
      // Si hay liquidación, solo mostrar ajustes creados DESPUÉS de la liquidación
      // Si NO hay liquidación, mostrar TODOS los ajustes (sin filtro de fecha)
      if (lastSettlementDate) {
        adjustmentsQuery = adjustmentsQuery.gte("created_at", lastSettlementDate.toISOString());
      }
      // Si no hay liquidación, no aplicar filtro de fecha para mostrar todos los ajustes

      // Consulta para liquidaciones (solo montos)
      const { data: settlementsAmounts } = await supabase
        .from("salary_settlements")
        .select("amount")
        .eq("technician_id", technicianId)
        .eq("week_start", weekStartISO);

      // Consulta para ajustes (ya está definida arriba)
      const { data: adjustmentData, error: adjustmentsError } = await adjustmentsQuery.order("created_at", { ascending: false });

      // Log para depuración
      if (adjustmentsError) {
        console.error("❌ Error cargando ajustes en WeeklyReport:", adjustmentsError);
      }
      
      console.log("📊 WeeklyReport - Datos cargados:", {
        ordersCount: orders?.length || 0,
        paidOrdersCount: paidOrdersList?.length || 0,
        pendingOrdersCount: pendingOrders?.length || 0,
        returnedOrdersCount: returnedOrders?.length || 0,
        adjustmentsCount: adjustmentData?.length || 0,
        hasSettlement: !!lastSettlementDate,
        technicianId: technicianId,
        currentPayout: { week: currentPayout.week, year: currentPayout.year },
        weekRange: { start: startUTC.toISOString(), end: endUTC.toISOString() }
      });

      if (orders) {
        // Excluir órdenes devueltas y canceladas de los cálculos
        const earned = orders
          .filter((o) => o.status === "paid")
          .reduce((s, o) => s + (o.commission_amount ?? 0), 0);
        // Pendientes: recalcular comisión basándose en el medio de pago actual
        // (puede que hayan agregado el medio de pago después de crear la orden)
        const pending = orders
          .filter((o) => o.status === "pending")
          .reduce((s, o) => {
            // Si la orden tiene medio de pago, recalcular la comisión
            // Si no tiene medio de pago, usar la comisión almacenada (probablemente 0)
            const paymentMethod = (o.payment_method as PaymentMethod) || "";
            if (paymentMethod) {
              const recalculatedCommission = calcCommission({
                paymentMethod,
                costoRepuesto: o.replacement_cost ?? 0,
                precioTotal: o.repair_cost ?? 0,
              });
              return s + recalculatedCommission;
            }
            // Si no hay medio de pago, usar la comisión almacenada
            return s + (o.commission_amount ?? 0);
          }, 0);

        // Calcular descuento por devoluciones y cancelaciones
        // Solo contar órdenes que estaban pagadas antes de ser devueltas/canceladas
        const returned = orders.filter((o) => o.status === "returned" || o.status === "cancelled");
        const returnsDiscount = returned.reduce((s, o) => s + (o.commission_amount ?? 0), 0);

        // Última orden pagada: usar paid_at si existe, sino created_at (retrocompatibilidad)
        const lastPaid = orders
          .filter((o) => o.status === "paid" && o.receipt_number)
          .sort((a, b) => {
            const dateA = a.paid_at ? new Date(a.paid_at) : new Date(a.created_at);
            const dateB = b.paid_at ? new Date(b.paid_at) : new Date(b.created_at);
            return dateB.getTime() - dateA.getTime();
          })[0];

        setTotalEarned(earned);
        setTotalPending(pending);
        setLastPayment(lastPaid ? formatDate(lastPaid.paid_at || lastPaid.created_at) : null);
        // Guardar el descuento por devoluciones en el estado
        setReturnsDiscount(returnsDiscount);
        setReturnedOrders(returned);
      }

      setAdjustments(((adjustmentData as SalaryAdjustment[]) ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setSettledAmount(
        (settlementsAmounts as { amount: number }[])?.reduce((sum, s) => sum + (s.amount ?? 0), 0) ?? 0
      );
    } finally {
      setLoading(false);
      setLoadingAdjustments(false);
    }
  }, [technicianId]);

  useEffect(() => {
    void loadData();
    
    // Escuchar eventos de liquidación y actualización de órdenes para refrescar el reporte
    const handleSettlementCreated = () => {
      void loadData();
    };
    
    const handleOrderUpdated = () => {
      void loadData();
    };
    
    window.addEventListener('settlementCreated', handleSettlementCreated);
    window.addEventListener('orderUpdated', handleOrderUpdated);
    return () => {
      window.removeEventListener('settlementCreated', handleSettlementCreated);
      window.removeEventListener('orderUpdated', handleOrderUpdated);
    };
  }, [loadData, refreshKey]);

  const totalAdjustments = useMemo(
    () => adjustments.reduce((sum, adj) => sum + (adj.amount ?? 0), 0),
    [adjustments]
  );

  const netEarned = totalEarned - totalAdjustments - returnsDiscount;
  const netAfterSettlements = netEarned - settledAmount;
  const availableForAdvance = Math.max(netAfterSettlements, 0);
  const baseAmountForSettlement = Math.max(totalEarned - returnsDiscount, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-slate-500">Cargando reporte...</div>
      </div>
    );
  }

  const total = totalEarned + totalPending;
  const percentage = total > 0 ? (totalEarned / total) * 100 : 0;

  async function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setAdjustmentError(null);

    const amountNumber =
      typeof adjustmentAmount === "string" ? Number(adjustmentAmount) : adjustmentAmount;

    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setAdjustmentError("Ingresa un monto válido.");
      return;
    }

    const cleanNote = adjustmentNote.trim() || null;

    setSavingAdjustment(true);

    const { error } = await supabase.from("salary_adjustments").insert({
      technician_id: technicianId,
      type: adjustmentType,
      amount: amountNumber,
      note: cleanNote,
    });

    setSavingAdjustment(false);

    if (error) {
      console.error("Error registrando ajuste de sueldo:", error);
      setAdjustmentError("No pudimos guardar el ajuste. Intenta nuevamente.");
      return;
    }

    setAdjustmentAmount("");
    setAdjustmentNote("");
    setAdjustmentType("advance");
    setAdjustmentFormOpen(false);
    setAdjustmentError(null);
    // Recargar datos y disparar evento para actualizar otros componentes
    void loadData();
    window.dispatchEvent(new CustomEvent('orderUpdated'));
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    const target = adjustments.find((adj) => adj.id === adjustmentId);
    if (!target) {
      return;
    }
    const confirmed = window.confirm("¿Eliminar este ajuste de sueldo?");
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setDeletingAdjustmentId(adjustmentId);
    const { error } = await supabase
      .from("salary_adjustments")
      .delete()
      .eq("id", adjustmentId)
      .eq("technician_id", technicianId);
    setDeletingAdjustmentId(null);
    if (error) {
      console.error("Error eliminando ajuste:", error);
      setActionError("No pudimos eliminar el ajuste. Intenta nuevamente.");
      return;
    }
    setAdjustments((prev) => prev.filter((adj) => adj.id !== adjustmentId));
  }

  async function handleDeleteReturn(orderId: string) {
    const target = returnedOrders.find((order) => order.id === orderId);
    if (!target) {
      return;
    }
    const confirmed = window.confirm("¿Eliminar esta devolución/cancelación del historial?");
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setDeletingReturnId(orderId);
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("technician_id", technicianId)
      .in("status", ["returned", "cancelled"]);
    setDeletingReturnId(null);
    if (error) {
      console.error("Error eliminando devolución:", error);
      setActionError("No pudimos eliminar la devolución. Intenta nuevamente.");
      return;
    }
    setReturnedOrders((prev) => prev.filter((order) => order.id !== orderId));
    setReturnsDiscount((prev) => Math.max(prev - (target.commission_amount ?? 0), 0));
  }

  async function handleSettleAllReturns() {
    if (returnedOrders.length === 0) {
      return;
    }
    const confirmed = window.confirm("¿Seguro que quieres eliminar todas tus devoluciones/cancelaciones de esta semana?");
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setSettlingReturns(true);
    const { start, end } = currentWeekRange();
    // Convertir fechas a UTC para evitar problemas de zona horaria
    const startUTC = dateToUTCStart(start);
    const endUTC = dateToUTCEnd(end);
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("technician_id", technicianId)
      .in("status", ["returned", "cancelled"])
      .gte("created_at", startUTC.toISOString())
      .lte("created_at", endUTC.toISOString());
    setSettlingReturns(false);
    if (error) {
      console.error("Error al eliminar devoluciones:", error);
      setActionError("No pudimos eliminar las devoluciones. Intenta nuevamente.");
      return;
    }
    setReturnedOrders([]);
    setReturnsDiscount(0);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Reporte Semanal de Ganancias</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Total ganado esta semana (con recibo):</span>
          <span className="font-semibold text-emerald-600">{formatCLP(totalEarned)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-600">Ajustes registrados (descuentos / adelantos):</span>
          <span className="font-semibold text-slate-600">-{formatCLP(totalAdjustments)}</span>
        </div>

        {returnsDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Descuento por devoluciones/cancelaciones:</span>
            <span className="font-semibold text-red-600">-{formatCLP(returnsDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Total real disponible:</span>
          <span className="font-semibold text-brand">{formatCLP(netAfterSettlements)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Liquidado esta semana:</span>
          <span className="font-semibold text-sky-600">{formatCLP(settledAmount)}</span>
        </div>
        {netAfterSettlements > 0 && (
          <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-md p-2">
            <span className="text-slate-700 font-medium text-sm">Saldo restante pendiente:</span>
            <span className="font-semibold text-amber-700">{formatCLP(netAfterSettlements)}</span>
          </div>
        )}
        {/* Solo mostrar panel de liquidación si NO es técnico */}
        {userRole !== "technician" && (
          <SalarySettlementPanel
            technicianId={technicianId}
            baseAmount={baseAmountForSettlement}
            adjustmentTotal={totalAdjustments}
            context="technician"
            onAfterSettlement={() => void loadData()}
          />
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Total pendiente:</span>
          <span className="font-semibold text-amber-600">{formatCLP(totalPending)}</span>
        </div>
        
        {lastPayment && (
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Último pago recibido:</span>
            <span className="font-medium text-slate-700">{lastPayment}</span>
          </div>
        )}
        
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progreso semanal</span>
            <span>
              {total > 0 ? (
                <>
                  <span className="text-emerald-600">{((totalEarned / total) * 100).toFixed(0)}%</span>
                  {" / "}
                  <span className="text-amber-600">{((totalPending / total) * 100).toFixed(0)}%</span>
                </>
              ) : (
                "0%"
              )}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 flex overflow-hidden">
            {total > 0 && (
              <>
                {/* Parte verde: Pagado con recibo */}
                {totalEarned > 0 && (
                  <div
                    className="bg-emerald-500 h-3 transition-all duration-300"
                    style={{ width: `${(totalEarned / total) * 100}%` }}
                  ></div>
                )}
                {/* Parte anaranjada: Pendiente */}
                {totalPending > 0 && (
                  <div
                    className="bg-amber-500 h-3 transition-all duration-300"
                    style={{ width: `${(totalPending / total) * 100}%` }}
                  ></div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Pagado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Pendiente
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Ajustes de sueldo de la semana</h4>
            <p className="text-xs text-slate-500">
              Descuentos, adelantos y devoluciones se restan del total ganado. Saldo disponible:{" "}
              {formatCLP(availableForAdvance)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
            {returnedOrders.length > 0 && userRole !== "technician" && (
              <button
                type="button"
                onClick={handleSettleAllReturns}
                disabled={settlingReturns}
                className="px-3 py-2 text-xs font-medium border border-amber-500 text-amber-600 rounded-md hover:bg-amber-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {settlingReturns ? "Eliminando devoluciones..." : "Eliminar devoluciones"}
              </button>
            )}
            {/* Solo mostrar botón de liquidar sueldo si NO es técnico */}
            {userRole !== "technician" && (
              <button
                type="button"
                onClick={() => setSettlementPanelOpen((prev) => !prev)}
                className="px-3 py-2 text-xs font-medium border border-brand-light text-brand rounded-md hover:bg-brand/5 transition"
              >
                {settlementPanelOpen ? "Ocultar liquidación" : "Liquidar sueldo"}
              </button>
            )}
            {/* Botón de registrar ajuste visible para todos (incluyendo técnicos) */}
            <button
              type="button"
              onClick={() => {
                setAdjustmentFormOpen((prev) => !prev);
                setAdjustmentError(null);
              }}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-100 transition"
            >
              {adjustmentFormOpen ? "Cerrar formulario" : "Registrar ajuste"}
            </button>
          </div>
        </div>

        {/* Solo mostrar panel de liquidación si NO es técnico */}
        {userRole !== "technician" && settlementPanelOpen && (
          <div className="mb-5">
            <SalarySettlementPanel
              technicianId={technicianId}
              baseAmount={baseAmountForSettlement}
              adjustmentTotal={totalAdjustments}
              context="technician"
              onAfterSettlement={() => void loadData()}
            />
          </div>
        )}

        {/* Modal de Ajustes de Sueldo para Móvil - Visible para todos */}
        {adjustmentFormOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
            setAdjustmentFormOpen(false);
            setAdjustmentType("advance");
            setAdjustmentAmount("");
            setAdjustmentNote("");
            setAdjustmentError(null);
          }}>
            <form onSubmit={handleSaveAdjustment} className="bg-white rounded-lg p-5 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-semibold text-slate-700">Registrar Ajuste de Sueldo</h3>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentFormOpen(false);
                    setAdjustmentType("advance");
                    setAdjustmentAmount("");
                    setAdjustmentNote("");
                    setAdjustmentError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as SalaryAdjustment["type"])}
                  >
                    <option value="advance">Adelanto</option>
                    <option value="discount">Descuento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                    value={formattedAdjustmentAmount}
                    onChange={(e) => handleAdjustmentAmountChange(e.target.value)}
                    placeholder="Ej: 20.000"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Valores en CLP.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nota (opcional)
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    placeholder="Motivo o detalle"
                  />
                </div>
              </div>
              {adjustmentError && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{adjustmentError}</div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustmentFormOpen(false);
                    setAdjustmentType("advance");
                    setAdjustmentAmount("");
                    setAdjustmentNote("");
                    setAdjustmentError(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment}
                  className="flex-1 px-4 py-2 text-sm bg-brand-light text-white rounded-md hover:bg-brand transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {savingAdjustment ? "Guardando..." : "Guardar ajuste"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulario de Ajustes para Desktop */}
        {adjustmentFormOpen && (
          <form onSubmit={handleSaveAdjustment} className="hidden lg:block bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as SalaryAdjustment["type"])}
                >
                  <option value="advance">Adelanto</option>
                  <option value="discount">Descuento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monto</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={formattedAdjustmentAmount}
                  onChange={(e) => handleAdjustmentAmountChange(e.target.value)}
                  placeholder="Ej: 20.000"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Valores en CLP.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nota (opcional)
                </label>
                <input
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="Motivo o detalle"
                />
              </div>
            </div>
            {adjustmentError && (
              <div className="text-xs text-amber-600">{adjustmentError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentFormOpen(false);
                  setAdjustmentType("advance");
                  setAdjustmentAmount("");
                  setAdjustmentNote("");
                  setAdjustmentError(null);
                }}
                className="px-4 py-2 text-xs border border-slate-300 rounded-md hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingAdjustment}
                className="px-4 py-2 text-xs bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {savingAdjustment ? "Guardando..." : "Guardar ajuste"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {actionError && <div className="text-xs text-red-600">{actionError}</div>}
          {loadingAdjustments ? (
            <div className="text-sm text-slate-500">Cargando ajustes...</div>
          ) : adjustments.length === 0 && returnedOrders.length === 0 ? (
            <div className="text-sm text-slate-500">
              No hay ajustes registrados esta semana.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Mostrar devoluciones/cancelaciones primero */}
              {returnedOrders.map((order) => {
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
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-red-200 bg-red-50/30 rounded-md px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-red-600">
                        {order.status === "returned" ? "Devolución" : "Cancelación"}
                      </span>
                      <span className="text-slate-600 ml-2">- Orden #{order.order_number}</span>
                      <div className="text-xs text-slate-400">{dateTime}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-600">
                        -{formatCLP(order.commission_amount ?? 0)}
                      </span>
                      {/* Solo mostrar botón eliminar si NO es técnico */}
                      {userRole !== "technician" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReturn(order.id)}
                          disabled={deletingReturnId === order.id || settlingReturns}
                          className="text-xs text-red-600 hover:text-red-500 disabled:opacity-60"
                        >
                          {deletingReturnId === order.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Mostrar ajustes de sueldo */}
              {adjustments.map((adj) => {
                const dateTime = new Date(adj.created_at).toLocaleString("es-CL", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                return (
                  <div
                    key={adj.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-200 bg-white rounded-md px-3 py-2 text-sm"
                  >
                    <div>
                      <span
                        className={`font-medium ${
                          adj.type === "advance" ? "text-blue-600" : "text-red-600"
                        }`}
                      >
                        {adj.type === "advance" ? "Adelanto" : "Descuento"}
                      </span>
                      {adj.note && <span className="text-slate-600 ml-2">- {adj.note}</span>}
                      <div className="text-xs text-slate-400">{dateTime}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCLP(adj.amount)}</span>
                      {/* Botón eliminar visible para todos (los técnicos pueden eliminar sus propios ajustes) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAdjustment(adj.id)}
                        disabled={deletingAdjustmentId === adj.id}
                        className="text-xs text-red-600 hover:text-red-500 disabled:opacity-60"
                      >
                        {deletingAdjustmentId === adj.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

