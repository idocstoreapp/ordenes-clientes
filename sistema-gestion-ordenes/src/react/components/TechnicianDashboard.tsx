import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { User } from "@/types";
import KpiCard from "./KpiCard";

interface TechnicianDashboardProps {
  technicianId: string;
  isEncargado?: boolean;
  user?: User;
  onNewOrder?: () => void;
}

export default function TechnicianDashboard({ technicianId, isEncargado, user, onNewOrder }: TechnicianDashboardProps) {
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
        // Obtener sucursal_id del usuario
        const sucursalId = user?.sucursal_id;

        // Si no tiene sucursal_id, no mostrar datos
        if (!sucursalId) {
          setKpis({
            daySales: 0,
            monthSales: 0,
            inRepair: 0,
            readyToDeliver: 0,
            inWarranty: 0,
          });
          setLoading(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Ventas del día (órdenes entregadas hoy de esta sucursal)
        const { data: dayOrders } = await supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .eq("sucursal_id", sucursalId)
          .gte("created_at", today.toISOString())
          .lte("created_at", todayEnd.toISOString());

        const daySales = (dayOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Ventas del mes (órdenes entregadas este mes de esta sucursal)
        const { data: monthOrders } = await supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .eq("sucursal_id", sucursalId)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const monthSales = (monthOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Equipos en reparación de esta sucursal
        const { count: inRepairCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "en_proceso")
          .eq("sucursal_id", sucursalId);

        // Equipos listos para entregar de esta sucursal
        const { count: readyCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "por_entregar")
          .eq("sucursal_id", sucursalId);

        // Equipos en garantía de esta sucursal
        const { count: warrantyCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "garantia")
          .eq("sucursal_id", sucursalId);

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
  }, [technicianId, user]);

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isEncargado ? "Dashboard de Encargado" : "Mi Dashboard"}
          </h1>
          <p className="text-slate-600">Resumen de tus órdenes</p>
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

