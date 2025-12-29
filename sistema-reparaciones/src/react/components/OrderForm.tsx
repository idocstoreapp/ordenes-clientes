import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { calcCommission } from "@/lib/commission";
import { formatCLP, formatCLPInput, parseCLPInput } from "@/lib/currency";
import { calculatePayoutWeek, calculatePayoutYear } from "@/lib/payoutWeek";
import { processReceiptInput, isUrl } from "@/lib/receipt";
// Bsale integration removed - now using manual receipt URL
import type { PaymentMethod } from "@/lib/commission";
import type { Supplier } from "@/types";
import DeviceAutocomplete from "./DeviceAutocomplete";

interface OrderFormProps {
  technicianId: string;
  onSaved: () => void;
}

export default function OrderForm({ technicianId, onSaved }: OrderFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [orderDate, setOrderDate] = useState(today);
  const [orderNumber, setOrderNumber] = useState("");
  const [device, setDevice] = useState("");
  const [service, setService] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [replacementCost, setReplacementCost] = useState(0);
  const [precioTotal, setPrecioTotal] = useState(0); // Precio total cobrado (ya incluye repuesto)
  const handleReplacementCostChange = (value: string) => {
    if (value.trim() === "") {
      setReplacementCost(0);
      return;
    }
    setReplacementCost(parseCLPInput(value));
  };

  const handlePrecioTotalChange = (value: string) => {
    if (value.trim() === "") {
      setPrecioTotal(0);
      return;
    }
    setPrecioTotal(parseCLPInput(value));
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [initialNote, setInitialNote] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSuppliers() {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) {
        console.error("Error cargando proveedores:", error);
        setSupplierError("No pudimos cargar los proveedores. Intenta nuevamente.");
        return;
      }
      if (data) setSuppliers(data);
    }
    loadSuppliers();
  }, []);

  async function handleQuickCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierError("Ingresa un nombre de proveedor.");
      return;
    }
    setSupplierError(null);
    setCreatingSupplier(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: newSupplierName.trim(),
        contact_info: newSupplierContact.trim() ? newSupplierContact.trim() : null,
      })
      .select()
      .maybeSingle();
    setCreatingSupplier(false);
    if (error) {
      console.error("Error creando proveedor:", error);
      setSupplierError("No pudimos crear el proveedor. Intenta nuevamente.");
      return;
    }
    if (data) {
      setSuppliers((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "es"))
      );
      setSupplierId(data.id);
      setNewSupplierName("");
      setNewSupplierContact("");
      setSupplierFormOpen(false);
      setSupplierError(null);
      window.dispatchEvent(new CustomEvent("supplierCreated"));
    }
  }

  const commission = useMemo(
    () =>
      calcCommission({
        paymentMethod,
        costoRepuesto: replacementCost,
        precioTotal: precioTotal,
      }),
    [paymentMethod, replacementCost, precioTotal]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Validar solo campos obligatorios: número de orden, equipo y servicio
    if (!orderNumber || !device || !service) {
      alert("Por favor completa todos los campos obligatorios (N° de Orden, Equipo y Servicio)");
      return;
    }

    setLoading(true);
    // Si hay recibo, marcar como pagada, sino como pendiente
    const hasReceipt = receiptNumber.trim().length > 0;
    const status = hasReceipt ? "paid" : "pending";
    
    if (!orderDate) {
      alert("Selecciona una fecha válida para la orden.");
      setLoading(false);
      return;
    }

    // Verificar duplicados (permitir pero mostrar advertencia)
    let hasDuplicateReceipt = false;
    if (hasReceipt) {
      const { data: duplicateOrders } = await supabase
        .from("orders")
        .select("id, receipt_number")
        .eq("receipt_number", receiptNumber.trim());
      
      hasDuplicateReceipt = duplicateOrders && duplicateOrders.length > 0;
      
      if (hasDuplicateReceipt) {
        const confirmMessage = `⚠️ Este número de recibo ya está registrado en ${duplicateOrders.length} otra(s) orden(es). ¿Deseas continuar de todas formas?`;
        if (!window.confirm(confirmMessage)) {
          setLoading(false);
          return;
        }
      }
    }

    // Crear fecha en UTC para evitar problemas de zona horaria
    // La fecha seleccionada viene en formato YYYY-MM-DD, crear Date en UTC
    const [year, month, day] = orderDate.split('-').map(Number);
    const createdAt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    const now = new Date();

    // ⚠️ CAMBIO CRÍTICO: Si la orden se crea con recibo (status = 'paid'),
    // establecer paid_at, payout_week y payout_year basándose en la fecha actual
    // Estos campos se fijan permanentemente y nunca se recalculan
    const paidAt = status === "paid" ? now.toISOString() : null;
    const payoutWeek = status === "paid" ? calculatePayoutWeek(now) : null;
    const payoutYear = status === "paid" ? calculatePayoutYear(now) : null;

    // Obtener sucursal_id del técnico
    const { data: technician } = await supabase
      .from("users")
      .select("sucursal_id")
      .eq("id", technicianId)
      .single();

    // Guardar la orden - medio de pago y recibo son opcionales
    // payment_method no puede ser null, usar cadena vacía '' si no hay medio de pago
    const { data: createdOrder, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        technician_id: technicianId,
        supplier_id: supplierId || null,
        device,
        service_description: service,
        replacement_cost: replacementCost,
        repair_cost: precioTotal, // Precio total cobrado
        payment_method: paymentMethod || '', // Usar '' en lugar de null (NOT NULL constraint)
        receipt_number: receiptNumber.trim() || null, // Opcional - puede ser null
        receipt_url: receiptUrl.trim() || null, // URL del recibo (opcional)
        status,
        commission_amount: commission, // Si no hay medio de pago, será 0
        created_at: createdAt.toISOString(),
        original_created_at: now.toISOString(), // Fecha/hora real de creación (registro para admin)
        // Campos de semana de pago: se asignan cuando status = 'paid'
        paid_at: paidAt,
        payout_week: payoutWeek,
        payout_year: payoutYear,
        // Campo de URL del recibo (ingresado manualmente)
        receipt_url: receiptUrl.trim() || null,
        // Campo de sucursal: heredado del técnico
        sucursal_id: technician?.sucursal_id || null,
      })
      .select()
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      if (hasDuplicateReceipt) {
        alert(`✅ Orden creada exitosamente. ⚠️ Advertencia: Este número de recibo está duplicado en otra(s) orden(es).`);
      }
      
      if (createdOrder && initialNote.trim()) {
        const { error: noteError } = await supabase.from("order_notes").insert({
          order_id: createdOrder.id,
          technician_id: technicianId,
          note: initialNote.trim(),
        });

        if (noteError) {
          console.error("Error guardando nota inicial:", noteError);
          alert("La orden se creó, pero hubo un problema al guardar la nota inicial.");
        }
      }

      onSaved();
      // Disparar evento para actualizar otros componentes (WeeklyReport, WeeklySummary, etc.)
      window.dispatchEvent(new CustomEvent('orderUpdated'));
      // Reset form
      setOrderDate(today);
      setOrderNumber("");
      setDevice("");
      setService("");
      setSupplierId("");
      setReplacementCost(0);
      setPrecioTotal(0);
      setPaymentMethod("");
      setReceiptNumber("");
      setReceiptUrl("");
      setInitialNote("");
    }
  }

  return (
    <form onSubmit={save} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Nueva Orden de Reparación</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            type="date"
            max={today}
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Puedes ajustar la fecha si estás registrando una orden atrasada.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">N° de Orden *</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            placeholder="Ej: 23228"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Equipo (Marca y Modelo) *</label>
          <DeviceAutocomplete
            value={device}
            onChange={setDevice}
            placeholder="Ej: iPhone 13 Pro"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Empieza a escribir la marca o modelo para ver sugerencias automáticas (iPhone, Samsung, Huawei, MacBook, iPad, Apple Watch)
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Servicio realizado *</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            placeholder="Ej: Cambio de pantalla"
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valor Repuesto ($)</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatCLPInput(replacementCost)}
            onChange={(e) => handleReplacementCostChange(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Costo del repuesto en CLP (solo informativo - ya está incluido en el precio total)
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Precio Total Cobrado ($) *</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatCLPInput(precioTotal)}
            onChange={(e) => handlePrecioTotalChange(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            {paymentMethod === "EFECTIVO" 
              ? "Total cobrado al cliente en efectivo"
              : paymentMethod === "TARJETA" || paymentMethod === "TRANSFERENCIA"
              ? "Total cobrado al cliente (se aplicará descuento del 19% por impuesto automáticamente)"
              : "Total cobrado al cliente (incluye repuesto y mano de obra)"}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago (Opcional)</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="">Sin seleccionar (se puede agregar después)</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Puedes guardar la orden sin medio de pago y agregarlo después junto con el número de boleta
          </p>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Proveedor</label>
            <button
              type="button"
              onClick={() => setSupplierFormOpen((prev) => !prev)}
              className="text-xs text-brand hover:text-brand-dark"
            >
              {supplierFormOpen ? "Cancelar" : "Agregar proveedor"}
            </button>
          </div>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Seleccionar proveedor...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {supplierFormOpen && (
            <form
              onSubmit={handleQuickCreateSupplier}
              className="mt-3 space-y-2 border border-slate-200 rounded-md p-3 bg-slate-50"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nombre del proveedor *
                </label>
                <input
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Ej: Repuestos Rápidos"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contacto (opcional)
                </label>
                <input
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                  placeholder="Teléfono, Instagram, etc."
                />
              </div>
              {supplierError && (
                <p className="text-xs text-red-600">{supplierError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={creatingSupplier}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {creatingSupplier ? "Guardando..." : "Guardar y usar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierFormOpen(false);
                    setSupplierError(null);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-600 hover:bg-white"
                >
                  Cerrar
                </button>
              </div>
            </form>
          )}
          {!supplierFormOpen && supplierError && (
            <p className="text-xs text-red-600 mt-1">{supplierError}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            N° Recibo/Boleta (Opcional)
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2"
            placeholder="Ej: 12345 o pega el enlace de Bsale"
            value={receiptNumber}
            onPaste={(e) => {
              // Detectar cuando se pega contenido
              // Intentar obtener la URL del enlace primero (si es un hipervínculo)
              let pastedText = e.clipboardData.getData('text/plain');
              const pastedHtml = e.clipboardData.getData('text/html');
              
              // Si hay HTML, intentar extraer la URL del enlace
              if (pastedHtml && pastedHtml.includes('<a')) {
                const urlMatch = pastedHtml.match(/href=["']([^"']+)["']/i);
                if (urlMatch && urlMatch[1]) {
                  pastedText = urlMatch[1]; // Usar la URL del enlace
                }
              }
              
              if (pastedText) {
                const processed = processReceiptInput(pastedText);
                setReceiptNumber(processed.receiptNumber);
                setReceiptUrl(processed.receiptUrl);
                // Prevenir el comportamiento por defecto para manejar el paste manualmente
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              setReceiptNumber(value);
              
              // Si el usuario está escribiendo una URL, detectarla automáticamente
              if (isUrl(value)) {
                const processed = processReceiptInput(value);
                setReceiptNumber(processed.receiptNumber);
                setReceiptUrl(processed.receiptUrl);
              } else if (!receiptUrl) {
                // Si no es URL y no hay URL guardada, limpiar la URL
                setReceiptUrl('');
              }
            }}
          />
          <p className="text-xs text-slate-500 mt-1">
            Puedes pegar el enlace completo de Bsale y el sistema detectará automáticamente el número de recibo.
            {receiptUrl && (
              <span className="block mt-1 text-emerald-600">
                ✓ URL detectada: El número se mostrará como enlace clicable
              </span>
            )}
          </p>
        </div>

        {/* Campo de URL oculto o visible solo para edición manual */}
        {receiptUrl && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Link del Recibo (detectado automáticamente)
            </label>
            <input
              className="w-full border border-slate-300 rounded-md px-3 py-2 bg-slate-50"
              type="url"
              placeholder="https://..."
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              readOnly={false}
            />
            <p className="text-xs text-slate-500 mt-1">
              Puedes editar la URL si es necesario
            </p>
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
          <textarea
            className="w-full border border-slate-300 rounded-md px-3 py-2 min-h-[90px] resize-y"
            placeholder="Agrega observaciones relevantes para esta orden o descuentos de repuestos en stock..."
            value={initialNote}
            onChange={(e) => setInitialNote(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Las notas quedarán visibles solo dentro del detalle oculto de la orden.
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="text-sm">
          <span className="text-slate-600">Ganancia calculada (40%): </span>
          <span className="font-semibold text-brand">{formatCLP(commission)}</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-brand-light text-brand-white rounded-md hover:bg-white hover:text-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-brand-light hover:border-white font-medium"
        >
          {loading ? "Guardando..." : "Registrar Orden de Reparación"}
        </button>
      </div>
    </form>
  );
}

