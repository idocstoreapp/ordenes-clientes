import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { User, UserPermissions, Branch } from "@/types";

interface BranchPermissionsModalProps {
  branch: Branch;
  users: User[];
  onClose: () => void;
  onSave: () => void;
}

const PERMISSIONS = [
  { key: "use_admin_panel", label: "Permiso para usar panel de administración" },
  { key: "use_statistics_panel", label: "Permiso para usar panel de estadísticas" },
  { key: "modify_orders", label: "Permiso para modificar ordenes" },
  { key: "edit_product_stock", label: "Permiso para editar el stock de productos" },
  { key: "delete_orders", label: "Permiso para eliminar órdenes" },
  { key: "use_branch_panel", label: "Permiso para uso de panel de sucursales" },
  { key: "view_all_business_orders", label: "Permiso para ver ordenes de todo el negocio" },
  { key: "edit_view_cost_price", label: "Permiso para editar y ver costo y precio" },
  { key: "create_orders", label: "Permiso para crear órdenes" },
  { key: "close_day", label: "Permiso para cerrar dia" },
] as const;

export default function BranchPermissionsModal({
  branch,
  users,
  onClose,
  onSave,
}: BranchPermissionsModalProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("technician");
  const [editingUser, setEditingUser] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userName, setUserName] = useState("");

  // Filtrar usuarios de esta sucursal
  const branchUsers = users.filter((u) => u.sucursal_id === branch.id);

  useEffect(() => {
    if (selectedUser) {
      setPermissions(selectedUser.permissions || {});
      setUserRole(selectedUser.role);
      setUserEmail(selectedUser.email);
      setUserName(selectedUser.name);
      setUserPassword("");
      setEditingUser(false);
    } else {
      setPermissions({});
      setUserRole("technician");
      setUserEmail("");
      setUserName("");
      setUserPassword("");
      setEditingUser(false);
    }
  }, [selectedUser]);

  async function handleSavePermissions() {
    if (!selectedUser) {
      alert("Selecciona un usuario primero");
      return;
    }

    setSaving(true);
    try {
      // Actualizar permisos
      const { error: permError } = await supabase
        .from("users")
        .update({
          permissions: permissions,
        })
        .eq("id", selectedUser.id);

      if (permError) throw permError;

      // Si se editó el email o nombre, actualizar también
      if (editingUser && (userEmail !== selectedUser.email || userName !== selectedUser.name)) {
        const updateData: any = {};
        if (userName !== selectedUser.name) {
          updateData.name = userName;
        }
        if (userEmail !== selectedUser.email) {
          updateData.email = userEmail;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: userError } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", selectedUser.id);

          if (userError) throw userError;

          // Actualizar email en auth también
          if (userEmail !== selectedUser.email && supabaseAdmin) {
            await supabaseAdmin.auth.admin.updateUserById(selectedUser.id, {
              email: userEmail,
            });
          }
        }
      }

      // Si se cambió la contraseña
      if (editingUser && userPassword && userPassword.length >= 6 && supabaseAdmin) {
        await supabaseAdmin.auth.admin.updateUserById(selectedUser.id, {
          password: userPassword,
        });
      }

      alert("Cambios guardados exitosamente");
      onSave();
      setEditingUser(false);
    } catch (error: any) {
      console.error("Error guardando cambios:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(key: keyof UserPermissions) {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  async function handleCreateUser() {
    if (!newUserEmail || !newUserName || !newUserPassword || newUserPassword.length < 6) {
      alert("Por favor completa todos los campos. La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      if (!supabaseAdmin) {
        alert("Error: No se puede acceder a las funciones de administrador. Verifica la configuración.");
        return;
      }

      // Crear usuario en auth usando supabaseAdmin
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Crear usuario en tabla users con permisos por defecto
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: newUserEmail,
        name: newUserName,
        role: "technician",
        sucursal_id: branch.id,
        permissions: {
          create_orders: true, // Por defecto pueden crear órdenes
          modify_orders: true, // Por defecto pueden editar órdenes
        },
      });

      if (userError) throw userError;

      alert("Usuario creado exitosamente. El usuario puede iniciar sesión con el email y contraseña proporcionados.");
      setShowCreateForm(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      onSave();
    } catch (error: any) {
      console.error("Error creando usuario:", error);
      alert(`Error: ${error.message}`);
    }
  }

  async function handleDeleteUser(user: User) {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${user.email}?`)) return;

    try {
      if (!supabaseAdmin) {
        alert("Error: No se puede acceder a las funciones de administrador. Verifica la configuración.");
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      
      // También eliminar de la tabla users (esto se hará automáticamente por CASCADE, pero lo hacemos explícito)
      const { error: deleteError } = await supabase.from("users").delete().eq("id", user.id);
      if (deleteError) throw deleteError;
      
      alert("Usuario eliminado exitosamente");
      onSave();
    } catch (error: any) {
      console.error("Error eliminando usuario:", error);
      alert(`Error: ${error.message}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Permisos - {branch.name}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Columna 1: Nombre */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 text-center">Nombre</h3>
              <div className="space-y-2">
                {branchUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No hay usuarios asignados a esta sucursal
                  </p>
                ) : (
                  branchUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedUser?.id === user.id
                          ? "border-brand-light bg-brand-light/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs">▼</span>
                          <span className="text-sm font-medium text-slate-900">{user.email}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full p-2 border-2 border-dashed border-slate-300 rounded-md text-sm text-slate-600 hover:border-brand-light hover:text-brand-light"
                  >
                    + Agregar Usuario
                  </button>
                ) : (
                  <div className="p-3 border border-slate-300 rounded-md bg-slate-50 space-y-2">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      placeholder="Nombre"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <input
                      type="email"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      placeholder="Email (ej: manquehue@idocstore.com)"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                    <input
                      type="password"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                      placeholder="Contraseña (mín. 6 caracteres)"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      minLength={6}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateUser}
                        className="flex-1 px-2 py-1 text-xs bg-brand-light text-white rounded-md hover:bg-brand-dark"
                      >
                        Crear
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewUserEmail("");
                          setNewUserName("");
                          setNewUserPassword("");
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna 2: Rol */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 text-center">Rol</h3>
              {selectedUser && (
                <div className="space-y-4">
                  {/* Botón para editar usuario */}
                  <button
                    onClick={() => setEditingUser(!editingUser)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    {editingUser ? "✕ Cancelar Edición" : "✏️ Editar Usuario"}
                  </button>

                  {/* Información del usuario (editable si editingUser) */}
                  {editingUser && (
                    <div className="space-y-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nombre
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="Dejar vacío para no cambiar"
                          minLength={6}
                        />
                        <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                      </div>
                    </div>
                  )}

                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    value={userRole}
                    onChange={(e) => {
                      setUserRole(e.target.value);
                      // Actualizar rol en la base de datos
                      supabase
                        .from("users")
                        .update({ role: e.target.value })
                        .eq("id", selectedUser.id)
                        .then(() => {
                          setSelectedUser({ ...selectedUser, role: e.target.value as any });
                        });
                    }}
                  >
                    <option value="admin">Administrador</option>
                    <option value="technician">Técnico</option>
                    <option value="encargado">Encargado</option>
                    <option value="recepcionista">Recepcionista</option>
                  </select>

                  <div className="space-y-2">
                    {PERMISSIONS.slice(0, 5).map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 p-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={permissions[perm.key as keyof UserPermissions] || false}
                          onChange={() => togglePermission(perm.key as keyof UserPermissions)}
                          className="w-4 h-4 text-brand-light rounded focus:ring-brand-light"
                        />
                        <span className="text-xs text-slate-700">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna 3: Permisos restantes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 text-center">
                {selectedUser ? "Permisos (cont.)" : "Comisión"}
              </h3>
              {selectedUser && (
                <div className="space-y-2">
                  {PERMISSIONS.slice(5).map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 p-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[perm.key as keyof UserPermissions] || false}
                        onChange={() => togglePermission(perm.key as keyof UserPermissions)}
                        className="w-4 h-4 text-brand-light rounded focus:ring-brand-light"
                      />
                      <span className="text-xs text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={!selectedUser || saving}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

