import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { Branch, BranchExpensesSummary } from "@/types";
import SmallExpenses from "./SmallExpenses";
import GeneralExpenses from "./GeneralExpenses";
import KpiCard from "./KpiCard";

export default function BranchManagement() {
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadBranches();
    loadGlobalSummary();
  }, [refreshKey]);

  useEffect(() => {
    if (selectedBranch) {
      loadBranchSummary(selectedBranch);
    }
  }, [selectedBranch, refreshKey]);

  async function loadBranches() {
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

  async function loadGlobalSummary() {
    try {
      // Total gastos hormiga (todas las sucursales)
      const { data: smallExpenses } = await supabase
        .from("small_expenses")
        .select("monto");

      const total_small_expenses = (smallExpenses || []).reduce((sum, exp) => sum + (exp.monto || 0), 0);

      // Total gastos generales (todas las sucursales)
      const { data: generalExpenses } = await supabase
        .from("general_expenses")
        .select("monto");

      const total_general_expenses = (generalExpenses || []).reduce((sum, exp) => sum + (exp.monto || 0), 0);

      // Total repuestos (de órdenes pagadas)
      const { data: orders } = await supabase
        .from("orders")
        .select("replacement_cost")
        .eq("status", "paid");

      const total_repuestos = (orders || []).reduce((sum, order) => sum + (order.replacement_cost || 0), 0);

      // Total pagos a técnicos (de salary_settlements)
      const { data: settlements } = await supabase
        .from("salary_settlements")
        .select("amount, technician_id");

      const total_pagos_tecnicos = (settlements || []).reduce((sum, settlement) => sum + (settlement.amount || 0), 0);

      // Total pagos a encargados (asumiendo que también están en salary_settlements o users con role encargado)
      // Por ahora, lo dejamos en 0 o puedes agregar lógica específica
      const total_pagos_encargados = 0;

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
      const branch = branches.find(b => b.id === branchId);
      if (!branch) return;

      // Gastos hormiga de la sucursal
      const { data: smallExpenses } = await supabase
        .from("small_expenses")
        .select("monto")
        .eq("sucursal_id", branchId);

      const total_small_expenses = (smallExpenses || []).reduce((sum, exp) => sum + (exp.monto || 0), 0);

      // Gastos generales de la sucursal
      const { data: generalExpenses } = await supabase
        .from("general_expenses")
        .select("monto")
        .eq("sucursal_id", branchId);

      const total_general_expenses = (generalExpenses || []).reduce((sum, exp) => sum + (exp.monto || 0), 0);

      // Repuestos de la sucursal (de órdenes pagadas)
      const { data: orders } = await supabase
        .from("orders")
        .select("replacement_cost")
        .eq("status", "paid")
        .eq("sucursal_id", branchId);

      const total_repuestos = (orders || []).reduce((sum, order) => sum + (order.replacement_cost || 0), 0);

      // Pagos a técnicos de la sucursal
      const { data: technicians } = await supabase
        .from("users")
        .select("id")
        .eq("role", "technician")
        .eq("sucursal_id", branchId);

      const technicianIds = (technicians || []).map(t => t.id);

      let total_pagos_tecnicos = 0;
      if (technicianIds.length > 0) {
        const { data: settlements } = await supabase
          .from("salary_settlements")
          .select("amount")
          .in("technician_id", technicianIds);

        total_pagos_tecnicos = (settlements || []).reduce((sum, settlement) => sum + (settlement.amount || 0), 0);
      }

      // Pagos a encargados de la sucursal
      const total_pagos_encargados = 0; // Por ahora 0, puedes agregar lógica específica

      setBranchSummary({
        branch_id: branchId,
        branch_name: branch.name,
        total_small_expenses,
        total_general_expenses,
        total_repuestos,
        total_pagos_tecnicos,
        total_pagos_encargados,
        total_general: total_small_expenses + total_general_expenses + total_repuestos + total_pagos_tecnicos + total_pagos_encargados,
      });
    } catch (err) {
      console.error("Error cargando resumen de sucursal:", err);
    } finally {
      setLoadingSummary(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando sucursales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Globales */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Resumen Global de Gastos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            icon="👷"
          />
          <KpiCard
            title="Total Pagos Encargados"
            value={formatCLP(globalSummary.total_pagos_encargados)}
            icon="👔"
          />
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-slate-700">Total General:</span>
            <span className="text-2xl font-bold text-brand">
              {formatCLP(
                globalSummary.total_small_expenses +
                globalSummary.total_general_expenses +
                globalSummary.total_repuestos +
                globalSummary.total_pagos_tecnicos +
                globalSummary.total_pagos_encargados
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Selector de Sucursal */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Seleccionar Sucursal
        </label>
        <select
          value={selectedBranch || ""}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full md:w-auto border border-slate-300 rounded-md px-4 py-2"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs de Sucursal Seleccionada */}
      {selectedBranch && branchSummary && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Resumen de {branchSummary.branch_name}
            </h2>
            {loadingSummary ? (
              <p className="text-slate-600">Cargando resumen...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  icon="👷"
                />
                <KpiCard
                  title="Pagos Encargados"
                  value={formatCLP(branchSummary.total_pagos_encargados)}
                  icon="👔"
                />
              </div>
            )}
            {branchSummary && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-700">Total de la Sucursal:</span>
                  <span className="text-2xl font-bold text-brand">
                    {formatCLP(branchSummary.total_general)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Gastos Hormiga de la Sucursal */}
          <SmallExpenses sucursalId={selectedBranch} refreshKey={refreshKey} />

          {/* Gastos Generales de la Sucursal */}
          <GeneralExpenses sucursalId={selectedBranch} refreshKey={refreshKey} />
        </>
      )}

      {/* Botón para refrescar */}
      <div className="flex justify-end">
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand transition font-medium"
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
}








