import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { SmallExpense, Branch, Profile } from "@/types";

interface SmallExpensesProps {
  sucursalId: string;
  refreshKey?: number;
  dateFilter?: {
    start: string;
    end: string;
    startDate: Date;
    endDate: Date;
  };
  hideKPIs?: boolean; // Para ocultar KPIs cuando se usa desde EncargadoDashboard
  userRole?: string; // Para permitir edición/eliminación solo a admins
}

export default function SmallExpenses({ sucursalId, refreshKey = 0, dateFilter, hideKPIs = false, userRole }: SmallExpensesProps) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [localDateFilter, setLocalDateFilter] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [expenses, setExpenses] = useState<SmallExpense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SmallExpense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipo: "aseo",
    tipoPersonalizado: "",
    usarTipoPersonalizado: false,
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = userRole === "admin";

  useEffect(() => {
    loadData();
  }, [sucursalId, refreshKey, dateFilter, showAllHistory, localDateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      // Determinar qué filtro usar
      let query = supabase
        .from("small_expenses")
        .select(`
          *,
          branch:branches(*),
          user:users(id, name, email)
        `)
        .eq("sucursal_id", sucursalId);

      // Aplicar filtros de fecha
      if (!showAllHistory) {
        if (localDateFilter) {
          query = query.gte("fecha", localDateFilter.start).lte("fecha", localDateFilter.end);
        } else if (dateFilter) {
          query = query.gte("fecha", dateFilter.start).lte("fecha", dateFilter.end);
        }
      }

      const { data: expensesData, error: expensesError } = await query
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (expensesError) throw expensesError;

      // Cargar sucursales (para el selector si es necesario)
      const { data: branchesData } = await supabase
        .from("branches")
        .select("*")
        .order("name");

      setExpenses(expensesData || []);
      setBranches(branchesData || []);
    } catch (err) {
      console.error("Error cargando gastos hormiga:", err);
      setError("Error al cargar los gastos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (editingExpense) {
      await handleUpdate(e);
      return;
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const tipoFinal = formData.usarTipoPersonalizado 
        ? formData.tipoPersonalizado.trim() 
        : formData.tipo;

      if (!tipoFinal || tipoFinal.length === 0) {
        setError("Debes seleccionar o ingresar un tipo de gasto");
        return;
      }

      const { error: insertError } = await supabase
        .from("small_expenses")
        .insert({
          sucursal_id: sucursalId,
          user_id: user.id,
          tipo: tipoFinal,
          monto: parseFloat(formData.monto),
          fecha: formData.fecha,
          descripcion: formData.descripcion.trim() || null,
        });

      if (insertError) throw insertError;

      // Limpiar formulario
      setFormData({
        tipo: "aseo",
        tipoPersonalizado: "",
        usarTipoPersonalizado: false,
        monto: "",
        fecha: new Date().toISOString().split("T")[0],
        descripcion: "",
      });
      setShowForm(false);
      setEditingExpense(null);
      await loadData();
    } catch (err: any) {
      console.error("Error guardando gasto:", err);
      setError(err.message || "Error al guardar el gasto. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;

    setError(null);

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const tipoFinal = formData.usarTipoPersonalizado 
        ? formData.tipoPersonalizado.trim() 
        : formData.tipo;

      if (!tipoFinal || tipoFinal.length === 0) {
        setError("Debes seleccionar o ingresar un tipo de gasto");
        return;
      }

      const { error: updateError } = await supabase
        .from("small_expenses")
        .update({
          tipo: tipoFinal,
          monto: parseFloat(formData.monto),
          fecha: formData.fecha,
          descripcion: formData.descripcion.trim() || null,
        })
        .eq("id", editingExpense.id);

      if (updateError) throw updateError;

      setShowForm(false);
      setEditingExpense(null);
      setFormData({
        tipo: "aseo",
        tipoPersonalizado: "",
        usarTipoPersonalizado: false,
        monto: "",
        fecha: new Date().toISOString().split("T")[0],
        descripcion: "",
      });
      await loadData();
    } catch (err: any) {
      console.error("Error actualizando gasto:", err);
      setError(err.message || "Error al actualizar el gasto. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(expense: SmallExpense) {
    setEditingExpense(expense);
    const tipoEsPersonalizado = !["aseo", "mercaderia", "compras_pequenas"].includes(expense.tipo);
    setFormData({
      tipo: tipoEsPersonalizado ? "aseo" : expense.tipo,
      tipoPersonalizado: tipoEsPersonalizado ? expense.tipo : "",
      usarTipoPersonalizado: tipoEsPersonalizado,
      monto: expense.monto.toString(),
      fecha: expense.fecha,
      descripcion: expense.descripcion || "",
    });
    setShowForm(true);
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeletingExpenseId(expenseId);
    try {
      const { error: deleteError } = await supabase
        .from("small_expenses")
        .delete()
        .eq("id", expenseId);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err: any) {
      console.error("Error eliminando gasto:", err);
      setError(err.message || "Error al eliminar el gasto. Intenta nuevamente.");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  const totalByType = expenses.reduce((acc, exp) => {
    acc[exp.tipo] = (acc[exp.tipo] || 0) + exp.monto;
    return acc;
  }, {} as Record<string, number>);

  const total = expenses.reduce((sum, exp) => sum + exp.monto, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando gastos hormiga...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Gastos Hormiga</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            className={`px-3 py-2 rounded-md transition font-medium text-sm ${
              showAllHistory
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {showAllHistory ? "📅 Ver Filtrado" : "📋 Ver Todo el Historial"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition font-medium"
          >
            {showForm ? "Cancelar" : "+ Nuevo Gasto"}
          </button>
        </div>
      </div>

      {/* Filtro de fecha local (solo si showAllHistory está activo) */}
      {showAllHistory && (
        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium text-slate-700">Filtrar por rango de fechas:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={localDateFilter?.start || ""}
                onChange={(e) =>
                  setLocalDateFilter({
                    start: e.target.value,
                    end: localDateFilter?.end || e.target.value,
                  })
                }
                className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={localDateFilter?.end || ""}
                onChange={(e) =>
                  setLocalDateFilter({
                    start: localDateFilter?.start || e.target.value,
                    end: e.target.value,
                  })
                }
                className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
              />
            </div>
          </div>
          {localDateFilter && (
            <button
              onClick={() => setLocalDateFilter(null)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Gasto *
              </label>
              <div className="space-y-2">
                <select
                  value={formData.usarTipoPersonalizado ? "personalizado" : formData.tipo}
                  onChange={(e) => {
                    if (e.target.value === "personalizado") {
                      setFormData({ ...formData, usarTipoPersonalizado: true });
                    } else {
                      setFormData({ ...formData, tipo: e.target.value, usarTipoPersonalizado: false });
                    }
                  }}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="aseo">Aseo</option>
                  <option value="mercaderia">Mercadería</option>
                  <option value="compras_pequenas">Compras Pequeñas</option>
                  <option value="personalizado">+ Otro (Personalizado)</option>
                </select>
                {formData.usarTipoPersonalizado && (
                  <input
                    type="text"
                    value={formData.tipoPersonalizado}
                    onChange={(e) => setFormData({ ...formData, tipoPersonalizado: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2"
                    placeholder="Ingresa el tipo de gasto"
                    required
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monto (CLP) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                placeholder="Ej: Compra de productos de limpieza"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand transition font-medium disabled:opacity-50"
          >
            {saving ? (editingExpense ? "Actualizando..." : "Guardando...") : (editingExpense ? "Actualizar Gasto" : "Guardar Gasto")}
          </button>
        </form>
      )}

      {/* Resumen por tipo - Solo mostrar si hideKPIs es false */}
      {!hideKPIs && (
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-xs text-slate-600">Aseo</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatCLP(totalByType["aseo"] || 0)}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-xs text-slate-600">Mercadería</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatCLP(totalByType["mercaderia"] || 0)}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-xs text-slate-600">Compras Pequeñas</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatCLP(totalByType["compras_pequenas"] || 0)}
          </p>
        </div>
        <div className="bg-brand-light/10 p-3 rounded border-2 border-brand-light">
          <p className="text-xs text-slate-600">Total</p>
          <p className="text-lg font-semibold text-brand">
            {formatCLP(total)}
          </p>
        </div>
      </div>
      )}

      {/* Tabla de gastos */}
      {/* Vista de Cards para Móvil */}
      <div className="lg:hidden space-y-3">
        {expenses.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
            No hay gastos registrados
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-0.5">Fecha</div>
                  <div className="text-sm font-medium text-slate-900">{formatDate(exp.fecha)}</div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {exp.tipo === "aseo" ? "Aseo" : exp.tipo === "mercaderia" ? "Mercadería" : exp.tipo}
                </span>
              </div>
              <div className="mb-2">
                <div className="text-xs text-slate-500 mb-0.5">Descripción</div>
                <div className="text-sm text-slate-900">{exp.descripcion || "-"}</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Registrado por: <span className="text-slate-900">{(exp.user as Profile)?.name || "N/A"}</span>
                </div>
                <div className="text-base font-bold text-brand">{formatCLP(exp.monto)}</div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => handleEdit(exp)}
                    className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    disabled={deletingExpenseId === exp.id}
                    className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                  >
                    {deletingExpenseId === exp.id ? "Eliminando..." : "🗑️ Eliminar"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Vista de Tabla para Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 font-semibold text-slate-700">Fecha</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-700">Tipo</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-700">Descripción</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-700">Monto</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-700">Registrado por</th>
              {isAdmin && <th className="text-left py-2 px-2 font-semibold text-slate-700">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="text-center py-4 text-slate-500">
                  No hay gastos registrados
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2">{formatDate(exp.fecha)}</td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {exp.tipo === "aseo" ? "Aseo" : exp.tipo === "mercaderia" ? "Mercadería" : exp.tipo}
                    </span>
                  </td>
                  <td className="py-2 px-2">{exp.descripcion || "-"}</td>
                  <td className="py-2 px-2 text-right font-medium">{formatCLP(exp.monto)}</td>
                  <td className="py-2 px-2 text-xs text-slate-600">
                    {(exp.user as Profile)?.name || "N/A"}
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={deletingExpenseId === exp.id}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
                        >
                          {deletingExpenseId === exp.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


