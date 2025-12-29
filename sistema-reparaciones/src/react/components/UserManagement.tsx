import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatDate } from "@/lib/date";
import type { Role, Profile, Branch } from "@/types";

interface UserFormData {
  name: string;
  last_name: string;
  document_number: string;
  email: string;
  password: string;
  role: Role;
  local: string;
  sucursal_id: string;
}

interface ExtendedProfile extends Profile {
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedProfile | null>(null);
  const [passwordUser, setPasswordUser] = useState<ExtendedProfile | null>(null);
  const [deleteUser, setDeleteUser] = useState<ExtendedProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    last_name: "",
    document_number: "",
    email: "",
    password: "",
    role: "technician",
    local: "",
    sucursal_id: "",
  });

  const [editFormData, setEditFormData] = useState<UserFormData>({
    name: "",
    last_name: "",
    document_number: "",
    email: "",
    password: "",
    role: "technician",
    local: "",
    sucursal_id: "",
  });

  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  async function loadBranches() {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .order("name");
    if (data) setBranches(data);
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data as ExtendedProfile[]) || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    if (!formData.name.trim() || !formData.email.trim() || !formData.local.trim()) {
      setError("Los campos obligatorios deben completarse");
      setActionLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setActionLoading(false);
      return;
    }

    try {
      if (!supabaseAdmin) {
        throw new Error("⚠️ Service Role Key no configurado. Obtén el 'service_role' key en Supabase Dashboard → Settings → API. Luego: (1) Para desarrollo local: agrega PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_key en .env.local y reinicia el servidor. (2) Para Vercel: agrega la variable en Vercel Dashboard → Settings → Environment Variables y haz redeploy.");
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email.trim(),
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          name: formData.name.trim(),
          last_name: formData.last_name.trim() || "",
          document_number: formData.document_number.trim() || "",
          local: formData.local.trim(),
        sucursal_id: (formData.role === "technician" || formData.role === "encargado") && formData.sucursal_id ? formData.sucursal_id : null,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        role: formData.role,
        name: formData.name.trim(),
        last_name: formData.last_name.trim() || null,
        document_number: formData.document_number.trim() || null,
        email: formData.email.trim(),
        local: formData.local.trim(),
        sucursal_id: (formData.role === "technician" || formData.role === "encargado") && formData.sucursal_id ? formData.sucursal_id : null,
      });

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        // Si el error es sobre columnas faltantes, dar instrucciones claras
        if (userError.message?.includes("column") && userError.message?.includes("schema cache")) {
          throw new Error("⚠️ Faltan columnas en la tabla 'users'. Ejecuta el script 'database/fix_users_table_columns.sql' en el SQL Editor de Supabase para agregar las columnas: last_name, document_number, local");
        }
        throw userError;
      }

      setSuccess("Usuario creado exitosamente");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        last_name: "",
        document_number: "",
        email: "",
        password: "",
        role: "technician",
        local: "",
        sucursal_id: "",
      });
      await loadUsers();
      // Disparar evento para notificar a otros componentes (TechnicianPayments, AdminReports)
      window.dispatchEvent(new CustomEvent('userCreated'));
    } catch (err: any) {
      setError(err.message || "Error al crear el usuario");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editFormData.name.trim(),
          last_name: editFormData.last_name.trim() || null,
          document_number: editFormData.document_number.trim() || null,
          email: editFormData.email.trim(),
          role: editFormData.role,
          local: editFormData.local.trim(),
          sucursal_id: (editFormData.role === "technician" || editFormData.role === "encargado") && editFormData.sucursal_id ? editFormData.sucursal_id : null,
        })
        .eq("id", editingUser.id);

      if (error) {
        // Si el error es sobre columnas faltantes, dar instrucciones claras
        if (error.message?.includes("column") && error.message?.includes("schema cache")) {
          throw new Error("⚠️ Faltan columnas en la tabla 'users'. Ejecuta el script 'database/fix_users_table_columns.sql' en el SQL Editor de Supabase para agregar las columnas: last_name, document_number, local");
        }
        throw error;
      }

      // Actualizar email en auth si cambió
      if (editFormData.email.trim() !== editingUser.email && supabaseAdmin) {
        await supabaseAdmin.auth.admin.updateUserById(editingUser.id, {
          email: editFormData.email.trim(),
        });
      }

      setSuccess("Usuario actualizado exitosamente");
      setEditingUser(null);
      await loadUsers();
      // Disparar evento para notificar a otros componentes (TechnicianPayments, AdminReports)
      window.dispatchEvent(new CustomEvent('userUpdated'));
    } catch (err: any) {
      setError(err.message || "Error al actualizar el usuario");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      if (!supabaseAdmin) {
        throw new Error("⚠️ Service Role Key no configurado. Obtén el 'service_role' key en Supabase Dashboard → Settings → API. Luego: (1) Para desarrollo local: agrega PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_key en .env.local y reinicia el servidor. (2) Para Vercel: agrega la variable en Vercel Dashboard → Settings → Environment Variables y haz redeploy.");
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(passwordUser.id, {
        password: newPassword,
      });

      if (error) throw error;

      setSuccess("Contraseña actualizada exitosamente");
      setPasswordUser(null);
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Error al cambiar la contraseña");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    if (!confirm(`¿Estás seguro de eliminar al usuario ${deleteUser.name} (${deleteUser.email})? Esta acción no se puede deshacer.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      if (!supabaseAdmin) {
        throw new Error("⚠️ Service Role Key no configurado. Obtén el 'service_role' key en Supabase Dashboard → Settings → API. Luego: (1) Para desarrollo local: agrega PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_key en .env.local y reinicia el servidor. (2) Para Vercel: agrega la variable en Vercel Dashboard → Settings → Environment Variables y haz redeploy.");
      }

      // Eliminar de auth.users (esto también eliminará de users por CASCADE)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(deleteUser.id);

      if (error) throw error;

      setSuccess("Usuario eliminado exitosamente");
      setDeleteUser(null);
      await loadUsers();
      // Disparar evento para notificar a otros componentes (TechnicianPayments, AdminReports)
      window.dispatchEvent(new CustomEvent('userDeleted'));
    } catch (err: any) {
      setError(err.message || "Error al eliminar el usuario");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user: ExtendedProfile) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      last_name: user.last_name || "",
      document_number: user.document_number || "",
      email: user.email,
      password: "",
      role: user.role,
      local: user.local || "",
      sucursal_id: user.sucursal_id || "",
    });
    setError(null);
    setSuccess(null);
  };

  const openPasswordModal = (user: ExtendedProfile) => {
    setPasswordUser(user);
    setNewPassword("");
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-slate-500">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition-colors font-medium"
        >
          + Crear Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm">
          {success}
        </div>
      )}

      {/* Lista de usuarios */}
      {/* Vista de Cards para Móvil */}
      <div className="lg:hidden space-y-3">
        {users.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
            No hay usuarios registrados
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 mb-1">
                    {user.name} {user.last_name || ""}
                  </div>
                  <div className="text-xs text-slate-600">{user.email}</div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : user.role === "encargado"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {user.role === "admin" ? "Admin" : user.role === "encargado" ? "Encargado" : "Técnico"}
                </span>
              </div>
              <div className="space-y-2 mb-3 text-xs">
                <div>
                  <span className="text-slate-500">Sucursal: </span>
                  <span className="text-slate-900 font-medium">
                    {user.sucursal_id ? (branches.find(b => b.id === user.sucursal_id)?.name || "-") : "-"}
                  </span>
                </div>
                {user.local && (
                  <div>
                    <span className="text-slate-500">Local: </span>
                    <span className="text-slate-900">{user.local}</span>
                  </div>
                )}
                {user.document_number && (
                  <div>
                    <span className="text-slate-500">Documento: </span>
                    <span className="text-slate-900">{user.document_number}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Creado: </span>
                  <span className="text-slate-900">{formatDate(user.created_at)}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => openEditModal(user)}
                  className="w-full px-3 py-2 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordUser(user)}
                  className="w-full px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  🔑 Cambiar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteUser(user)}
                  className="w-full px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vista de Tabla para Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="py-3 px-2 font-semibold text-slate-700">Nombre</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Email</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Rol</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Sucursal</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Local</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Documento</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Creado</th>
              <th className="py-3 px-2 font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2">
                    {user.name} {user.last_name || ""}
                  </td>
                  <td className="py-3 px-2">{user.email}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "encargado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : user.role === "encargado" ? "Encargado" : "Técnico"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {user.sucursal_id ? (
                      branches.find(b => b.id === user.sucursal_id)?.name || "-"
                    ) : "-"}
                  </td>
                  <td className="py-3 px-2">{user.local || "-"}</td>
                  <td className="py-3 px-2">{user.document_number || "-"}</td>
                  <td className="py-3 px-2">{formatDate(user.created_at)}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasswordUser(user)}
                        className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition"
                      >
                        Contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteUser(user)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Usuario */}
      {isCreateOpen && (
        <Modal
          title="Crear Nuevo Usuario"
          onClose={() => {
            setIsCreateOpen(false);
      setFormData({
        name: "",
        last_name: "",
        document_number: "",
        email: "",
        password: "",
        role: "technician",
        local: "",
        sucursal_id: "",
      });
            setError(null);
            setSuccess(null);
          }}
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <FormFields
              formData={formData}
              onChange={handleInputChange}
              showPassword={true}
              branches={branches}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition disabled:opacity-50 font-medium"
              >
                {actionLoading ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <Modal
          title="Editar Usuario"
          onClose={() => {
            setEditingUser(null);
            setError(null);
            setSuccess(null);
          }}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <FormFields
              formData={editFormData}
              onChange={handleEditInputChange}
              showPassword={false}
              branches={branches}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition disabled:opacity-50 font-medium"
              >
                {actionLoading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cambiar Contraseña */}
      {passwordUser && (
        <Modal
          title={`Cambiar Contraseña - ${passwordUser.name}`}
          onClose={() => {
            setPasswordUser(null);
            setNewPassword("");
            setError(null);
            setSuccess(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={actionLoading || !newPassword || newPassword.length < 6}
                className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand border-2 border-brand-light hover:border-white transition disabled:opacity-50 font-medium"
              >
                {actionLoading ? "Cambiando..." : "Cambiar Contraseña"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Eliminar Usuario */}
      {deleteUser && (
        <Modal
          title="Eliminar Usuario"
          onClose={() => {
            setDeleteUser(null);
            setError(null);
            setSuccess(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-slate-700">
              ¿Estás seguro de eliminar al usuario{" "}
              <strong>{deleteUser.name}</strong> ({deleteUser.email})?
            </p>
            <p className="text-sm text-red-600">
              ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? "Eliminando..." : "Eliminar Usuario"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Componente Modal reutilizable
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-semibold text-slate-900">{title}</h4>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Componente de campos del formulario reutilizable
function FormFields({
  formData,
  onChange,
  showPassword,
  branches = [],
}: {
  formData: UserFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  showPassword: boolean;
  branches?: Branch[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          required
          placeholder="Ej: Juan"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
        <input
          type="text"
          name="last_name"
          value={formData.last_name}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          placeholder="Ej: Pérez"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Número de Documento
        </label>
        <input
          type="text"
          name="document_number"
          value={formData.document_number}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          placeholder="Ej: 12345678-9"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Local *</label>
        <input
          type="text"
          name="local"
          value={formData.local}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          required
          placeholder="Ej: Local Centro"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Correo Electrónico *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          required
          placeholder="Ej: juan@example.com"
        />
      </div>

      {showPassword && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contraseña *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={onChange}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      )}

      <div className={showPassword ? "md:col-span-2" : ""}>
        <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
        <select
          name="role"
          value={formData.role}
          onChange={onChange}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          required
        >
          <option value="technician">Técnico</option>
          <option value="encargado">Encargado</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      {(formData.role === "technician" || formData.role === "encargado") && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Sucursal *
          </label>
          <select
            name="sucursal_id"
            value={formData.sucursal_id}
            onChange={onChange}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            required
          >
            <option value="">Selecciona una sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
