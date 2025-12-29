import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { currentWeekRange, dateToUTCStart, dateToUTCEnd } from "@/lib/date";
import { getCurrentPayoutWeek } from "@/lib/payoutWeek";
import type { Profile, Branch } from "@/types";
import SmallExpenses from "./SmallExpenses";
import TechnicianPayments from "./TechnicianPayments";
import OrdersTable from "./OrdersTable";

export default function EncargadoDashboard() {
  const [me, setMe] = useState<Profile | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState<"expenses" | "payments" | "orders">("expenses");

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar perfil del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setMe(profileData as Profile);
        console.log("👤 [EncargadoDashboard] Perfil cargado:", {
          id: profileData.id,
          name: profileData.name,
          role: profileData.role,
          sucursal_id: profileData.sucursal_id
        });

        // Cargar sucursal
        if (profileData.sucursal_id) {
          const { data: branchData, error: branchError } = await supabase
            .from("branches")
            .select("*")
            .eq("id", profileData.sucursal_id)
            .single();

          if (branchError) {
            console.error("❌ [EncargadoDashboard] Error cargando sucursal:", branchError);
          }

          if (branchData) {
            console.log("🏢 [EncargadoDashboard] Sucursal cargada:", branchData);
            setBranch(branchData as Branch);
          } else {
            console.warn("⚠️ [EncargadoDashboard] No se encontró la sucursal con ID:", profileData.sucursal_id);
          }
        } else {
          console.warn("⚠️ [EncargadoDashboard] El encargado no tiene sucursal_id asignado");
        }
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!me || !branch) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded">
          <p className="font-semibold">⚠️ Configuración incompleta</p>
          <p className="text-sm mt-1">
            No tienes una sucursal asignada. Contacta al administrador para que te asigne una sucursal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Panel del Encargado
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          {branch.name} • Gestión de tu sucursal
        </p>
      </div>

      {/* Navegación por secciones */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection("expenses")}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition font-medium ${
              activeSection === "expenses"
                ? "bg-brand-light text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            🐜 Gastos Hormiga
          </button>
          <button
            onClick={() => setActiveSection("payments")}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition font-medium ${
              activeSection === "payments"
                ? "bg-brand-light text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            💵 Pago a Técnicos
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition font-medium ${
              activeSection === "orders"
                ? "bg-brand-light text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            🔧 Historial de Órdenes
          </button>
        </div>
      </div>

      {/* Contenido según sección activa */}
      {activeSection === "expenses" && (
        <SmallExpenses sucursalId={branch.id} refreshKey={refreshKey} hideKPIs={true} />
      )}

      {activeSection === "payments" && (
        <TechnicianPaymentsForBranch 
          branchId={branch.id} 
          refreshKey={refreshKey} 
        />
      )}

      {activeSection === "orders" && (
        <OrdersTableForBranch 
          branchId={branch.id} 
          refreshKey={refreshKey} 
        />
      )}

      {/* Botón para refrescar */}
      <div className="flex justify-end">
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-brand-light text-white rounded-md hover:bg-brand transition font-medium"
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
}

// Componente para pagos a técnicos filtrado por sucursal
function TechnicianPaymentsForBranch({ branchId, refreshKey }: { branchId: string; refreshKey: number }) {
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnicians();
  }, [branchId, refreshKey]);

  async function loadTechnicians() {
    setLoading(true);
    try {
      console.log("🔍 [EncargadoDashboard] Cargando técnicos para sucursal:", branchId);
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "technician")
        .eq("sucursal_id", branchId)
        .order("name");

      if (error) {
        console.error("❌ [EncargadoDashboard] Error en consulta:", error);
        throw error;
      }
      
      console.log("✅ [EncargadoDashboard] Técnicos encontrados:", data?.length || 0, data);
      setTechnicians(data || []);
    } catch (err) {
      console.error("❌ [EncargadoDashboard] Error cargando técnicos:", err);
      // Mostrar error más detallado al usuario
      if (err instanceof Error) {
        console.error("Detalles del error:", err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando técnicos...</p>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <p className="text-amber-800 font-semibold mb-2">⚠️ No se encontraron técnicos</p>
          <p className="text-amber-700 text-sm mb-2">
            No hay técnicos asignados a la sucursal con ID: <code className="bg-amber-100 px-1 rounded">{branchId}</code>
          </p>
          <p className="text-amber-600 text-xs">
            Verifica que:
            <br />• Los técnicos tengan una sucursal asignada en "Gestión de Usuarios"
            <br />• La sucursal del encargado coincida con la de los técnicos
            <br />• Abre la consola del navegador (F12) para ver más detalles
          </p>
        </div>
      </div>
    );
  }

  // Usar el componente TechnicianPayments pero filtrando solo técnicos de esta sucursal
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Pago a Técnicos de tu Sucursal
      </h2>
      <TechnicianPayments 
        refreshKey={refreshKey} 
        branchId={branchId}
        technicianIds={technicians.map(t => t.id)}
      />
    </div>
  );
}

// Componente para órdenes filtradas por sucursal con lógica de semana de pago
function OrdersTableForBranch({ branchId, refreshKey }: { branchId: string; refreshKey: number }) {
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);

  useEffect(() => {
    loadTechnicians();
  }, [branchId, refreshKey]);

  async function loadTechnicians() {
    try {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("role", "technician")
        .eq("sucursal_id", branchId);
      
      if (data) {
        setTechnicianIds(data.map(t => t.id));
      }
    } catch (err) {
      console.error("Error cargando técnicos para órdenes:", err);
    }
  }

  // Calcular filtro de semana de pago (sábado a viernes)
  const currentPayout = getCurrentPayoutWeek();
  const { start, end } = currentWeekRange();
  // Convertir fechas a UTC para evitar problemas de zona horaria
  const weekStartUTC = dateToUTCStart(start);
  const weekEndUTC = dateToUTCEnd(end);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Historial de Órdenes de tu Sucursal
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Mostrando órdenes de la semana actual (sábado a viernes): {start.toLocaleDateString('es-CL')} - {end.toLocaleDateString('es-CL')}
      </p>
      <OrdersTable 
        isAdmin={false}
        branchId={branchId}
        technicianIds={technicianIds}
        refreshKey={refreshKey}
        weekFilter={{
          payoutWeek: currentPayout.week,
          payoutYear: currentPayout.year,
          weekStart: weekStartUTC,
          weekEnd: weekEndUTC
        }}
      />
    </div>
  );
}


