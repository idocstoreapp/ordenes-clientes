import type { User, UserPermissions } from "@/types";

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user) return false;
  
  // Los admins tienen todos los permisos
  if (user.role === "admin") return true;
  
  // Verificar permiso específico
  return user.permissions?.[permission] === true;
}

/**
 * Verifica si un usuario puede acceder a una sección específica
 */
export function canAccessSection(user: User | null, section: string): boolean {
  if (!user) return false;
  
  // Los admins tienen acceso a todo
  if (user.role === "admin") return true;
  
  // Permisos por sección
  switch (section) {
    case "dashboard":
      // Todos pueden ver el dashboard (pero con métricas limitadas)
      return true;
    
    case "new-order":
      // Por defecto todos pueden crear órdenes (permiso básico)
      return hasPermission(user, "create_orders") !== false;
    
    case "orders":
      // Por defecto todos pueden ver órdenes (pero filtradas)
      return true;
    
    case "customers":
      // Solo si tiene permiso explícito
      return hasPermission(user, "view_all_business_orders") === true;
    
    case "branches":
      // Solo pueden ver/editar su propia sucursal si tienen permiso
      return hasPermission(user, "use_branch_panel") === true;
    
    case "users":
      // Solo admin
      return false;
    
    case "reports":
      // Solo si tiene permiso
      return hasPermission(user, "use_statistics_panel") === true;
    
    case "settings":
      // Solo admin
      return false;
    
    case "security":
      // Solo admin
      return false;
    
    default:
      return false;
  }
}

/**
 * Obtiene los permisos por defecto para un nuevo usuario
 */
export function getDefaultPermissions(): UserPermissions {
  return {
    create_orders: true, // Por defecto pueden crear órdenes
    modify_orders: true, // Por defecto pueden editar órdenes
    // Todos los demás permisos son false por defecto
  };
}

/**
 * Verifica si un usuario puede ver métricas completas en el dashboard
 */
export function canViewFullMetrics(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return hasPermission(user, "use_statistics_panel") === true || 
         hasPermission(user, "use_admin_panel") === true;
}

