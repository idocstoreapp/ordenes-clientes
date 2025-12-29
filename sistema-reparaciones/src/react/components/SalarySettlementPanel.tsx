import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currentWeekRange, formatDate } from "@/lib/date";
import { formatCLP } from "@/lib/currency";
import type { SalaryAdjustment, SalaryAdjustmentApplication } from "@/types";

interface SalarySettlementPanelProps {
  technicianId: string;
  technicianName?: string;
  baseAmount: number;
  adjustmentTotal: number;
  context: "technician" | "admin";
  onAfterSettlement?: () => void;
}

type AdjustmentWithPending = SalaryAdjustment & {
  remaining: number;
  appliedTotal: number;
  isCurrentWeek: boolean;
  availableFromDate: Date;
  isAvailableThisWeek: boolean;
};

export default function SalarySettlementPanel({
  technicianId,
  technicianName,
  baseAmount,
  adjustmentTotal,
  context,
  onAfterSettlement,
}: SalarySettlementPanelProps) {
  const [pendingAdjustments, setPendingAdjustments] = useState<AdjustmentWithPending[]>([]);
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [applicationsSupported, setApplicationsSupported] = useState(true);
  const [setupWarning, setSetupWarning] = useState<string | null>(null);
  const [settledAmount, setSettledAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "efectivo/transferencia">("efectivo");
  const [cashAmount, setCashAmount] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  const [customAmountInput, setCustomAmountInput] = useState(0);
  const [settlementType, setSettlementType] = useState<"total" | "partial">("total");
  const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<string | null>(null);
  const [returnedOrders, setReturnedOrders] = useState<any[]>([]);
  const [returnsTotal, setReturnsTotal] = useState(0);

  const { start: weekStartDate, end: weekEndDate } = currentWeekRange();
  const weekStartISO = weekStartDate.toISOString().slice(0, 10);

  async function loadPendingAdjustments() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

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

    async function fetchAdjustments(includeApplications: boolean) {
      const selectClause = includeApplications
        ? "*, applications:salary_adjustment_applications(applied_amount)"
        : "*";
      let query = supabase
        .from("salary_adjustments")
        .select(selectClause)
        .eq("technician_id", technicianId);
      
      // Si hay liquidación, solo cargar ajustes creados DESPUÉS de la liquidación
      // Los ajustes ya liquidadas no deben aparecer
      if (lastSettlementDate) {
        query = query.gte("created_at", lastSettlementDate.toISOString());
      }
      
      return await query.order("created_at", { ascending: false });
    }

    let adjustmentsResponse = await fetchAdjustments(applicationsSupported);

    if (adjustmentsResponse.error && applicationsSupported) {
      const msg = adjustmentsResponse.error.message?.toLowerCase() ?? "";
      if (msg.includes("salary_adjustment_applications") || msg.includes("does not exist")) {
        setApplicationsSupported(false);
        setSetupWarning(
          "Para usar la liquidación parcial debes ejecutar el script `database/add_salary_adjustment_applications.sql` en Supabase y volver a intentarlo."
        );
        adjustmentsResponse = await fetchAdjustments(false);
      }
    }

    if (adjustmentsResponse.error) {
      console.error("Error cargando ajustes pendientes:", adjustmentsResponse.error);
      setPendingAdjustments([]);
      setAdjustmentDrafts({});
      setErrorMsg("No pudimos cargar los ajustes pendientes. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    const adjustmentsData =
      (adjustmentsResponse.data ?? []) as unknown as (SalaryAdjustment & {
        applications?: SalaryAdjustmentApplication[];
      })[];

    const normalized: AdjustmentWithPending[] = adjustmentsData
      .map((adj) => {
        const applications = (adj as any)?.applications ?? [];
        const appliedTotal =
          applicationsSupported
            ? (applications as SalaryAdjustmentApplication[]).reduce(
                (sum, app) => sum + (app.applied_amount ?? 0),
                0
              ) ?? 0
            : 0;
        const remaining = Math.max((adj.amount ?? 0) - appliedTotal, 0);
        const createdDate = new Date(adj.created_at);
        const availableFromDate = adj.available_from
          ? new Date(adj.available_from)
          : new Date(createdDate);
        availableFromDate.setHours(0, 0, 0, 0);
        const isAvailableThisWeek = availableFromDate <= weekEndDate;
        return {
          ...adj,
          appliedTotal,
          remaining,
          availableFromDate,
          isAvailableThisWeek,
          isCurrentWeek: createdDate >= weekStartDate && createdDate <= weekEndDate,
        };
      })
      .filter((adj) => adj.remaining > 0);

    setPendingAdjustments(normalized);
    setAdjustmentDrafts((prev) => {
      const next: Record<string, number> = {};
      normalized.forEach((adj) => {
        const previousValue = prev[adj.id];
        if (!adj.isAvailableThisWeek) {
          next[adj.id] = 0;
          return;
        }
        if (typeof previousValue === "number") {
          next[adj.id] = Math.min(Math.max(previousValue, 0), adj.remaining);
        } else {
          next[adj.id] = adj.remaining;
        }
      });
      return next;
    });
    // Cargar liquidaciones registradas para la semana
    const settlementsResponse = await supabase
      .from("salary_settlements")
      .select("amount")
      .eq("technician_id", technicianId)
      .eq("week_start", weekStartISO);

    if (settlementsResponse.error) {
      console.error("Error cargando liquidaciones:", settlementsResponse.error);
      const msg = settlementsResponse.error.message?.toLowerCase() ?? "";
      if (msg.includes("salary_settlements") || msg.includes("does not exist")) {
        setSetupWarning((prev) =>
          prev
            ? prev
            : "Para registrar pagos completos ejecuta el script `database/add_salary_settlements.sql` en Supabase."
        );
        setSettledAmount(0);
      }
    } else {
      setSettledAmount(
        settlementsResponse.data?.reduce((sum, row) => sum + (row.amount ?? 0), 0) ?? 0
      );
    }

    // Cargar devoluciones y cancelaciones de la semana
    // Solo las creadas después de la última liquidación (si existe)
    const { start, end } = currentWeekRange();
    let returnsQuery = supabase
      .from("orders")
      .select("id, commission_amount, status")
      .eq("technician_id", technicianId)
      .in("status", ["returned", "cancelled"])
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    
    // Si hay liquidación, solo contar devoluciones creadas DESPUÉS de la liquidación
    if (lastSettlementDate) {
      returnsQuery = returnsQuery.gte("created_at", lastSettlementDate.toISOString());
    }
    
    const { data: returnedData } = await returnsQuery;

    if (returnedData) {
      setReturnedOrders(returnedData);
      const total = returnedData.reduce((sum, order) => sum + (order.commission_amount ?? 0), 0);
      setReturnsTotal(total);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (technicianId) {
      void loadPendingAdjustments();
    }
    
    // Escuchar eventos de liquidación para refrescar el panel
    const handleSettlementCreated = () => {
      if (technicianId) {
        void loadPendingAdjustments();
      }
    };
    
    window.addEventListener('settlementCreated', handleSettlementCreated);
    return () => {
      window.removeEventListener('settlementCreated', handleSettlementCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianId]);

  const selectedAdjustmentsTotal = useMemo(
    () =>
      pendingAdjustments.reduce((sum, adj) => {
        if (!adj.isAvailableThisWeek) {
          return sum;
        }
        const raw = adjustmentDrafts[adj.id];
        const value = Number.isFinite(raw) ? raw : adj.remaining;
        return sum + Math.min(Math.max(value ?? 0, 0), adj.remaining);
      }, 0),
    [pendingAdjustments, adjustmentDrafts]
  );

  const availableAdjustments = useMemo(
    () => pendingAdjustments.filter((adj) => adj.isAvailableThisWeek),
    [pendingAdjustments]
  );

  const deferredHoldback = useMemo(
    () =>
      pendingAdjustments.reduce((sum, adj) => {
        if (!adj.isAvailableThisWeek && adj.availableFromDate > weekEndDate) {
          return sum + adj.remaining;
        }
        return sum;
      }, 0),
    [pendingAdjustments, weekEndDate]
  );

  const totalAdjustable = useMemo(
    () => availableAdjustments.reduce((sum, adj) => sum + adj.remaining, 0),
    [availableAdjustments]
  );
  const grossAvailable = baseAmount - settledAmount;
  const minPayable = Math.max(grossAvailable - (totalAdjustable + deferredHoldback), 0);
  const maxPayable = Math.max(baseAmount + deferredHoldback, grossAvailable);
  const netRemaining = Math.max(grossAvailable - (selectedAdjustmentsTotal + deferredHoldback), 0);

  useEffect(() => {
    if (settlementType === "total") {
      // Si es ajuste total, establecer automáticamente al monto completo
      const defaultAmount = Math.max(minPayable, Math.min(netRemaining, maxPayable));
      setCustomAmountInput(defaultAmount);
    } else {
      // Si es ajuste parcial, mantener el monto actual o establecer a 0 si es la primera vez
      if (customAmountInput === 0 || customAmountInput > netRemaining) {
        setCustomAmountInput(0);
      }
    }
  }, [minPayable, netRemaining, maxPayable, settlementType]);

  // Calcular saldo restante después del pago
  const remainingBalance = useMemo(() => {
    const paidAmount = paymentMethod === "efectivo/transferencia" 
      ? cashAmount + transferAmount 
      : customAmountInput;
    return Math.max(0, netRemaining - paidAmount);
  }, [netRemaining, customAmountInput, cashAmount, transferAmount, paymentMethod]);

  function distributeDeduction(amountToDeduct: number) {
    let remaining = Math.max(0, Math.min(amountToDeduct, totalAdjustable));
    const next: Record<string, number> = {};
    pendingAdjustments.forEach((adj) => {
      if (!adj.isAvailableThisWeek) {
        next[adj.id] = 0;
        return;
      }
      if (remaining <= 0) {
        next[adj.id] = 0;
        return;
      }
      const apply = Math.min(adj.remaining, remaining);
      next[adj.id] = apply;
      remaining -= apply;
    });
    return next;
  }

  function applyPreset(mode: "net" | "full") {
    const target = mode === "full" ? maxPayable : minPayable;
    applyCustomAmount(target);
  }

  function applyCustomAmount(targetValue?: number) {
    const clamped = Math.max(minPayable, Math.min(targetValue ?? customAmountInput, maxPayable));
    const desiredDeduction = Math.max(
      0,
      Math.min(totalAdjustable, Math.max(grossAvailable - deferredHoldback - clamped, 0))
    );
    const nextDrafts = distributeDeduction(desiredDeduction);
    setCustomAmountInput(clamped);
    setAdjustmentDrafts(nextDrafts);
  }

  function handleDraftChange(adjId: string, value: string) {
    const target = pendingAdjustments.find((adj) => adj.id === adjId);
    if (!target || !target.isAvailableThisWeek) return;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      setAdjustmentDrafts((prev) => ({ ...prev, [adjId]: 0 }));
      return;
    }
    const clamped = Math.max(0, Math.min(numeric, target.remaining));
    setAdjustmentDrafts((prev) => ({ ...prev, [adjId]: clamped }));
  }

  function handleToggleAdjustment(adjId: string, enabled: boolean) {
    const target = pendingAdjustments.find((adj) => adj.id === adjId);
    if (!target || !target.isAvailableThisWeek) return;
    setAdjustmentDrafts((prev) => ({
      ...prev,
      [adjId]: enabled ? target.remaining : 0,
    }));
  }

  function formatAmount(amount: number) {
    return formatCLP(amount);
  }
  const canEditAdjustments = context === "admin";

  async function handleDeleteAdjustment(adjustmentId: string) {
    const target = pendingAdjustments.find((adj) => adj.id === adjustmentId);
    if (!target) {
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar este ajuste de sueldo (${target.type === "advance" ? "Adelanto" : "Descuento"} de ${formatAmount(target.amount ?? 0)})?`
    );
    if (!confirmed) {
      return;
    }
    setErrorMsg(null);
    setDeletingAdjustmentId(adjustmentId);
    const { error } = await supabase
      .from("salary_adjustments")
      .delete()
      .eq("id", adjustmentId)
      .eq("technician_id", technicianId);
    setDeletingAdjustmentId(null);
    if (error) {
      console.error("Error eliminando ajuste:", error);
      setErrorMsg("No pudimos eliminar el ajuste. Intenta nuevamente.");
      return;
    }
    await loadPendingAdjustments();
  }

  async function handleLiquidation() {
    // Si es pago mixto, validar que ambos montos sumen el total
    let targetAmount = customAmountInput;
    
    if (paymentMethod === "efectivo/transferencia") {
      const mixedTotal = cashAmount + transferAmount;
      if (mixedTotal <= 0) {
        setErrorMsg("Debes ingresar al menos un monto en efectivo o transferencia.");
        return;
      }
      if (mixedTotal > netRemaining) {
        setErrorMsg(`El total de efectivo + transferencia no puede exceder el total a liquidar (${formatCLP(netRemaining)}).`);
        return;
      }
      // Usar el total mixto como monto a liquidar
      targetAmount = mixedTotal;
      setCustomAmountInput(mixedTotal);
    } else {
      // Para efectivo o transferencia individual, validar que no exceda el total a liquidar
      if (targetAmount > netRemaining) {
        setErrorMsg(`El monto no puede exceder el total a liquidar (${formatCLP(netRemaining)}).`);
        return;
      }
    }
    
    // Permitir pagos parciales (no requiere que sea exactamente minPayable o maxPayable)
    if (targetAmount <= 0) {
      setErrorMsg("Debes ingresar un monto mayor a 0 para liquidar.");
      return;
    }
    
    if (targetAmount > netRemaining) {
      setErrorMsg(`El monto no puede exceder el total a liquidar (${formatCLP(netRemaining)}).`);
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    setSaving(true);
    applyCustomAmount(targetAmount);

    const desiredDeduction = Math.max(
      0,
      Math.min(totalAdjustable, Math.max(grossAvailable - deferredHoldback - targetAmount, 0))
    );
    const draftsForSave = distributeDeduction(desiredDeduction);
    setAdjustmentDrafts(draftsForSave);
    setCustomAmountInput(targetAmount);

    const pendingEntries = pendingAdjustments.map((adj) => {
      if (!adj.isAvailableThisWeek) {
        return null;
      }
      const raw = draftsForSave[adj.id];
      const amountToApply = Math.min(Math.max(raw ?? 0, 0), adj.remaining);
      return {
        adjustment_id: adj.id,
        technician_id: technicianId,
        applied_amount: amountToApply,
      };
    });

    const entriesToApply = pendingEntries.filter(
      (entry): entry is NonNullable<typeof entry> => !!entry && entry.applied_amount > 0
    );
    const appliedById = entriesToApply.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.adjustment_id] = entry.applied_amount;
      return acc;
    }, {});

    if (applicationsSupported && entriesToApply.length > 0) {
      const payload = entriesToApply.map((entry) => ({
        ...entry,
        week_start: weekStartISO,
      }));
      const { error } = await supabase.from("salary_adjustment_applications").insert(payload);

      if (error) {
        console.error("Error registrando liquidación:", error);
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("salary_adjustment_applications") || msg.includes("does not exist")) {
          setApplicationsSupported(false);
          setSetupWarning(
            "Para guardar liquidaciones debes ejecutar el script `database/add_salary_adjustment_applications.sql` en Supabase."
          );
          setErrorMsg(
            "No pudimos registrar la liquidación porque falta la tabla de aplicaciones. Ejecuta el script indicado y vuelve a intentarlo."
          );
        } else {
          setErrorMsg("No pudimos registrar la liquidación. Intenta nuevamente.");
        }
        setSaving(false);
        return;
      }
    }

    const nextWeekStart = new Date(weekStartDate);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    nextWeekStart.setHours(0, 0, 0, 0);
    const nextWeekStartISO = nextWeekStart.toISOString().slice(0, 10);

    const carryOverAdjustments = pendingAdjustments
      .map((adj) => {
        if (!adj.isCurrentWeek || !adj.isAvailableThisWeek) return null;
        const raw = draftsForSave[adj.id] ?? 0;
        const leftover = Math.max(adj.remaining - raw, 0);
        if (leftover <= 0) return null;
        return { adj, leftover };
      })
      .filter((item): item is { adj: AdjustmentWithPending; leftover: number } => !!item);

    const carryOverSummary: { original_id: string; amount: number }[] = [];

    for (const item of carryOverAdjustments) {
      const { error: deferError } = await supabase
        .from("salary_adjustments")
        .update({
          available_from: nextWeekStartISO,
          note: item.adj.note
            ? `${item.adj.note} (pendiente ${formatDate(nextWeekStartISO)})`
            : `Pendiente desde ${formatDate(nextWeekStartISO)}`,
        })
        .eq("id", item.adj.id);

      if (deferError) {
        console.error("Error actualizando ajuste diferido:", deferError);
        setErrorMsg("No pudimos diferir parte de los descuentos. Intenta nuevamente.");
        setSaving(false);
        return;
      }

      carryOverSummary.push({ original_id: item.adj.id, amount: item.leftover });
    }

    const detailsPayload = {
      base_amount: baseAmount,
      selected_adjustments_total: selectedAdjustmentsTotal,
      settled_amount: targetAmount,
      adjustments: pendingAdjustments.map((adj) => {
        const applied = appliedById[adj.id] ?? 0;
        return {
          id: adj.id,
          type: adj.type,
          note: adj.note,
          amount: adj.amount,
          applied,
          omitted: Math.max(adj.remaining - applied, 0),
          carried_to_next_week:
            carryOverSummary.find((item) => item.original_id === adj.id)?.amount ?? 0,
        };
      }),
      carry_over: carryOverSummary,
      // Si es pago mixto, guardar los montos por separado
      ...(paymentMethod === "efectivo/transferencia" && {
        payment_breakdown: {
          efectivo: cashAmount,
          transferencia: transferAmount,
          total: targetAmount,
        },
      }),
    };

    const { data: userData } = await supabase.auth.getUser();
    
    const settlementData = {
      technician_id: technicianId,
      week_start: weekStartISO,
      amount: targetAmount,
      note: null,
      context,
      payment_method: paymentMethod,
      details: detailsPayload,
      created_by: userData?.user?.id ?? null,
    };
    
    console.log("Guardando liquidación con los siguientes datos:", settlementData);
    
    const { data: insertedData, error: settlementError } = await supabase
      .from("salary_settlements")
      .insert(settlementData)
      .select(); // Seleccionar los datos insertados para verificar

    setSaving(false);

    if (settlementError) {
      console.error("Error registrando pago:", settlementError);
      console.error("Detalles del error:", JSON.stringify(settlementError, null, 2));
      const msg = settlementError.message?.toLowerCase() ?? "";
      if (msg.includes("salary_settlements") || msg.includes("does not exist")) {
        setSetupWarning(
          "Para registrar pagos completos ejecuta el script `database/add_salary_settlements.sql` en Supabase."
        );
        setErrorMsg(
          "No pudimos registrar el pago porque falta la tabla de liquidaciones. Ejecuta el script indicado y vuelve a intentarlo."
        );
      } else if (msg.includes("row-level security") || msg.includes("policy")) {
        setErrorMsg(
          `Error de seguridad: ${settlementError.message}. Verifica que tengas permisos de administrador para registrar liquidaciones.`
        );
        console.error("Problema con las políticas RLS. Verifica las políticas de inserción en Supabase.");
      } else {
        setErrorMsg(`No pudimos registrar el pago: ${settlementError.message}. Verifica la consola para más detalles.`);
      }
      return;
    }

    if (!insertedData || insertedData.length === 0) {
      console.error("No se recibieron datos de confirmación de la inserción");
      setErrorMsg("❌ ERROR CRÍTICO: La liquidación no se pudo confirmar. NO se guardó. Por favor, intenta nuevamente.");
      // Intentar verificar si se guardó de todas formas consultando la BD
      try {
        const { data: verification, error: verifyError } = await supabase
          .from("salary_settlements")
          .select("id, amount, created_at")
          .eq("technician_id", technicianId)
          .eq("week_start", weekStartISO)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (verification && !verifyError) {
          console.warn("Aunque no se recibió confirmación, se encontró una liquidación en la BD:", verification);
          setSuccessMsg(`⚠️ Liquidación posiblemente guardada (ID: ${verification.id}). Verifica en el historial.`);
        } else {
          setErrorMsg("❌ ERROR: La liquidación NO se guardó. Verifica los logs en la consola e intenta nuevamente.");
        }
      } catch (verifyErr) {
        console.error("Error al verificar liquidación:", verifyErr);
        setErrorMsg("❌ ERROR: No se pudo confirmar si la liquidación se guardó. Verifica en el historial o intenta nuevamente.");
      }
      return;
    }

    // VERIFICACIÓN ADICIONAL: Confirmar que realmente se guardó consultando la BD
    const savedSettlementId = insertedData[0].id;
    console.log("Liquidación insertada, verificando en BD... ID:", savedSettlementId);
    
    try {
      const { data: verification, error: verifyError } = await supabase
        .from("salary_settlements")
        .select("id, amount, created_at, technician_id, week_start")
        .eq("id", savedSettlementId)
        .maybeSingle();
      
      if (verifyError || !verification) {
        console.error("❌ ERROR: La liquidación se insertó pero NO se pudo verificar:", verifyError);
        setErrorMsg(`⚠️ ADVERTENCIA: La liquidación fue insertada (ID: ${savedSettlementId}) pero no se pudo verificar. Por favor, verifica en el historial si aparece correctamente.`);
        // Continuar de todas formas ya que la inserción fue exitosa
      } else {
        console.log("✅ VERIFICACIÓN EXITOSA: La liquidación se guardó correctamente:", verification);
      }
    } catch (verifyErr) {
      console.error("Error en verificación adicional:", verifyErr);
      // Continuar de todas formas
    }

    setSuccessMsg(`✅ Liquidación registrada correctamente. ID: ${savedSettlementId} | Monto: ${formatCLP(targetAmount)} | Técnico: ${technicianName || technicianId}`);
    setPaymentMethod("efectivo");
    setCashAmount(0);
    setTransferAmount(0);
    await loadPendingAdjustments();
    if (onAfterSettlement) {
      onAfterSettlement();
    }
    
    // Disparar evento para actualizar el historial
    window.dispatchEvent(new CustomEvent('settlementCreated'));
    
    // Alert visual adicional para asegurar que el usuario vea el mensaje
    setTimeout(() => {
      alert(`✅ LIQUIDACIÓN GUARDADA\n\nID: ${savedSettlementId}\nMonto: ${formatCLP(targetAmount)}\nTécnico: ${technicianName || technicianId}\n\nPuedes verificar en el historial de liquidaciones.`);
    }, 500);
  }

  const noAdjustments = pendingAdjustments.length === 0;
  const settlementInfo = (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Total ganado</p>
          <p className="text-lg font-semibold text-emerald-600">${formatAmount(baseAmount)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Descuentos</p>
          <p className="text-lg font-semibold text-slate-700">
            -${formatAmount(selectedAdjustmentsTotal)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Devoluciones</p>
          <p className="text-xs text-slate-400 mb-1">
            {returnedOrders.length} {returnedOrders.length === 1 ? 'orden' : 'órdenes'}
          </p>
          <p className="text-lg font-semibold text-sky-600">${formatAmount(returnsTotal)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <p className="text-xs text-slate-500">Total a liquidar</p>
          <p className="text-lg font-semibold text-brand">${formatAmount(netRemaining)}</p>
        </div>
      </div>
      {deferredHoldback > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm flex flex-col gap-1">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Pendiente próxima semana
          </p>
          <p className="text-lg font-semibold text-amber-700">
            ${formatAmount(deferredHoldback)}
          </p>
          <p className="text-xs text-amber-700">
            No se pagará esta semana y quedará pendiente para la próxima liquidación.
          </p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-md p-4 text-sm text-slate-500">
        Cargando liquidación...
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
      {setupWarning && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          {setupWarning}
        </div>
      )}
      <div>
        <h5 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          {context === "admin" ? "Liquidación manual" : "Liquidación de sueldo"}
          {technicianName && <span className="text-xs text-slate-500">• {technicianName}</span>}
        </h5>
        <p className="text-xs text-slate-500 mb-3">
          Selecciona el tipo de ajuste y el monto a liquidar.
        </p>
        
        {/* Selector de tipo de ajuste */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 mb-2 block">Tipo de ajuste:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSettlementType("total");
                // Establecer automáticamente al monto completo
                const defaultAmount = Math.max(minPayable, Math.min(netRemaining, maxPayable));
                setCustomAmountInput(defaultAmount);
                if (paymentMethod === "efectivo/transferencia") {
                  setCashAmount(0);
                  setTransferAmount(0);
                }
              }}
              className={`px-4 py-2 text-xs font-medium rounded-md border transition ${
                settlementType === "total"
                  ? "bg-brand-light text-white border-brand-light"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Ajuste Total
            </button>
            <button
              type="button"
              onClick={() => {
                setSettlementType("partial");
                // Resetear montos para ajuste parcial
                setCustomAmountInput(0);
                setCashAmount(0);
                setTransferAmount(0);
              }}
              className={`px-4 py-2 text-xs font-medium rounded-md border transition ${
                settlementType === "partial"
                  ? "bg-brand-light text-white border-brand-light"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Ajuste Parcial
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {settlementType === "total" 
              ? "Se liquidará el monto completo disponible."
              : "Puedes pagar un monto menor y el saldo restante quedará pendiente."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-500 flex items-center gap-2">
              Medio de pago:
              <select
                className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                value={paymentMethod}
                onChange={(e) => {
                  const newMethod = e.target.value as "efectivo" | "transferencia" | "efectivo/transferencia";
                  setPaymentMethod(newMethod);
                  if (newMethod !== "efectivo/transferencia") {
                    setCashAmount(0);
                    setTransferAmount(0);
                    // Si cambia a efectivo o transferencia, resetear el monto
                    setCustomAmountInput(0);
                  } else {
                    // Si cambia a mixto, resetear ambos montos
                    setCashAmount(0);
                    setTransferAmount(0);
                    setCustomAmountInput(0);
                  }
                }}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo/transferencia">Efectivo/Transferencia</option>
              </select>
            </label>
            {paymentMethod === "efectivo" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Monto en Efectivo:
                  <input
                    type="number"
                    className="border border-slate-300 rounded-md px-2 py-1 text-sm w-32"
                    value={customAmountInput}
                    min={0}
                    max={netRemaining}
                    disabled={settlementType === "total"}
                    onChange={(e) => {
                      const amount = Number(e.target.value) || 0;
                      const clamped = Math.min(amount, netRemaining);
                      setCustomAmountInput(clamped);
                    }}
                  />
                </label>
                {customAmountInput > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-600 font-medium">
                      A pagar: {formatCLP(customAmountInput)}
                    </p>
                    {remainingBalance > 0 && (
                      <p className="text-xs text-amber-600 font-semibold">
                        Saldo restante: {formatCLP(remainingBalance)}
                      </p>
                    )}
                    {remainingBalance === 0 && (
                      <p className="text-xs text-emerald-600">
                        ✓ Liquidación completa
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {paymentMethod === "transferencia" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Monto en Transferencia:
                  <input
                    type="number"
                    className="border border-slate-300 rounded-md px-2 py-1 text-sm w-32"
                    value={customAmountInput}
                    min={0}
                    max={netRemaining}
                    disabled={settlementType === "total"}
                    onChange={(e) => {
                      const amount = Number(e.target.value) || 0;
                      const clamped = Math.min(amount, netRemaining);
                      setCustomAmountInput(clamped);
                    }}
                  />
                </label>
                {customAmountInput > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-600 font-medium">
                      A pagar: {formatCLP(customAmountInput)}
                    </p>
                    {remainingBalance > 0 && (
                      <p className="text-xs text-amber-600 font-semibold">
                        Saldo restante: {formatCLP(remainingBalance)}
                      </p>
                    )}
                    {remainingBalance === 0 && (
                      <p className="text-xs text-emerald-600">
                        ✓ Liquidación completa
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {paymentMethod === "efectivo/transferencia" && (
              <div className="flex gap-3 items-end">
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Monto en Efectivo:
                  <input
                    type="number"
                    className="border border-slate-300 rounded-md px-2 py-1 text-sm w-32"
                    value={cashAmount}
                    min={0}
                    max={netRemaining}
                    onChange={(e) => {
                      const cash = Number(e.target.value) || 0;
                      const maxCash = Math.min(cash, netRemaining);
                      setCashAmount(maxCash);
                      const remaining = Math.max(0, netRemaining - maxCash);
                      // Ajustar transferAmount si excede el restante
                      const adjustedTransfer = Math.min(transferAmount, remaining);
                      setTransferAmount(adjustedTransfer);
                      setCustomAmountInput(maxCash + adjustedTransfer);
                    }}
                  />
                  {cashAmount > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Restante: {formatCLP(Math.max(0, netRemaining - cashAmount))}
                    </p>
                  )}
                </label>
                <label className="text-xs text-slate-500 flex flex-col gap-1">
                  Monto en Transferencia:
                  <input
                    type="number"
                    className="border border-slate-300 rounded-md px-2 py-1 text-sm w-32"
                    value={transferAmount}
                    min={0}
                    max={Math.max(0, netRemaining - cashAmount)}
                    onChange={(e) => {
                      const transfer = Number(e.target.value) || 0;
                      const maxTransfer = Math.max(0, netRemaining - cashAmount);
                      const adjustedTransfer = Math.min(transfer, maxTransfer);
                      setTransferAmount(adjustedTransfer);
                      setCustomAmountInput(cashAmount + adjustedTransfer);
                    }}
                  />
                </label>
                <div className="text-xs text-slate-600 pb-1 flex flex-col">
                  <span className="font-semibold text-emerald-600">
                    A pagar: {formatCLP(cashAmount + transferAmount)}
                  </span>
                  {remainingBalance > 0 && (
                    <span className="text-amber-600 font-semibold mt-1">
                      Saldo restante: {formatCLP(remainingBalance)}
                    </span>
                  )}
                  {remainingBalance === 0 && cashAmount + transferAmount > 0 && (
                    <span className="text-emerald-600 mt-1">
                      ✓ Liquidación completa
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {settlementInfo}

      {/* Mostrar resumen del pago y saldo restante */}
      {((paymentMethod === "efectivo" && customAmountInput > 0) ||
        (paymentMethod === "transferencia" && customAmountInput > 0) ||
        (paymentMethod === "efectivo/transferencia" && (cashAmount + transferAmount) > 0)) && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">Resumen del pago:</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Monto a pagar:</p>
              <p className="text-lg font-semibold text-emerald-600">
                {formatCLP(paymentMethod === "efectivo/transferencia" ? cashAmount + transferAmount : customAmountInput)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo restante:</p>
              <p className={`text-lg font-semibold ${remainingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatCLP(remainingBalance)}
              </p>
            </div>
          </div>
          {remainingBalance > 0 && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <p className="text-xs text-amber-700">
                ⚠️ El saldo restante de {formatCLP(remainingBalance)} quedará pendiente para la próxima liquidación.
              </p>
            </div>
          )}
        </div>
      )}

      {noAdjustments ? (
        <div className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-md p-4">
          {netRemaining <= 0
            ? "No hay saldo pendiente. Todo está liquidado 🎉"
            : `No hay ajustes pendientes esta semana. Puedes registrar el pago completo de $${formatAmount(
                netRemaining
              )} usando el botón.`}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Ajustes pendientes ({pendingAdjustments.length})
            </span>
            <span className="text-xs text-slate-500">
              Total seleccionado: ${formatAmount(selectedAdjustmentsTotal)}
            </span>
          </div>
          <div className="space-y-2">
            {pendingAdjustments.map((adj) => {
              const draftValue = adjustmentDrafts[adj.id] ?? (adj.isAvailableThisWeek ? adj.remaining : 0);
              const isOmitted = draftValue === 0;
              const isDeferred = !adj.isAvailableThisWeek;
              return (
                <div
                  key={adj.id}
                  className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`font-semibold ${
                          adj.type === "advance" ? "text-blue-600" : "text-red-600"
                        }`}
                      >
                        {adj.type === "advance" ? "Adelanto" : "Descuento"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {adj.isCurrentWeek ? "Semana actual" : "Pendiente anterior"}
                      </span>
                    </div>
                    {adj.note && <p className="text-xs text-slate-600 mt-0.5">{adj.note}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      Registrado el {formatDate(adj.created_at)}
                    </p>
                    {isDeferred && (
                      <p className="text-xs text-amber-600 mt-1">
                        Disponible desde {formatDate(adj.availableFromDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-xs text-slate-600">
                      Pendiente:
                      <span className="font-semibold text-slate-900 ml-1">
                        ${formatAmount(adj.remaining)}
                      </span>
                    </div>
                    {canEditAdjustments ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={adj.remaining}
                          step={1000}
                          value={draftValue}
                          onChange={(e) => handleDraftChange(adj.id, e.target.value)}
                          disabled={isDeferred}
                          className={`w-28 border rounded-md px-2 py-1 text-sm ${
                            isDeferred ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleAdjustment(adj.id, isOmitted)}
                          disabled={isDeferred}
                          className={`text-xs font-medium px-3 py-1 rounded-md border ${
                            isDeferred
                              ? "border-slate-300 text-slate-400 cursor-not-allowed bg-slate-100"
                              : isOmitted
                                  ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                  : "border-red-500 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {isDeferred ? "Pendiente próxima semana" : isOmitted ? "Incluir" : "Omitir"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          disabled={deletingAdjustmentId === adj.id}
                          className="text-xs font-medium px-2 py-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar ajuste"
                        >
                          {deletingAdjustmentId === adj.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        {isDeferred
                          ? "Se descontará la próxima semana."
                          : "Se descontará completo en la liquidación."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
      {successMsg && <div className="text-xs text-emerald-600">{successMsg}</div>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void loadPendingAdjustments()}
          className="px-4 py-2 text-xs border border-slate-300 rounded-md hover:bg-slate-100 transition"
          disabled={saving}
        >
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => void handleLiquidation()}
          disabled={saving || (paymentMethod === "efectivo/transferencia" ? (cashAmount + transferAmount) <= 0 : customAmountInput <= 0)}
          className="px-4 py-2 text-xs font-semibold rounded-md text-white bg-brand-light hover:bg-white hover:text-brand border border-brand-light hover:border-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Registrar liquidación"}
        </button>
      </div>
    </div>
  );
}



