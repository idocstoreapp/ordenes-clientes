import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { User, Branch } from "@/types";
import { formatDate } from "@/lib/date";

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          *,
          sucursal:branches(*)
        `)
        .order("name");

      if (usersError) throw usersError;

      // Cargar sucursales
      const { data: branchesData, error: branchesError } = await supabase
        .from("branches")
        .select("*")
        .order("name");

      if (branchesError) throw branchesError;

      setUsers(usersData || []);
      setBranches(branchesData || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(userData: {
    email: string;
    password?: string;
    name: string;
    role: string;
    sucursal_id?: string | null;
  }) {
    try {
      if (editingUser) {
        // Solo actualizar datos en tabla users (no podemos cambiar contraseña desde el cliente)
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: userData.name,
            role: userData.role,
            sucursal_id: userData.sucursal_id || null,
          })
          .eq("id", editingUser.id);

        if (updateError) throw updateError;
        alert("Usuario actualizado exitosamente. Nota: Para cambiar la contraseña, hazlo desde Supabase Dashboard → Authentication → Users.");
      } else {
        // Crear usuario nuevo
        if (!userData.password || userData.password.length < 6) {
          alert("La contraseña es obligatoria y debe tener al menos 6 caracteres");
          return;
        }

        if (!supabaseAdmin) {
          alert("⚠️ Service Role Key no configurado. Obtén el 'service_role' key en Supabase Dashboard → Settings → API. Luego: (1) Para desarrollo local: agrega PUBLIC_SUPABASE_SERVICE_ROLE_KEY=tu_key en .env.local y reinicia el servidor. (2) Para Vercel: agrega la variable en Vercel Dashboard → Settings → Environment Variables y haz redeploy.");
          return;
        }

        try {
          // Crear usuario en auth usando supabaseAdmin
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email.trim(),
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              name: userData.name.trim(),
            },
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error("No se pudo crear el usuario");

          // Crear usuario en tabla users
          const { error: userError } = await supabase.from("users").insert({
            id: authData.user.id,
            role: userData.role,
            name: userData.name.trim(),
            email: userData.email.trim(),
            sucursal_id: (userData.role === "encargado" || userData.role === "technician") && userData.sucursal_id ? userData.sucursal_id : null,
          });

          if (userError) {
            // Si falla insertar en users, eliminar el usuario de auth
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw userError;
          }

          alert("Usuario creado exitosamente");
        } catch (error: any) {
          console.error("Error creando usuario:", error);
          alert(`Error al crear usuario: ${error.message}`);
          return;
        }
      }

      await loadData();
      setShowForm(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error guardando usuario:", error);
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          branches={branches}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {users.length === 0 ? (
        <p className="text-slate-600 text-center py-8">No hay usuarios registrados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Sucursal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha Registro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => {
                const branch = (user as any).sucursal as Branch | null;
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{branch?.name || "Sin asignar"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {user.created_at ? formatDate(user.created_at) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowForm(true);
                        }}
                        className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface UserFormProps {
  user: User | null;
  branches: Branch[];
  onSave: (data: {
    email: string;
    password?: string;
    name: string;
    role: string;
    sucursal_id?: string | null;
  }) => void;
  onCancel: () => void;
}

function UserForm({ user, branches, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    password: "",
    name: user?.name || "",
    role: user?.role || "technician",
    sucursal_id: user?.sucursal_id || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("Nombre y email son obligatorios");
      return;
    }

    // Validar que encargados tengan sucursal asignada
    if (formData.role === "encargado" && !formData.sucursal_id) {
      alert("Los encargados deben tener una sucursal asignada");
      return;
    }

    onSave({
      email: formData.email,
      password: formData.password || undefined,
      name: formData.name,
      role: formData.role as any,
      sucursal_id: formData.sucursal_id || null,
    });
  }

  return (
    <div className="mb-6 p-4 border border-slate-200 rounded-md bg-slate-50">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {user ? "Editar Usuario" : "Nuevo Usuario"}
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!user}
            />
          </div>
          {!user && (
            <div className="md:col-span-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="text-xs text-slate-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="admin">Administrador</option>
              <option value="technician">Técnico</option>
              <option value="encargado">Encargado</option>
              <option value="recepcionista">Recepcionista</option>
            </select>
          </div>
          {(formData.role === "encargado" || formData.role === "technician") && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sucursal {formData.role === "encargado" ? "*" : ""}
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={formData.sucursal_id}
                onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                required={formData.role === "encargado"}
              >
                <option value="">{formData.role === "encargado" ? "Selecciona una sucursal..." : "Sin asignar"}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {formData.role === "encargado" && !formData.sucursal_id && (
                <p className="text-xs text-red-600 mt-1">La sucursal es obligatoria para encargados</p>
              )}
            </div>
          )}
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
            {user ? "Actualizar" : "Crear"} Usuario
          </button>
        </div>
      </form>
    </div>
  );
}

