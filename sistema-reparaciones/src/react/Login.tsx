import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "./components/Footer";

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
    } else {
      window.location.href = "/dashboard";
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
            alt="IDocStore Logo" 
            className="h-56 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-brand mb-2">Registro de Servicios</h2>
          <p className="text-slate-600">Ingresa tus credenciales</p>
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
          className="w-full bg-brand-light text-brand-white rounded-md py-2 font-medium hover:bg-white hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-brand-light hover:border-white"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
      <Footer />
    </div>
  );
}

