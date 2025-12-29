import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import { currentMonthRange, formatDate } from "@/lib/date";
import type { Branch, BranchExpensesSummary } from "@/types";
import SmallExpenses from "./SmallExpenses";
import GeneralExpenses from "./GeneralExpenses";
import KpiCard from "./KpiCard";

interface BranchExpensesPageProps {
  userRole: string;
  refreshKey?: number;
}

type FilterMode = "month" | "range";

export default function BranchExpensesPage({ userRole, refreshKey = 0 }: BranchExpensesPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchSummary, setBranchSummary] = useState<BranchExpensesSummary | null>(null);
  const [globalSummary, setGlobalSummary] = useState({
    total_small_expenses: 0,
    total_general_expenses: 0,
    total_repuestos: 0,
    total_pagos_tecnicos: 0,
    total_pagos_encargados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [encargadoBranchId, setEncargadoBranchId] = useState<string | null>(null);

  // Filtros de fecha
  const currentMonth = currentMonthRange();
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [dateRange, setDateRange] = useState({
    start: currentMonth.start.toISOString().split("T")[0],
    end: currentMonth.end.toISOString().split("T")[0],
  });

  const combinedRefreshKey = refreshKey + localRefreshKey;

  // Calcular fechas de filtro
  const getFilterDates = () => {
    if (filterMode === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        startDate: start,
        endDate: end,
      };
    } else {
      return {
        start: dateRange.start,
        end: dateRange.end,
        startDate: new Date(dateRange.start),
        endDate: new Date(dateRange.end + "T23:59:59"),
      };
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      loadBranches();
      loadGlobalSummary();
    } else {
      // Encargado: cargar solo su sucursal
      loadEncargadoBranch();
    }
  }, [combinedRefreshKey, userRole, filterMode, selectedMonth, dateRange]);

  useEffect(() => {
    if (userRole === "admin" && selectedBranch) {
      loadBranchSummary(selectedBranch);
    } else if (userRole === "encargado" && encargadoBranchId) {
      loadBranchSummary(encargadoBranchId);
    }
  }, [selectedBranch, encargadoBranchId, combinedRefreshKey, filterMode, selectedMonth, dateRange, userRole]);

  async function loadBranches() {
    setLoading(true);
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error cargando sucursales:", error);
    } else {
      setBranches(data || []);
      if (data && data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadEncargadoBranch() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("users")
        .select("sucursal_id")
        .eq("id", user.id)
        .single();

      if (profileData?.sucursal_id) {
        setEncargadoBranchId(profileData.sucursal_id);
        const { data: branchData } = await supabase
          .from("branches")
          .select("*")
          .eq("id", profileData.sucursal_id)
          .single();
        
        if (branchData) {
          setBranches([branchData]);
        }
      }
    } catch (err) {
      console.error("Error cargando sucursal del encargado:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGlobalSummary() {
    try {
      const { start, end } = getFilterDates();

      // Gastos hormiga (todas las sucursales) - filtrado por fecha
      const { data: smallExpenses } = await supabase
        .from("small_expenses")
        .select("monto")
        .gte("fecha", start)
        .lte("fecha", end);

      const total_small_expenses = (smallExpenses || []).reduce(
        (sum, exp) => sum + (exp.monto || 0),
        0
      );

      // Gastos generales (todas las sucursales) - filtrado por fecha
      const { data: generalExpenses } = await supabase
        .from("general_expenses")
        .select("monto")
        .gte("fecha", start)
        .lte("fecha", end);

      const total_general_expenses = (generalExpenses || []).reduce(
        (sum, exp) => sum + (exp.monto || 0),
        0
      );

      // Repuestos (de órdenes pagadas, todas las sucursales) - filtrado por paid_at del mes
      const { data: orders } = await supabase
        .from("orders")
        .select("replacement_cost, paid_at")
        .eq("status", "paid")
        .not("paid_at", "is", null)
        .gte("paid_at", start + "T00:00:00")
        .lte("paid_at", end + "T23:59:59");

      const total_repuestos = (orders || []).reduce(
        (sum, order) => sum + (order.replacement_cost || 0),
        0
      );

      // Pagos a técnicos (de salary_settlements) - filtrado por created_at del mes
      const { data: technicianSettlements } = await supabase
        .from("salary_settlements")
        .select("total_amount, created_at")
        .eq("user_role", "technician")
        .gte("created_at", start + "T00:00:00")
        .lte("created_at", end + "T23:59:59");

      const total_pagos_tecnicos = (technicianSettlements || []).reduce(
        (sum, settlement) => sum + (settlement.total_amount || 0),
        0
      );

      // Pagos a encargados (de salary_settlements) - filtrado por created_at del mes
      const { data: encargadoSettlements } = await supabase
        .from("salary_settlements")
        .select("total_amount, created_at")
        .eq("user_role", "encargado")
        .gte("created_at", start + "T00:00:00")
        .lte("created_at", end + "T23:59:59");

      const total_pagos_encargados = (encargadoSettlements || []).reduce(
        (sum, settlement) => sum + (settlement.total_amount || 0),
        0
      );

      setGlobalSummary({
        total_small_expenses,
        total_general_expenses,
        total_repuestos,
        total_pagos_tecnicos,
        total_pagos_encargados,
      });
    } catch (err) {
      console.error("Error cargando resumen global:", err);
    }
  }

  async function loadBranchSummary(branchId: string) {
    setLoadingSummary(true);
    try {
      const { start, end } = getFilterDates();

      // Gastos hormiga de la sucursal - filtrado por fecha
      const { data: smallExpenses } = await supabase
        .from("small_expenses")
        .select("monto, tipo")
        .eq("sucursal_id", branchId)
        .gte("fecha", start)
        .lte("fecha", end);

      const smallExpensesByType: Record<string, number> = {};
      (smallExpenses || []).forEach((exp) => {
        const tipo = exp.tipo || "otros";
        smallExpensesByType[tipo] = (smallExpensesByType[tipo] || 0) + (exp.monto || 0);
      });

      // Gastos generales de la sucursal - filtrado por fecha
      const { data: generalExpenses } = await supabase
        .from("general_expenses")
        .select("monto, tipo")
        .eq("sucursal_id", branchId)
        .gte("fecha", start)
        .lte("fecha", end);

      const generalExpensesByType: Record<string, number> = {};
      (generalExpenses || []).forEach((exp) => {
        const tipo = exp.tipo || "otros";
        generalExpensesByType[tipo] = (generalExpensesByType[tipo] || 0) + (exp.monto || 0);
      });

      // Repuestos de la sucursal (de órdenes pagadas) - filtrado por paid_at del mes
      const { data: orders } = await supabase
        .from("orders")
        .select("replacement_cost, paid_at")
        .eq("status", "paid")
        .eq("sucursal_id", branchId)
        .not("paid_at", "is", null)
        .gte("paid_at", start + "T00:00:00")
        .lte("paid_at", end + "T23:59:59");

      const total_repuestos = (orders || []).reduce(
        (sum, order) => sum + (order.replacement_cost || 0),
        0
      );

      // Pagos a técnicos de la sucursal - filtrado por created_at del mes
      const { data: branchTechnicians } = await supabase
        .from("users")
        .select("id")
        .eq("sucursal_id", branchId)
        .eq("role", "technician");

      const technicianIds = (branchTechnicians || []).map((u) => u.id);
      let total_pagos_tecnicos = 0;
      if (technicianIds.length > 0) {
        const { data: settlements } = await supabase
          .from("salary_settlements")
          .select("total_amount, created_at")
          .in("user_id", technicianIds)
          .gte("created_at", start + "T00:00:00")
          .lte("created_at", end + "T23:59:59");

        total_pagos_tecnicos = (settlements || []).reduce(
          (sum, s) => sum + (s.total_amount || 0),
          0
        );
      }

      // Pagos a encargados de la sucursal - filtrado por created_at del mes
      const { data: branchEncargados } = await supabase
        .from("users")
        .select("id")
        .eq("sucursal_id", branchId)
        .eq("role", "encargado");

      const encargadoIds = (branchEncargados || []).map((u) => u.id);
      let total_pagos_encargados = 0;
      if (encargadoIds.length > 0) {
        const { data: settlements } = await supabase
          .from("salary_settlements")
          .select("total_amount, created_at")
          .in("user_id", encargadoIds)
          .gte("created_at", start + "T00:00:00")
          .lte("created_at", end + "T23:59:59");

        total_pagos_encargados = (settlements || []).reduce(
          (sum, s) => sum + (s.total_amount || 0),
          0
        );
      }

      setBranchSummary({
        total_small_expenses: Object.values(smallExpensesByType).reduce((a, b) => a + b, 0),
        small_expenses_by_type: smallExpensesByType,
        total_general_expenses: Object.values(generalExpensesByType).reduce((a, b) => a + b, 0),
        general_expenses_by_type: generalExpensesByType,
        total_repuestos,
        total_pagos_tecnicos,
        total_pagos_encargados,
      });
    } catch (err) {
      console.error("Error cargando resumen de sucursal:", err);
    } finally {
      setLoadingSummary(false);
    }
  }

  const handleRefresh = () => {
    setLocalRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  const filterDates = getFilterDates();
  const filterLabel = filterMode === "month" 
    ? `Mes: ${new Date(filterDates.startDate).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}`
    : `Rango: ${formatDate(filterDates.startDate)} - ${formatDate(filterDates.endDate)}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          {userRole === "admin" 
            ? "Gestión de Sucursales y Gastos"
            : "Gastos Hormiga de tu Sucursal"}
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          {userRole === "admin"
            ? "Administra sucursales, gastos hormiga, gastos generales y visualiza KPIs por sucursal"
            : "Gestiona los gastos hormiga de tu sucursal"}
        </p>
      </div>

      {/* Filtros de Fecha (solo admin) */}
      {userRole === "admin" && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Filtros de Período</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Modo de Filtro
              </label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="w-full border border-slate-300 rounded-md px-3 py-2"
              >
                <option value="month">Por Mes</option>
                <option value="range">Por Rango de Fechas</option>
              </select>
            </div>

            {filterMode === "month" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seleccionar Mes
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <button
                onClick={() => {
                  const currentMonth = currentMonthRange();
                  setFilterMode("month");
                  setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
                  setDateRange({
                    start: currentMonth.start.toISOString().split("T")[0],
                    end: currentMonth.end.toISOString().split("T")[0],
                  });
                }}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium"
              >
                Mes Actual
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-brand-light/10 rounded-md">
            <p className="text-sm font-medium text-slate-700">
              📅 Período seleccionado: <span className="text-brand">{filterLabel}</span>
            </p>
          </div>
        </div>
      )}

      {/* KPIs Globales (solo admin) */}
      {userRole === "admin" && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Resumen Global</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <KpiCard
              title="Total Gastos Hormiga"
              value={formatCLP(globalSummary.total_small_expenses)}
              icon="🐜"
            />
            <KpiCard
              title="Total Gastos Generales"
              value={formatCLP(globalSummary.total_general_expenses)}
              icon="🏢"
            />
            <KpiCard
              title="Total Repuestos"
              value={formatCLP(globalSummary.total_repuestos)}
              icon="🔧"
            />
            <KpiCard
              title="Total Pagos Técnicos"
              value={formatCLP(globalSummary.total_pagos_tecnicos)}
              icon="👨‍🔧"
            />
            <KpiCard
              title="Total Pagos Encargados"
              value={formatCLP(globalSummary.total_pagos_encargados)}
              icon="👔"
            />
          </div>
        </div>
      )}

      {/* Selector de Sucursal (solo admin) */}
      {userRole === "admin" && branches.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seleccionar Sucursal
          </label>
          <select
            value={selectedBranch || ""}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full md:w-64 border border-slate-300 rounded-md px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {selectedBranch && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">Sucursal seleccionada:</span>{" "}
              {branches.find((b) => b.id === selectedBranch)?.name || "N/A"}
            </p>
          )}
        </div>
      )}

      {/* KPIs de Sucursal Seleccionada (solo admin) */}
      {userRole === "admin" && selectedBranch && branchSummary && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Resumen de Sucursal
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            <span className="font-medium">{branches.find((b) => b.id === selectedBranch)?.name || "N/A"}</span>
          </p>
          {loadingSummary ? (
            <p className="text-slate-600">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <KpiCard
                title="Gastos Hormiga"
                value={formatCLP(branchSummary.total_small_expenses)}
                icon="🐜"
              />
              <KpiCard
                title="Gastos Generales"
                value={formatCLP(branchSummary.total_general_expenses)}
                icon="🏢"
              />
              <KpiCard
                title="Repuestos"
                value={formatCLP(branchSummary.total_repuestos)}
                icon="🔧"
              />
              <KpiCard
                title="Pagos Técnicos"
                value={formatCLP(branchSummary.total_pagos_tecnicos)}
                icon="👨‍🔧"
              />
              <KpiCard
                title="Pagos Encargados"
                value={formatCLP(branchSummary.total_pagos_encargados)}
                icon="👔"
              />
            </div>
          )}
        </div>
      )}

      {/* Componentes de Gastos */}
      {userRole === "admin" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Gastos Hormiga */}
          {selectedBranch ? (
            <SmallExpenses
              sucursalId={selectedBranch}
              refreshKey={combinedRefreshKey}
              dateFilter={filterDates}
              userRole={userRole}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-slate-600">Selecciona una sucursal para ver gastos hormiga</p>
            </div>
          )}

          {/* Gastos Generales (solo admin) */}
          {selectedBranch ? (
            <GeneralExpenses
              sucursalId={selectedBranch}
              refreshKey={combinedRefreshKey}
              dateFilter={filterDates}
              userRole={userRole}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-slate-600">Selecciona una sucursal para ver gastos generales</p>
            </div>
          )}
        </div>
      ) : (
        // Encargado: solo puede ver/agregar gastos hormiga de su sucursal
        encargadoBranchId ? (
          <SmallExpenses
            sucursalId={encargadoBranchId}
            refreshKey={combinedRefreshKey}
            dateFilter={filterDates}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600">No tienes una sucursal asignada.</p>
          </div>
        )
      )}

      {/* Botón para refrescar */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand transition font-medium"
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
}

