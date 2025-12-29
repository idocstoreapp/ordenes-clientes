import { useState } from "react";
import type { User } from "@/types";
import { hasPermission } from "@/lib/permissions";

interface ReportsProps {
  user?: User;
}

export default function Reports({ user }: ReportsProps) {
  if (!hasPermission(user, "use_statistics_panel")) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg mb-2">Acceso Denegado</p>
          <p className="text-slate-500">No tienes permisos para acceder a los reportes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Reportes</h2>
      <div className="text-center py-12">
        <p className="text-slate-600 text-lg mb-4">Módulo de Reportes</p>
        <p className="text-slate-500">Esta funcionalidad estará disponible próximamente.</p>
        <p className="text-slate-500 mt-2">
          Aquí podrás generar reportes de ventas, órdenes, clientes y más.
        </p>
      </div>
    </div>
  );
}



