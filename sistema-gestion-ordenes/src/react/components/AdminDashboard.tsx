import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { User, Branch } from "@/types";
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
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    loadBranches();
  }, []);

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

        // Base query
        let baseQuery = supabase.from("work_orders").select("*");

        // Filtrar por sucursal si se seleccionó una
        if (branchFilter !== "all") {
          baseQuery = baseQuery.eq("sucursal_id", branchFilter);
        }

        // Ventas del día (órdenes entregadas hoy) - usar created_at o updated_at cuando cambió a entregada
        let dayQuery = supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("created_at", today.toISOString())
          .lte("created_at", todayEnd.toISOString());
        
        if (branchFilter !== "all") {
          dayQuery = dayQuery.eq("sucursal_id", branchFilter);
        }

        const { data: dayOrders } = await dayQuery;
        const daySales = (dayOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Ventas del mes (órdenes entregadas este mes)
        let monthQuery = supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());
        
        if (branchFilter !== "all") {
          monthQuery = monthQuery.eq("sucursal_id", branchFilter);
        }

        const { data: monthOrders } = await monthQuery;
        const monthSales = (monthOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Equipos en reparación
        let repairQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "en_proceso");
        
        if (branchFilter !== "all") {
          repairQuery = repairQuery.eq("sucursal_id", branchFilter);
        }

        const { count: inRepairCount } = await repairQuery;

        // Equipos listos para entregar
        let readyQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "por_entregar");
        
        if (branchFilter !== "all") {
          readyQuery = readyQuery.eq("sucursal_id", branchFilter);
        }

        const { count: readyCount } = await readyQuery;

        // Equipos en garantía
        let warrantyQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "garantia");
        
        if (branchFilter !== "all") {
          warrantyQuery = warrantyQuery.eq("sucursal_id", branchFilter);
        }

        const { count: warrantyCount } = await warrantyQuery;

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
  }, [user, branchFilter]);

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

      {/* Filtro de sucursal */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Filtrar por Sucursal
        </label>
        <select
          className="w-full md:w-auto min-w-[200px] border border-slate-300 rounded-md px-3 py-2"
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

