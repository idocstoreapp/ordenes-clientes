import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { User } from "@/types";
import { canViewFullMetrics } from "@/lib/permissions";
import KpiCard from "./KpiCard";

interface AdminDashboardProps {
  user?: User;
  onNewOrder?: () => void;
}

export default function AdminDashboard({ user, onNewOrder }: AdminDashboardProps) {
  const [kpis, setKpis] = useState({
    daySales: 0,
    monthSales: 0,
    inRepair: 0,
    readyToDeliver: 0,
    inWarranty: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Ventas del día (órdenes entregadas hoy)
        const { data: dayOrders } = await supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("updated_at", today.toISOString())
          .lte("updated_at", todayEnd.toISOString());

        const daySales = (dayOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Ventas del mes (órdenes entregadas este mes)
        const { data: monthOrders } = await supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("updated_at", monthStart.toISOString())
          .lte("updated_at", monthEnd.toISOString());

        const monthSales = (monthOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Equipos en reparación
        const { count: inRepairCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "en_proceso");

        // Equipos listos para entregar
        const { count: readyCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "por_entregar");

        // Equipos en garantía
        const { count: warrantyCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "garantia");

        setKpis({
          daySales,
          monthSales,
          inRepair: inRepairCount || 0,
          readyToDeliver: readyCount || 0,
          inWarranty: warrantyCount || 0,
        });
      } catch (error) {
        console.error("Error cargando KPIs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Administrativo</h1>
          <p className="text-slate-600">Vista general del sistema</p>
        </div>
        {onNewOrder && (
          <button
            onClick={onNewOrder}
            className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark transition-colors font-medium"
          >
            ➕ Nueva Orden
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Ventas del Día"
          value={formatCLP(kpis.daySales)}
          icon="💰"
        />
        <KpiCard
          title="Ventas del Mes"
          value={formatCLP(kpis.monthSales)}
          icon="📊"
        />
        <KpiCard
          title="En Reparación"
          value={kpis.inRepair.toString()}
          icon="🔧"
        />
        <KpiCard
          title="Listos para Entregar"
          value={kpis.readyToDeliver.toString()}
          icon="✅"
        />
        <KpiCard
          title="En Garantía"
          value={kpis.inWarranty.toString()}
          icon="🛡️"
        />
      </div>
    </div>
  );
}

