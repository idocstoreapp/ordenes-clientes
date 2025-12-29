import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import WeeklySummary from "./components/WeeklySummary";
import OrderForm from "./components/OrderForm";
import OrdersTable from "./components/OrdersTable";
import WeeklyReport from "./components/WeeklyReport";
import AdminDashboard from "./components/AdminDashboard";
import EncargadoDashboard from "./components/EncargadoDashboard";
import Sidebar, { type DashboardSection } from "./components/Sidebar";
import BranchExpensesPage from "./components/BranchExpensesPage";
import AdminReports from "./components/AdminReports";
import SupplierPurchases from "./components/SupplierPurchases";
import UserManagement from "./components/UserManagement";
import TechnicianPayments from "./components/TechnicianPayments";
import Footer from "./components/Footer";

// Componente helper para órdenes del encargado
function OrdersTableForEncargado({ me }: { me: Profile }) {
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranch() {
      if (me.sucursal_id) {
        setBranchId(me.sucursal_id);
      }
      setLoading(false);
    }
    loadBranch();
  }, [me]);

  if (loading || !branchId) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  return (
    <OrdersTable isAdmin={false} branchId={branchId} />
  );
}

function Header({ 
  userName, 
  userRole, 
  onMenuToggle 
}: { 
  userName: string; 
  userRole: string;
  onMenuToggle?: () => void;
}) {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const hasSidebar = userRole === "admin" || userRole === "encargado";

  return (
    <header className="bg-brand shadow-lg border-b-2 border-brand-light fixed top-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Botón hamburguesa para móvil */}
            {hasSidebar && onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden text-brand-white p-2 hover:bg-brand-light rounded-md transition-colors"
                aria-label="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <img 
              src="/logo.png" 
              alt="IDocStore Logo" 
              className="h-24 sm:h-32 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-brand-white">
                Registro de Servicios
              </h1>
              <p className="text-xs text-brand-white">
                {userName} • {userRole === "admin" ? "Administrador" : userRole === "encargado" ? "Encargado" : "Técnico"}
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-sm font-bold text-brand-white truncate max-w-[150px]">
                {userName}
              </h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-brand-white bg-brand-light border-2 border-brand-light rounded-md hover:bg-white hover:text-brand transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function TechnicalView({ me }: { me: Profile }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Dashboard - {me.name}
        </h1>
        <p className="text-sm sm:text-base text-slate-600">Técnico Especialista</p>
      </div>

      <WeeklySummary technicianId={me.id} refreshKey={refreshKey} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <OrderForm
          technicianId={me.id}
          onSaved={() => setRefreshKey((x) => x + 1)}
        />
        <WeeklyReport technicianId={me.id} refreshKey={refreshKey} userRole={me.role} />
      </div>

      <OrdersTable 
        key={refreshKey} 
        technicianId={me.id} 
        onUpdate={() => setRefreshKey((x) => x + 1)} 
      />
    </div>
  );
}

export default function Dashboard() {
  const [me, setMe] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<DashboardSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        const user = data.user;
        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error al cargar perfil:", profileError);
          console.error("Detalles del error:", {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
          });
          throw profileError;
        }

        if (!profile) {
          console.error("Usuario autenticado pero sin perfil:", {
            userId: user.id,
            userEmail: user.email,
          });
          setErrorMsg(
            `No encontramos tu perfil en la tabla 'users'. Tu ID de Authentication es: ${user.id}. Verifica en Supabase que existe un registro en la tabla 'users' con este mismo ID.`
          );
          return;
        }

        setMe(profile as Profile);
      } catch (err) {
        console.error("Error cargando el perfil:", err);
        setErrorMsg("No pudimos cargar tu sesión. Revisa la consola y tus credenciales.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand border-t-transparent mx-auto mb-4"></div>
        <p className="text-slate-600">Cargando...</p>
      </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-lg text-center space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Sesión incompleta</h2>
          <p className="text-slate-600">
            {errorMsg ??
              "No encontramos la información de tu usuario. Verifica que tengas un perfil con rol asignado en la base de datos."}
          </p>
          <button
            className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition font-medium"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  const hasSidebar = me.role === "admin" || me.role === "encargado";

  const renderContent = () => {
    if (!hasSidebar) {
      return <TechnicalView me={me} />;
    }

    switch (currentSection) {
      case "dashboard":
        return me.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <EncargadoDashboard />
        );
      case "reports":
        return me.role === "admin" ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Reportes Administrativos
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Visualiza reportes semanales y mensuales de operaciones
              </p>
            </div>
            <AdminReports />
          </div>
        ) : null;
      case "suppliers":
        return me.role === "admin" ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Compra a Proveedores
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Gestiona y consulta las compras realizadas a proveedores
              </p>
            </div>
            <SupplierPurchases />
          </div>
        ) : null;
      case "users":
        return me.role === "admin" ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Gestión de Usuarios
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Administra técnicos y administradores del sistema
              </p>
            </div>
            <UserManagement />
          </div>
        ) : null;
      case "payments":
        return me.role === "admin" ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Pago a Técnicos
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Gestiona pagos, liquidaciones y ajustes de sueldo de técnicos
              </p>
            </div>
            <TechnicianPayments />
          </div>
        ) : null;
      case "orders":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Órdenes de Reparación
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                {me.role === "admin" 
                  ? "Visualiza todas las órdenes del sistema"
                  : "Visualiza las órdenes de tu sucursal"}
              </p>
            </div>
            {me.role === "admin" ? (
              <OrdersTable isAdmin={true} />
            ) : (
              <OrdersTableForEncargado me={me} />
            )}
          </div>
        );
      case "branches":
        return (
          <BranchExpensesPage userRole={me.role} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        userName={me.name} 
        userRole={me.role}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex pt-20">
        {hasSidebar && (
          <Sidebar
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
            userRole={me.role}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main className={`flex-1 w-full ${hasSidebar ? 'lg:ml-64' : ''}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 flex flex-col min-h-[calc(100vh-5rem)]">
            {renderContent()}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

