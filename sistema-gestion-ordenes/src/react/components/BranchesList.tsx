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
      
      if (editingBranch) {
        // Actualizar sucursal
        const { error } = await supabase
          .from("branches")
          .update({
            ...branchInfo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBranch.id);

        if (error) throw error;

        // Si se proporcionó email de usuario, crear o actualizar usuario
        if (userEmail) {
          await handleBranchUser(editingBranch.id, userEmail, userPassword || undefined);
        }

        alert("Sucursal actualizada exitosamente");
      } else {
        // Crear nueva sucursal
        const { data: newBranch, error } = await supabase
          .from("branches")
          .insert(branchInfo)
          .select()
          .single();

        if (error) throw error;

        // Si se proporcionó email de usuario, crear usuario
        if (newBranch && userEmail) {
          await handleBranchUser(newBranch.id, userEmail, userPassword || undefined);
        }

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

  async function handleBranchUser(branchId: string, email: string, password?: string) {
    if (!supabaseAdmin) {
      console.error("SupabaseAdmin no disponible");
      return;
    }

    try {
      // Buscar si ya existe un usuario para esta sucursal
      const { data: existingUsers } = await supabase
        .from("users")
        .select("id, email")
        .eq("sucursal_id", branchId)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        // Actualizar usuario existente
        const existingUser = existingUsers[0];
        
        // Actualizar email en auth si cambió
        if (existingUser.email !== email) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            email: email,
            email_confirm: true,
          });
        }

        // Actualizar contraseña si se proporcionó
        if (password && password.length >= 6) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: password,
          });
        }

        // Actualizar en tabla users
        await supabase
          .from("users")
          .update({
            email: email,
            sucursal_id: branchId,
          })
          .eq("id", existingUser.id);

        console.log("Usuario actualizado exitosamente");
      } else {
        // Crear nuevo usuario
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password || "TempPassword123!", // Contraseña temporal si no se proporciona
          email_confirm: true,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario en auth");

        // Crear registro en tabla users con permisos por defecto
        const { error: userError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
            email: email,
            name: `Usuario ${branchId.substring(0, 8)}`, // Nombre temporal
            role: "encargado", // Rol por defecto para usuarios de sucursal
            sucursal_id: branchId,
            permissions: {
              create_orders: true, // Por defecto pueden crear órdenes
              modify_orders: true, // Por defecto pueden editar órdenes
            },
          });

        if (userError) {
          // Si falla crear en users, eliminar el usuario de auth
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw userError;
        }

        console.log("Usuario creado exitosamente");
      }
    } catch (error: any) {
      console.error("Error gestionando usuario de sucursal:", error);
      throw error;
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

  const [loadingUser, setLoadingUser] = useState(false);
  const [branchUser, setBranchUser] = useState<User | null>(null);

  // Cargar usuario de la sucursal si existe
  useEffect(() => {
    async function loadBranchUser() {
      if (!branch?.id) {
        setBranchUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("sucursal_id", branch.id)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setBranchUser(data);
          setFormData(prev => ({ ...prev, userEmail: data.email }));
        } else {
          setBranchUser(null);
        }
      } catch (error) {
        console.error("Error cargando usuario de sucursal:", error);
      }
    }

    loadBranchUser();
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
    
    // Validar contraseña si es usuario nuevo
    if (!branchUser && formData.userEmail && (!formData.userPassword || formData.userPassword.length < 6)) {
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

        {/* Sección de Usuario de la Sucursal */}
        <div className="mt-6 pt-6 border-t border-slate-300">
          <h4 className="text-md font-semibold text-slate-900 mb-4">
            Usuario para Acceso Web
          </h4>
          {branchUser && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Usuario actual:</strong> {branchUser.email}
                {branchUser.name && ` (${branchUser.name})`}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email del Usuario *
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formData.userEmail}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                placeholder="usuario@sucursal.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Este será el email para iniciar sesión en el sistema
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {branchUser ? "Nueva Contraseña" : "Contraseña *"}
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formData.userPassword}
                onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                placeholder={branchUser ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                required={!branchUser}
                minLength={branchUser ? undefined : 6}
              />
              <p className="text-xs text-slate-500 mt-1">
                {branchUser 
                  ? "Dejar vacío si no quieres cambiar la contraseña"
                  : "Mínimo 6 caracteres. El usuario podrá cambiarla después."
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



