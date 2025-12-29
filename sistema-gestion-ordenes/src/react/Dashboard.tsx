import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";
import { getSystemSettings, type LogoConfig } from "@/lib/settings";
import { canAccessSection } from "@/lib/permissions";
import Sidebar, { type DashboardSection } from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import TechnicianDashboard from "./components/TechnicianDashboard";
import OrdersTable from "./components/OrdersTable";
import OrderForm from "./components/OrderForm";
import CustomersList from "./components/CustomersList";
import BranchesList from "./components/BranchesList";
import UsersList from "./components/UsersList";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import SecuritySettings from "./components/SecuritySettings";

function Header({ 
  userName, 
  userRole, 
  onMenuToggle 
}: { 
  userName: string; 
  userRole: string;
  onMenuToggle?: () => void;
}) {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({ url: "/logo.png", width: 128, height: 128 });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    async function loadLogo() {
      try {
        const settings = await getSystemSettings();
        // Si la URL es relativa, asegurarse de que empiece con /
        let logoUrl = settings.header_logo.url;
        if (!logoUrl.startsWith("http") && !logoUrl.startsWith("data:") && !logoUrl.startsWith("/")) {
          logoUrl = "/" + logoUrl;
        }
        setLogoConfig({ ...settings.header_logo, url: logoUrl });
        setLogoError(false);
      } catch (error) {
        console.error("Error cargando logo:", error);
        // Usar logo por defecto
        setLogoConfig({ url: "/logo.png", width: 128, height: 128 });
      }
    }
    loadLogo();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const hasSidebar = userRole === "admin" || userRole === "encargado" || userRole === "technician" || userRole === "recepcionista";

  return (
    <header className="bg-brand shadow-lg border-b-2 border-brand-light fixed top-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2 sm:gap-4">
            {hasSidebar && onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden text-white p-2 hover:bg-brand-light rounded-md transition-colors"
                aria-label="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <img 
              src={logoConfig.url} 
              alt="IDoc STORE Logo" 
              style={{
                width: `${logoConfig.width}px`,
                height: `${logoConfig.height}px`,
                objectFit: 'contain'
              }}
            />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-white">
                Sistema de Gestión de Órdenes
              </h1>
              <p className="text-xs text-white">
                {userName} • {userRole === "admin" ? "Administrador" : userRole === "encargado" ? "Encargado" : userRole === "recepcionista" ? "Recepcionista" : "Técnico"}
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-sm font-bold text-white truncate max-w-[150px]">
                {userName}
              </h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-brand-light border-2 border-brand-light rounded-md hover:bg-white hover:text-brand transition-colors whitespace-nowrap"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<DashboardSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        window.location.href = "/login";
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (userData) {
        setUser(userData);
      } else {
        window.location.href = "/login";
      }
      
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    // Verificar permisos antes de renderizar
    if (!canAccessSection(user, section)) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg mb-2">Acceso Denegado</p>
            <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
            <button
              onClick={() => setSection("dashboard")}
              className="mt-4 px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      );
    }

    switch (section) {
      case "dashboard":
        if (user.role === "admin") {
          return <AdminDashboard user={user} onNewOrder={() => setSection("new-order")} />;
        } else {
          return <TechnicianDashboard technicianId={user.id} isEncargado={user.role === "encargado"} user={user} onNewOrder={() => setSection("new-order")} />;
        }
      case "new-order":
        return <OrderForm technicianId={user.id} onSaved={() => setSection("orders")} />;
      case "orders":
        // Solo admin tiene isAdmin=true, los demás usuarios (incluido encargado/tienda) no son admin
        // Admin puede ver todas las órdenes, usuarios de sucursal solo ven las de su sucursal
        return <OrdersTable technicianId={user.role === "admin" ? undefined : user.id} isAdmin={user.role === "admin"} user={user} onNewOrder={() => setSection("new-order")} />;
      case "customers":
        return <CustomersList user={user} />;
      case "branches":
        return <BranchesList currentUser={user} />;
      case "users":
        return <UsersList />;
      case "reports":
        return <Reports user={user} />;
      case "settings":
        return <Settings />;
      case "security":
        return <SecuritySettings />;
      default:
        return <AdminDashboard user={user} onNewOrder={() => setSection("new-order")} />;
    }
  };

  // Mostrar sidebar si tiene acceso a alguna sección además del dashboard
  const showSidebar = user.role === "admin" || 
    canAccessSection(user, "new-order") || 
    canAccessSection(user, "orders") || 
    canAccessSection(user, "customers") || 
    canAccessSection(user, "branches") || 
    canAccessSection(user, "reports");

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <Header 
        userName={user.name} 
        userRole={user.role}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex">
        {showSidebar && (
          <Sidebar
            user={user}
            currentSection={section}
            onSectionChange={setSection}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        
        <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''} p-4 sm:p-6 lg:p-8`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

