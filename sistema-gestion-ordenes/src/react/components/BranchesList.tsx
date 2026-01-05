import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Branch, User } from "@/types";
import { formatDate } from "@/lib/date";
import { hasPermission } from "@/lib/permissions";
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

  async function handleSave(branchData: Partial<Branch> & { userEmail?: string; userPassword?: string }) {
    try {
      const { userEmail, userPassword, ...branchInfo } = branchData;
      
      // Preparar datos de actualización/inserción
      const branchUpdateData: any = {
        ...branchInfo,
        updated_at: new Date().toISOString(),
      };

      // Si se proporcionó email, guardarlo directamente en branches
      if (userEmail) {
        branchUpdateData.login_email = userEmail;
        
        // Si se proporcionó contraseña, hashearla
        if (userPassword && userPassword.trim().length > 0) {
          try {
            const hashResponse = await fetch('/api/hash-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: userPassword }),
            });
            
            if (!hashResponse.ok) {
              const errorData = await hashResponse.json().catch(() => ({}));
              throw new Error(errorData.message || 'Error al hashear la contraseña');
            }
            
            const { hash } = await hashResponse.json();
            branchUpdateData.password_hash = hash;
          } catch (hashError: any) {
            console.error("Error hasheando contraseña:", hashError);
            alert(`Error al procesar la contraseña: ${hashError.message}`);
            return;
          }
        }
        // Si no se proporcionó contraseña pero hay email y es edición, mantener el hash existente (no actualizar)
      }
      
      if (editingBranch) {
        // Actualizar sucursal
        const { error } = await supabase
          .from("branches")
          .update(branchUpdateData)
          .eq("id", editingBranch.id);

        if (error) {
          console.error("Error de Supabase:", error);
          throw error;
        }

        alert("Sucursal actualizada exitosamente");
      } else {
        // Crear nueva sucursal
        // Si no se proporcionó contraseña para nueva sucursal, requerirla
        if (userEmail && (!userPassword || userPassword.trim().length === 0)) {
          alert("Por favor ingresa una contraseña para la nueva sucursal");
          return;
        }
        
        const { data: newBranch, error } = await supabase
          .from("branches")
          .insert(branchUpdateData)
          .select()
          .single();

        if (error) {
          console.error("Error de Supabase:", error);
          throw error;
        }

        alert("Sucursal creada exitosamente");
      }

      await loadData();
      setEditingBranch(null);
      setShowForm(false);
    } catch (error: any) {
      console.error("Error guardando sucursal:", error);
      alert(`Error: ${error.message || 'Error desconocido al guardar la sucursal'}`);
    }
  }

  async function handleDelete(branchId: string, branchName: string) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la sucursal "${branchName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Verificar si hay órdenes asociadas a esta sucursal
      const { count } = await supabase
        .from("work_orders")
        .select("*", { count: "exact", head: true })
        .eq("sucursal_id", branchId);

      if (count && count > 0) {
        if (!confirm(`Esta sucursal tiene ${count} orden(es) asociada(s). ¿Deseas eliminarla de todas formas?`)) {
          return;
        }
      }

      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branchId);

      if (error) throw error;

      alert("Sucursal eliminada exitosamente");
      await loadData();
    } catch (error: any) {
      console.error("Error eliminando sucursal:", error);
      alert(`Error: ${error.message || 'Error desconocido al eliminar la sucursal'}`);
    }
  }

  // Esta función ya no se usa - las sucursales ahora tienen su propio sistema de autenticación
  // Se mantiene por compatibilidad pero no se llama
  async function handleBranchUser(branchId: string, email: string, password?: string) {
    // DEPRECATED: Las sucursales ahora usan login_email y password_hash directamente en branches
    // Esta función ya no se usa
    console.warn("handleBranchUser está deprecado - las sucursales ahora usan autenticación independiente");
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

      {showForm && (isAdmin || hasPermission(currentUser, "use_branch_panel") || (editingBranch && editingBranch.id === userBranch)) && (
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
                        <>
                          <button
                            onClick={() => {
                              setPermissionsBranch(branch);
                            }}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                          >
                            Permisos
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id, branch.name || branch.razon_social || 'Sucursal')}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </>
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
  onSave: (data: Partial<Branch> & { userEmail?: string; userPassword?: string }) => void;
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
    userEmail: "",
    userPassword: "",
  });

  // Cargar todos los datos de la sucursal cuando se edita
  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || "",
        razon_social: branch.razon_social || "",
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        userEmail: branch.login_email || "",
        userPassword: "", // No cargar contraseña por seguridad
      });
    } else {
      setFormData({
        name: "",
        razon_social: "",
        address: "",
        phone: "",
        email: "",
        userEmail: "",
        userPassword: "",
      });
    }
  }, [branch?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      alert("El nombre es obligatorio");
      return;
    }
    
    // Validar email de usuario si se proporcionó
    if (formData.userEmail && !formData.userEmail.includes("@")) {
      alert("Por favor ingresa un email válido para el usuario");
      return;
    }
    
    // Validar contraseña si es sucursal nueva (sin login_email existente)
    if (!branch?.login_email && formData.userEmail && (!formData.userPassword || formData.userPassword.length < 6)) {
      alert("La contraseña debe tener al menos 6 caracteres");
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Email de la Sucursal</label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@sucursal.com"
            />
          </div>
        </div>

        {/* Sección de Credenciales de Acceso de la Sucursal */}
        <div className="mt-6 pt-6 border-t border-slate-300">
          <h4 className="text-md font-semibold text-slate-900 mb-4">
            Credenciales de Acceso Web (Independiente de Usuarios)
          </h4>
          {branch?.login_email && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Email de acceso actual:</strong> {branch.login_email}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Las sucursales tienen su propio sistema de autenticación, separado de los usuarios del sistema.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email para Login *
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formData.userEmail}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                placeholder="sucursal@ejemplo.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Este será el email para que la sucursal inicie sesión (independiente de usuarios)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {branch?.login_email ? "Nueva Contraseña" : "Contraseña *"}
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formData.userPassword}
                onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                placeholder={branch?.login_email ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                required={!branch?.login_email}
                minLength={branch?.login_email ? undefined : 6}
              />
              <p className="text-xs text-slate-500 mt-1">
                {branch?.login_email 
                  ? "Dejar vacío si no quieres cambiar la contraseña"
                  : "Mínimo 6 caracteres. La sucursal podrá cambiarla después."
                }
              </p>
            </div>
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



