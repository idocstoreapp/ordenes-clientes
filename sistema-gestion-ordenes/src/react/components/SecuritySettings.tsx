import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentEmail(user.email);
        setNewEmail(user.email);
      }
    } catch (error) {
      console.error("Error cargando usuario:", error);
    }
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!newEmail || newEmail === currentEmail) {
        setMessage({ type: 'error', text: 'Ingresa un email diferente al actual' });
        setLoading(false);
        return;
      }

      // Actualizar email usando el cliente de Supabase (requiere reautenticación en producción)
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      // Actualizar también en la tabla users
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ email: newEmail })
          .eq("id", user.id);

        if (updateError) throw updateError;
      }

      setMessage({ type: 'success', text: 'Email actualizado exitosamente. Revisa tu bandeja de entrada para confirmar el nuevo email.' });
      setCurrentEmail(newEmail);
    } catch (error: any) {
      console.error("Error actualizando email:", error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el email' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!newPassword || newPassword.length < 6) {
        setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
        setLoading(false);
        return;
      }

      // Actualizar contraseña (requiere la contraseña actual en producción)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error actualizando contraseña:", error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar la contraseña' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Configuración de Seguridad</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Cambiar Email */}
        <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Cambiar Email</h3>
          
          <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Actual
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50"
                value={currentEmail}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nuevo Email
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || newEmail === currentEmail}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Actualizar Email"}
            </button>
          </form>
        </div>

        {/* Cambiar Contraseña */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Cambiar Contraseña</h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                className="w-full border border-slate-300 rounded-md px-3 py-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

