import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { validateBsaleDocument, buildBsalePdfUrl } from "@/lib/bsale";
import type { Order } from "@/types";

/**
 * Componente para actualizar todas las órdenes existentes con URLs de Bsale
 * Valida cada orden con número de recibo y actualiza bsale_url y bsale_id
 */
export default function UpdateBsaleUrls() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{
    updated: number;
    failed: number;
    skipped: number;
    errors: string[];
  }>({
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  });

  async function updateAllOrders() {
    setLoading(true);
    setResults({ updated: 0, failed: 0, skipped: 0, errors: [] });
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Obtener TODAS las órdenes con receipt_number (incluyendo las que ya tienen bsale_url)
      // Esto asegura que todas tengan el formato correcto de URL: https://app2.bsale.cl/documents/show/{id}
      const { data: orders, error: fetchError } = await supabase
        .from("orders")
        .select("id, receipt_number, bsale_url, bsale_id, bsale_number")
        .not("receipt_number", "is", null)
        .neq("receipt_number", "");

      if (fetchError) {
        throw new Error(`Error al cargar órdenes: ${fetchError.message}`);
      }

      if (!orders || orders.length === 0) {
        setResults({
          updated: 0,
          failed: 0,
          skipped: 0,
          errors: ["No se encontraron órdenes con número de recibo"],
        });
        setLoading(false);
        return;
      }

      // Actualizar TODAS las órdenes con número de recibo para asegurar que tengan el formato correcto
      // Esto incluye órdenes que ya tienen bsale_url pero pueden tener un formato incorrecto
      const ordersToUpdate = orders as Order[];

      setProgress({ current: 0, total: ordersToUpdate.length });

      let updated = 0;
      let failed = 0;
      let skipped = 0;
      const errors: string[] = [];

      // 2. Validar cada orden con Bsale
      for (let i = 0; i < ordersToUpdate.length; i++) {
        const order = ordersToUpdate[i];
        setProgress({ current: i + 1, total: ordersToUpdate.length });

        if (!order.receipt_number || order.receipt_number.trim() === "") {
          skipped++;
          continue;
        }

        try {
          // Validar el documento en Bsale
          const validation = await validateBsaleDocument(
            order.receipt_number.trim(),
            false // No requerir validación obligatoria para no bloquear
          );

          if (validation.exists && validation.document) {
            const document = validation.document;

            // Preparar datos para actualizar
            const updateData: {
              bsale_url?: string | null;
              bsale_id?: number | null;
              bsale_number?: string | null;
              bsale_total_amount?: number | null;
            } = {};

            // SIEMPRE actualizar bsale_id si tenemos el ID del documento
            if (document.id) {
              updateData.bsale_id = document.id;
            }

            // SIEMPRE actualizar bsale_url con el formato correcto de Bsale
            // Prioridad: construir URL web con ID (formato correcto) > urlPdf > url
            if (document.id) {
              // SIEMPRE construir URL web de Bsale usando el ID: https://app2.bsale.cl/documents/show/{id}
              // Este es el formato correcto para abrir el documento en la interfaz web de Bsale
              updateData.bsale_url = buildBsalePdfUrl(document.id);
            } else if (document.urlPdf) {
              // Usar urlPdf si viene de la API (formato oficial) pero no tenemos ID
              updateData.bsale_url = document.urlPdf;
            } else if (document.url) {
              // Usar url si está disponible (fallback)
              updateData.bsale_url = document.url;
            }

            // Actualizar bsale_number si no existe
            if (document.number && !order.bsale_number) {
              updateData.bsale_number = document.number;
            }

            // Actualizar bsale_total_amount si no existe
            if (document.totalAmount && !order.bsale_total_amount) {
              updateData.bsale_total_amount = document.totalAmount;
            }

            // Solo actualizar si hay algo que actualizar
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from("orders")
                .update(updateData)
                .eq("id", order.id);

              if (updateError) {
                failed++;
                errors.push(
                  `Orden ${order.id}: Error al actualizar - ${updateError.message}`
                );
              } else {
                updated++;
              }
            } else {
              skipped++;
            }
          } else {
            // Documento no encontrado en Bsale
            skipped++;
            errors.push(
              `Orden ${order.id}: Documento "${order.receipt_number}" no encontrado en Bsale`
            );
          }

          // Pequeña pausa para no sobrecargar la API de Bsale
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Error desconocido";
          errors.push(`Orden ${order.id}: ${errorMessage}`);
        }
      }

      setResults({ updated, failed, skipped, errors });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setResults({
        updated: 0,
        failed: 0,
        skipped: 0,
        errors: [`Error general: ${errorMessage}`],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Actualizar URLs de Bsale para Órdenes Existentes
      </h3>
      <p className="text-sm text-slate-600 mb-4">
        Este proceso validará <strong>todas las órdenes existentes</strong> con número de recibo y actualizará
        las URLs de Bsale con el formato correcto: <code className="text-xs bg-slate-100 px-1 rounded">https://app2.bsale.cl/documents/show/{`{id}`}</code>
      </p>

      {loading && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand"></div>
            <span className="text-sm text-slate-600">
              Procesando... {progress.current} de {progress.total}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-brand h-2 rounded-full transition-all duration-300"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {!loading && (results.updated > 0 || results.failed > 0 || results.skipped > 0) && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600 font-medium">
              ✅ Actualizadas: {results.updated}
            </span>
            <span className="text-amber-600 font-medium">
              ⏭️ Omitidas: {results.skipped}
            </span>
            <span className="text-red-600 font-medium">
              ❌ Fallidas: {results.failed}
            </span>
          </div>
          {results.errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                Ver errores ({results.errors.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded">
                {results.errors.map((error, index) => (
                  <div key={index} className="text-red-600 mb-1">
                    {error}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <button
        onClick={updateAllOrders}
        disabled={loading}
        className="px-4 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-brand-light hover:border-white font-medium"
      >
        {loading ? "Actualizando..." : "Actualizar Todas las Órdenes"}
      </button>
    </div>
  );
}

