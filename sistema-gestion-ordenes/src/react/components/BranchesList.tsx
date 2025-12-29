import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Branch, User } from "@/types";
import { formatDate } from "@/lib/date";
import BranchPermissionsModal from "./BranchPermissionsModal";

interface BranchesListProps {
  currentUser?: User;
}

export default function BranchesList({ currentUser }: BranchesListProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [permissionsBranch, setPermissionsBranch] = useState<Branch | null>(null);
  
  const isAdmin = currentUser?.role === "admin";
  const userBranch = currentUser?.sucursal_id;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar sucursales
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .order("name");

      if (branchesError) throw branchesError;

      // Filtrar sucursales según permisos
      let filteredBranches = branchesData || [];
      if (!isAdmin && userBranch) {
        filteredBranches = filteredBranches.filter((b) => b.id === userBranch);
      }

      setBranches(filteredBranches);

      // Cargar usuarios si es admin
      if (isAdmin) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("*")
          .order("email");

        if (usersError) throw usersError;
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(branchData: Partial<Branch>) {
    try {
      if (editingBranch) {
        // Actualizar
        const { error } = await supabase
          .from("branches")
          .update({
            ...branchData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBranch.id);

        if (error) throw error;
        alert("Sucursal actualizada exitosamente");
      } else {
        // Crear nueva
        const { error } = await supabase
          .from("branches")
          .insert(branchData);

        if (error) throw error;
        alert("Sucursal creada exitosamente");
      }

      await loadData();
      setEditingBranch(null);
      setShowForm(false);
    } catch (error: any) {
      console.error("Error guardando sucursal:", error);
      alert(`Error: ${error.message}`);
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-900">Sucursales</h2>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingBranch(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
          >
            ➕ Nueva Sucursal
          </button>
        )}
      </div>

      {showForm && (isAdmin || (editingBranch && editingBranch.id === userBranch)) && (
        <BranchForm
          branch={editingBranch}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingBranch(null);
          }}
          isAdmin={isAdmin}
        />
      )}

      {branches.length === 0 ? (
        <p className="text-slate-600 text-center py-8">No hay sucursales registradas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Razón Social</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{branch.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{branch.razon_social || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{branch.address || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{branch.phone || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{branch.email || "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setShowForm(true);
                        }}
                        className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark"
                      >
                        Editar
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setPermissionsBranch(branch);
                          }}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                          Permisos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {permissionsBranch && isAdmin && (
        <BranchPermissionsModal
          branch={permissionsBranch}
          users={users}
          onClose={() => setPermissionsBranch(null)}
          onSave={loadData}
        />
      )}
    </div>
  );
}

interface BranchFormProps {
  branch: Branch | null;
  onSave: (data: Partial<Branch>) => void;
  onCancel: () => void;
  isAdmin: boolean;
}

function BranchForm({ branch, onSave, onCancel, isAdmin }: BranchFormProps) {
  const [formData, setFormData] = useState({
    name: branch?.name || "",
    razon_social: branch?.razon_social || "",
    address: branch?.address || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      alert("El nombre es obligatorio");
      return;
    }
    onSave(formData);
  }

  return (
    <div className="mb-6 p-4 border border-slate-200 rounded-md bg-slate-50">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {branch ? "Editar Sucursal" : "Nueva Sucursal"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={!isAdmin && !!branch}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.razon_social}
              onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input
              type="tel"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
          >
            {branch ? "Actualizar" : "Crear"} Sucursal
          </button>
        </div>
      </form>
    </div>
  );
}



