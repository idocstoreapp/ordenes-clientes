import { useEffect } from "react";

export type DashboardSection = 
  | "dashboard" 
  | "new-order" 
  | "orders" 
  | "customers"
  | "branches"
  | "users"
  | "reports"
  | "settings"
  | "security";

interface SidebarProps {
  userRole: string;
  currentSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  userRole,
  currentSection,
  onSectionChange,
  isOpen,
  onClose,
}: SidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuItems: Array<{
    id: DashboardSection;
    label: string;
    icon: string;
    roles: string[];
  }> = [
    { id: "dashboard", label: "Dashboard", icon: "📊", roles: ["admin", "technician", "encargado", "recepcionista"] },
    { id: "new-order", label: "Nueva Orden", icon: "➕", roles: ["admin", "technician"] },
    { id: "orders", label: "Órdenes", icon: "📋", roles: ["admin", "technician", "encargado", "recepcionista"] },
    { id: "customers", label: "Clientes", icon: "👥", roles: ["admin", "technician", "recepcionista"] },
    { id: "branches", label: "Sucursales", icon: "🏢", roles: ["admin"] },
    { id: "users", label: "Usuarios", icon: "👤", roles: ["admin"] },
    { id: "reports", label: "Reportes", icon: "📈", roles: ["admin"] },
    { id: "settings", label: "Configuración", icon: "⚙️", roles: ["admin"] },
    { id: "security", label: "Seguridad", icon: "🔒", roles: ["admin"] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-20 left-0 h-[calc(100vh-5rem)] w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="p-4 space-y-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                currentSection === item.id
                  ? "bg-brand-light text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}



