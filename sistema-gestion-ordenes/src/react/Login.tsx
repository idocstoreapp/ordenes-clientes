import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = "/dashboard";
      }
    });
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Primero verificar si es una sucursal (solo si login_email no es null)
      let isBranch = false;
      if (email) {
        const { data: branch, error: branchError } = await supabase
          .from("branches")
          .select("id, name, login_email, password_hash, is_active")
          .eq("login_email", email)
          .maybeSingle();

        // Solo procesar como sucursal si no hay error y se encontró una sucursal activa
        if (!branchError && branch && branch.login_email && branch.is_active) {
          isBranch = true;
        // Es una sucursal - verificar contraseña
        if (!branch.password_hash) {
          setErr("Esta sucursal no tiene contraseña configurada. Contacta al administrador.");
          setLoading(false);
          return;
        }

        // Hashear la contraseña ingresada para comparar
        const hashResponse = await fetch('/api/hash-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass }),
        });

        if (!hashResponse.ok) {
          throw new Error('Error al verificar la contraseña');
        }

        const { hash } = await hashResponse.json();

        if (hash === branch.password_hash) {
          // Contraseña correcta - guardar sesión de sucursal en localStorage
          const branchSession = {
            type: 'branch',
            branchId: branch.id,
            branchName: branch.name,
            email: branch.login_email,
          };
          localStorage.setItem('branchSession', JSON.stringify(branchSession));
          window.location.href = "/dashboard";
          return;
        } else {
          setErr("Contraseña incorrecta");
          setLoading(false);
          return;
        }
      }

      // Si no es sucursal, intentar login como usuario normal
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        setErr(error.message);
      } else {
        // Limpiar sesión de sucursal si existe
        localStorage.removeItem('branchSession');
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error("Error en login:", error);
      setErr(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand to-brand-dark">
      <form
        onSubmit={onLogin}
        className="max-w-md w-full bg-white p-8 rounded-lg shadow-2xl space-y-6"
      >
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="IDoc STORE Logo" 
            className="h-56 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-brand mb-2">Sistema de Gestión de Órdenes</h2>
          <p className="text-slate-600">IDoc STORE - Servicio Especializado</p>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {err}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            className="w-full border-2 border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contraseña
          </label>
          <input
            className="w-full border-2 border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-light text-white rounded-md py-2 font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}



