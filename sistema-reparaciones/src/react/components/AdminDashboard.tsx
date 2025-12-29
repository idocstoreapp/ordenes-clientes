import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currentMonthRange, currentWeekRange, dateToUTCStart, dateToUTCEnd } from "@/lib/date";
import { formatCLP } from "@/lib/currency";
import { calcCommission } from "@/lib/commission";
import { getCurrentPayoutWeek } from "@/lib/payoutWeek";
import type { PaymentMethod } from "@/lib/commission";
import KpiCard from "./KpiCard";
import AdminReports from "./AdminReports";
// UpdateBsaleUrls component removed - Bsale integration removed

export default function AdminDashboard() {
  const [kpis, setKpis] = useState({
    monthGain: 0,
    pendingAll: 0,
    purchases: 0,
    warrantyOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Función para recargar KPIs
  const refreshKPIs = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { start: monthStart, end: monthEnd } = currentMonthRange();

        // Convertir fechas a UTC para evitar problemas de zona horaria
        const monthStartUTC = dateToUTCStart(monthStart);
        const monthEndUTC = dateToUTCEnd(monthEnd);

        // ⚠️ CAMBIO CRÍTICO: Para el mes, usar paid_at para órdenes pagadas (retrocompatibilidad)
        // Las órdenes pendientes se filtran por created_at ya que aún no tienen paid_at
        const currentPayout = getCurrentPayoutWeek();
        
        // Cargar órdenes pagadas del mes (por paid_at)
        const { data: paidOrders, error: paidError } = await supabase
          .from("orders")
          .select("*")
          .eq("status", "paid")
          .or(`and(paid_at.gte.${monthStartUTC.toISOString()},paid_at.lte.${monthEndUTC.toISOString()}),and(paid_at.is.null,created_at.gte.${monthStartUTC.toISOString()},created_at.lte.${monthEndUTC.toISOString()})`);

        if (paidError) {
          console.error("Error cargando órdenes pagadas:", paidError);
        }

        // Solo contar órdenes pagadas (con recibo) en las ganancias, excluyendo devueltas y canceladas
        const monthGain = (paidOrders || []).reduce(
          (s, r) => s + (r.commission_amount ?? 0),
          0
        );

        // ⚠️ CAMBIO CRÍTICO: "Pagos Pendientes a Técnicos" debe calcular:
        // - Todas las órdenes pagadas (con recibo) de la semana actual
        // - Que NO han sido liquidadas (excluir órdenes con salary_settlements)
        // - Sumar las comisiones de TODOS los técnicos
        
        const { start: weekStart, end: weekEnd } = currentWeekRange();
        const weekStartISO = weekStart.toISOString().slice(0, 10);
        
        // Obtener todos los técnicos
        const { data: technicians, error: techError } = await supabase
          .from("users")
          .select("id")
          .eq("role", "technician");

        if (techError) {
          console.error("Error cargando técnicos:", techError);
        }

        let pendingAll = 0;
        const technicianIds = technicians?.map(t => t.id) || [];

        // Para cada técnico, calcular comisiones pendientes de la semana actual
        if (technicianIds.length > 0) {
          await Promise.all(
            technicianIds.map(async (techId) => {
              // Consultar liquidaciones para este técnico en esta semana
              const { data: settlementsData } = await supabase
                .from("salary_settlements")
                .select("created_at")
                .eq("technician_id", techId)
                .eq("week_start", weekStartISO)
                .order("created_at", { ascending: false });

              const lastSettlementDate = settlementsData && settlementsData.length > 0
                ? new Date(settlementsData[0].created_at)
                : null;

              // Obtener órdenes pagadas de la semana actual (con recibo) que no han sido liquidadas
              let ordersQuery = supabase
                .from("orders")
                .select("commission_amount, paid_at")
                .eq("technician_id", techId)
                .eq("status", "paid")
                .not("receipt_number", "is", null) // Solo órdenes con recibo
                .eq("payout_week", currentPayout.week)
                .eq("payout_year", currentPayout.year);

              // Si hay liquidación, excluir órdenes pagadas antes de la liquidación
              if (lastSettlementDate) {
                ordersQuery = ordersQuery.gte("paid_at", lastSettlementDate.toISOString());
              }

              const { data: unpaidOrders, error: unpaidError } = await ordersQuery;

              if (unpaidError) {
                console.error(`Error cargando órdenes no liquidadas para técnico ${techId}:`, unpaidError);
              } else if (unpaidOrders) {
                const techTotal = unpaidOrders.reduce(
                  (sum, o) => sum + (o.commission_amount ?? 0),
                  0
                );
                pendingAll += techTotal;
              }
            })
          );
        }

        // Log para depuración
        console.log(`📊 AdminDashboard - Técnicos consultados: ${technicianIds.length}`);
        console.log(`💰 AdminDashboard - Total pagos pendientes (órdenes pagadas no liquidadas): ${formatCLP(pendingAll)}`);

        // Compras de la semana actual (pagadas, con proveedor)
        // ⚠️ CAMBIO: Filtrar por payout_week/payout_year para órdenes pagadas de la semana actual
        const purchases = (paidOrders || [])
          .filter(
            (r) =>
              (r.replacement_cost ?? 0) > 0 &&
              r.supplier_id &&
              r.payout_week === currentPayout.week &&
              r.payout_year === currentPayout.year
          )
          .reduce((s, r) => s + (r.replacement_cost ?? 0), 0);

        // Contar órdenes en garantía (returned o cancelled)
        const { data: warrantyOrdersData, error: warrantyError } = await supabase
          .from("orders")
          .select("id")
          .in("status", ["returned", "cancelled"]);

        if (warrantyError) {
          console.error("Error cargando órdenes en garantía:", warrantyError);
        }

        const warrantyOrders = warrantyOrdersData?.length || 0;

        setKpis({
          monthGain,
          pendingAll,
          purchases,
          warrantyOrders,
        });
      } catch (error) {
        console.error("Error general cargando KPIs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Panel del Administrador
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Supervisión y control de operaciones, pagos y proveedores
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Ganancia Total del Mes (Con Recibo)"
          value={formatCLP(kpis.monthGain)}
          icon="💰"
        />
        <KpiCard
          title="Pagos Pendientes a Técnicos"
          value={formatCLP(kpis.pendingAll)}
          icon="⏳"
        />
        <KpiCard
          title="Total Compras a Proveedores"
          value={formatCLP(kpis.purchases)}
          icon="🛒"
        />
        <KpiCard
          title="Órdenes en Garantía"
          value={kpis.warrantyOrders}
          icon="🛡️"
        />
      </div>

      <AdminReports key={refreshKey} />
    </div>
  );
}

