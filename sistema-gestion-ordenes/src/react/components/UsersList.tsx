import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
        // Para crear usuarios nuevos, se debe hacer desde Supabase Dashboard
        alert("Para crear usuarios nuevos:\n\n1. Ve a Supabase Dashboard → Authentication → Users → Add user\n2. Crea el usuario con email y contraseña\n3. Copia el User UID\n4. Ejecuta en SQL Editor:\n\nINSERT INTO users (id, email, name, role, sucursal_id)\nVALUES ('UID_AQUI', 'email@ejemplo.com', 'Nombre', 'role', 'sucursal_id');\n\nLuego recarga esta página.");
        return;
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
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                <strong>Nota:</strong> Para crear usuarios nuevos, primero créalos en Supabase Dashboard → Authentication → Users. 
                Luego agrega el registro en la tabla users usando el SQL Editor con el User UID.
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sucursal</label>
            <select
              className="w-full border border-slate-300 rounded-md px-3 py-2"
              value={formData.sucursal_id}
              onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
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
            {user ? "Actualizar" : "Crear"} Usuario
          </button>
        </div>
      </form>
    </div>
  );
}

