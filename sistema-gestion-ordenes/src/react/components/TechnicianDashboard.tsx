import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { User } from "@/types";
import { canViewFullMetrics } from "@/lib/permissions";
import KpiCard from "./KpiCard";

interface TechnicianDashboardProps {
  technicianId: string;
  isEncargado?: boolean;
  user?: User;
  onNewOrder?: () => void;
}

export default function TechnicianDashboard({ technicianId, isEncargado, user, onNewOrder }: TechnicianDashboardProps) {
  const [kpis, setKpis] = useState({
    weekOrders: 0,
    monthOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Si no tiene permisos para ver métricas completas, mostrar vacías
        if (!canViewFullMetrics(user)) {
          setKpis({
            weekOrders: 0,
            monthOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
          });
          setLoading(false);
          return;
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        // Órdenes de la semana
        const { count: weekCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .gte("created_at", weekAgo.toISOString());

        // Órdenes del mes
        const { count: monthCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .gte("created_at", monthAgo.toISOString());

        // Órdenes pendientes
        const { count: pendingCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .in("status", ["en_proceso", "por_entregar"]);

        // Órdenes completadas
        const { count: completedCount } = await supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .eq("status", "entregada");

        setKpis({
          weekOrders: weekCount || 0,
          monthOrders: monthCount || 0,
          pendingOrders: pendingCount || 0,
          completedOrders: completedCount || 0,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Órdenes Esta Semana"
          value={kpis.weekOrders.toString()}
          icon="📅"
        />
        <KpiCard
          title="Órdenes Este Mes"
          value={kpis.monthOrders.toString()}
          icon="📆"
        />
        <KpiCard
          title="Pendientes"
          value={kpis.pendingOrders.toString()}
          icon="⏳"
        />
        <KpiCard
          title="Completadas"
          value={kpis.completedOrders.toString()}
          icon="✅"
        />
      </div>
    </div>
  );
}

