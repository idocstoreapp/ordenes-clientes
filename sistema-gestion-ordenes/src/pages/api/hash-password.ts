import type { APIRoute } from "astro";
import { createHash } from "crypto";

// API route para hashear contraseñas usando SHA-256
// NOTA: En producción, deberías usar bcrypt, pero para simplificar usamos SHA-256
// Para mayor seguridad, considera usar bcrypt en el servidor

export const POST: APIRoute = async ({ request }) => {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Password es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hashear la contraseña usando SHA-256
    // NOTA: Para mayor seguridad, considera usar bcrypt con salt
    const hash = createHash("sha256").update(password).digest("hex");

    return new Response(
      JSON.stringify({ hash }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[HASH PASSWORD API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};










