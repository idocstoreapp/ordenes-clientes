import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate, currentWeekRange, dateStringToUTCStart, dateStringToUTCEnd } from "@/lib/date";
import { formatCLP } from "@/lib/currency";
import type { Order, Supplier } from "@/types";

interface PurchaseRecord {
  id: string;
  created_at: string;
  paid_at?: string | null;
  order_number: string;
  supplier_name: string;
  supplier_id: string | null;
  replacement_cost: number;
  device: string;
  service_description: string;
}

export default function SupplierPurchases() {
  // Inicializar fechas por defecto (último mes) desde el inicio
  const getDefaultDates = () => {
    const { start, end } = currentWeekRange();
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const defaultDates = getDefaultDates();

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  
  // Filtros
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"custom" | "week" | "2days" | "15days" | "month">("week");
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);

  useEffect(() => {
    async function loadSuppliers() {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) {
        console.error("Error cargando proveedores:", error);
        setSupplierError("No pudimos cargar los proveedores. Intenta nuevamente.");
        return;
      }
      if (data) setSuppliers(data);
    }
    loadSuppliers();
  }, []);

  // Función para cargar compras (reutilizable con useCallback)
  const loadPurchases = useCallback(async () => {
    setLoading(true);
    
    // Calcular rango de fechas según el filtro seleccionado
    let dateStart: Date;
    let dateEnd: Date = new Date();
    dateEnd.setHours(23, 59, 59, 999);

    if (dateRange === "custom") {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }
      // Usar funciones helper para crear fechas UTC desde strings YYYY-MM-DD
      dateStart = dateStringToUTCStart(startDate);
      dateEnd = dateStringToUTCEnd(endDate);
    } else {
      // week (por defecto)
      const today = new Date();
      today.setDate(today.getDate() - 7);
      // Convertir a UTC para evitar problemas de zona horaria
      dateStart = new Date(Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0, 0, 0, 0
      ));
    }

    // Construir query
    // ⚠️ CAMBIO CRÍTICO: Para órdenes pagadas, usar paid_at en lugar de created_at
    // Las compras a proveedores deben contar según cuando se pagó la orden, no cuando se creó
    let query = supabase
      .from("orders")
      .select(`
        id,
        created_at,
        paid_at,
        order_number,
        replacement_cost,
        device,
        service_description,
        supplier_id,
        status,
        suppliers (
          id,
          name
        )
      `)
      .eq("status", "paid") // Solo órdenes pagadas (como en AdminDashboard)
      .gt("replacement_cost", 0) // Solo órdenes con compras a proveedores
      .not("supplier_id", "is", null) // Solo órdenes con proveedor asignado
      // ⚠️ CAMBIO: Filtrar por paid_at para órdenes pagadas (cuando fue pagada, no cuando fue creada)
      // Retrocompatibilidad: Si paid_at es null, usar created_at
      .or(`and(paid_at.gte.${dateStart.toISOString()},paid_at.lte.${dateEnd.toISOString()}),and(paid_at.is.null,created_at.gte.${dateStart.toISOString()},created_at.lte.${dateEnd.toISOString()})`)
      .order("paid_at", { ascending: false, nullsFirst: false });

    // Aplicar filtro de proveedor
    if (selectedSupplier !== "all") {
      query = query.eq("supplier_id", selectedSupplier);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading purchases:", error);
      setPurchases([]);
    } else {
      const purchasesData: PurchaseRecord[] = (data || []).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        paid_at: order.paid_at,
        order_number: order.order_number,
        supplier_name: order.suppliers?.name || "Sin proveedor",
        supplier_id: order.supplier_id,
        replacement_cost: order.replacement_cost || 0,
        device: order.device,
        service_description: order.service_description,
      }));
      setPurchases(purchasesData);
    }
    setLoading(false);
  }, [selectedSupplier, dateRange, startDate, endDate]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  // Escuchar eventos de eliminación/actualización de órdenes
  useEffect(() => {
    window.addEventListener('orderDeleted', loadPurchases);
    window.addEventListener('orderUpdated', loadPurchases);

    return () => {
      window.removeEventListener('orderDeleted', loadPurchases);
      window.removeEventListener('orderUpdated', loadPurchases);
    };
  }, [loadPurchases]);

  const filteredPurchases = useMemo(() => {
    return purchases;
  }, [purchases]);

  const totalSpent = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.replacement_cost || 0), 0);
  }, [filteredPurchases]);

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierError("Escribe un nombre antes de guardar.");
      return;
    }
    setSupplierError(null);
    setCreatingSupplier(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: newSupplierName.trim(),
        contact_info: newSupplierContact.trim() ? newSupplierContact.trim() : null,
      })
      .select()
      .maybeSingle();
    setCreatingSupplier(false);
    if (error) {
      console.error("Error creando proveedor:", error);
      setSupplierError("No pudimos crear el proveedor. Intenta nuevamente.");
      return;
    }
    if (data) {
      setSuppliers((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "es"))
      );
      setNewSupplierName("");
      setNewSupplierContact("");
      window.dispatchEvent(new CustomEvent("supplierCreated"));
    }
  }

  async function handleDeleteSupplier(id: string) {
    const confirmDelete = window.confirm(
      "¿Eliminar este proveedor? Las órdenes existentes conservarán el histórico."
    );
    if (!confirmDelete) return;
    setDeletingSupplierId(id);
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    setDeletingSupplierId(null);
    if (error) {
      console.error("Error eliminando proveedor:", error);
      setSupplierError("No pudimos eliminar el proveedor. Intenta nuevamente.");
      return;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    window.dispatchEvent(new CustomEvent("supplierDeleted"));
    loadPurchases();
  }

  const handleDateRangeChange = (range: "custom" | "2days" | "week" | "15days" | "month") => {
    setDateRange(range);
    
    if (range !== "custom") {
      const end = new Date();
      const start = new Date();
      
      if (range === "2days") {
        start.setDate(start.getDate() - 2);
      } else if (range === "week") {
        start.setDate(start.getDate() - 7);
      } else if (range === "15days") {
        start.setDate(start.getDate() - 15);
      } else if (range === "month") {
        start.setMonth(start.getMonth() - 1);
      }
      
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-end">
          <div className="text-right space-y-2">
            <div className="text-sm text-slate-600">Total gastado en el período:</div>
            <div className="text-2xl font-bold text-brand">{formatCLP(totalSpent)}</div>
            <button
              type="button"
              onClick={() => setManageOpen((prev) => !prev)}
              className="text-xs px-3 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {manageOpen ? "Ocultar gestión de proveedores" : "Gestionar proveedores"}
            </button>
          </div>
        </div>

        {manageOpen && (
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50 space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Nuevo proveedor</h4>
            <form onSubmit={handleCreateSupplier} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                placeholder="Nombre"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
              />
              <input
                type="text"
                className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                placeholder="Contacto (opcional)"
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingSupplier}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  {creatingSupplier ? "Guardando..." : "Guardar proveedor"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSupplierName("");
                    setNewSupplierContact("");
                    setSupplierError(null);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-md text-slate-600 hover:bg-white"
                >
                  Limpiar
                </button>
              </div>
            </form>
            {supplierError && <p className="text-xs text-red-600">{supplierError}</p>}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Listado</h4>
              {suppliers.length === 0 ? (
                <p className="text-xs text-slate-500">Aún no hay proveedores registrados.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-dashed border-slate-200 rounded-md">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 bg-white"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{supplier.name}</p>
                        {supplier.contact_info && (
                          <p className="text-xs text-slate-500">{supplier.contact_info}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        disabled={deletingSupplierId === supplier.id}
                        className="text-xs text-red-600 hover:text-red-500 disabled:opacity-50"
                      >
                        {deletingSupplierId === supplier.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro de Proveedor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Proveedor
            </label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="all">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Rango de Fechas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Período
            </label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as any)}
            >
              <option value="week">Semana actual</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          {dateRange === "custom" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          )}

          {/* Fecha Fin */}
          {dateRange === "custom" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}
        </div>

        {/* Mostrar rango de fechas actual */}
        {startDate && endDate && (
          <div className="text-xs text-slate-500">
            Mostrando compras desde {formatDate(startDate)} hasta {formatDate(endDate)}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">Cargando compras...</div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          No se encontraron compras en el período seleccionado
        </div>
      ) : (
        <>
          {/* Vista de Cards para Móvil */}
          <div className="lg:hidden space-y-3">
            {filteredPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">N° Orden</div>
                    <div className="text-sm font-bold text-slate-900">{purchase.order_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 mb-0.5">Costo</div>
                    <div className="text-base font-bold text-brand">{formatCLP(purchase.replacement_cost)}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mb-3">
                  {formatDate(purchase.paid_at || purchase.created_at)}
                </div>
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Proveedor</div>
                    <div className="text-sm font-medium text-slate-900">{purchase.supplier_name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Equipo y Servicio</div>
                    <div className="text-sm text-slate-700">{purchase.device}</div>
                    <div className="text-xs text-slate-600">{purchase.service_description}</div>
                  </div>
                </div>
              </div>
            ))}
            {/* Total en móvil */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-900">Total:</span>
                <span className="text-lg font-bold text-brand">{formatCLP(totalSpent)}</span>
              </div>
            </div>
          </div>

          {/* Vista de Tabla para Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="py-3 px-2 font-semibold text-slate-700">Fecha</th>
                  <th className="py-3 px-2 font-semibold text-slate-700">N° Orden</th>
                  <th className="py-3 px-2 font-semibold text-slate-700">Proveedor</th>
                  <th className="py-3 px-2 font-semibold text-slate-700">Equipo</th>
                  <th className="py-3 px-2 font-semibold text-slate-700">Servicio</th>
                  <th className="py-3 px-2 font-semibold text-slate-700 text-right">Costo Repuesto</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-2">{formatDate(purchase.paid_at || purchase.created_at)}</td>
                    <td className="py-3 px-2 font-medium text-slate-900">
                      {purchase.order_number}
                    </td>
                    <td className="py-3 px-2">{purchase.supplier_name}</td>
                    <td className="py-3 px-2 text-slate-600">{purchase.device}</td>
                    <td className="py-3 px-2 text-slate-600">
                      {purchase.service_description}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-slate-900">
                      {formatCLP(purchase.replacement_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td colSpan={5} className="py-3 px-2 font-semibold text-slate-900 text-right">
                    Total:
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-brand text-lg">
                    {formatCLP(totalSpent)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

