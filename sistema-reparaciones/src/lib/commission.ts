export type PaymentMethod = "TARJETA" | "TRANSFERENCIA" | "EFECTIVO" | "";

export interface CommissionParams {
  paymentMethod: PaymentMethod;
  costoRepuesto: number; // F (Valor del repuesto - solo informativo)
  precioTotal: number; // Precio total cobrado (ya incluye repuesto y mano de obra)
}

/**
 * Calcula la comisión del técnico basada en la fórmula de Excel:
 * =SI(K4="TARJETA";(L4-F4)*0,4;SI(K4="TRANSFERENCIA";(L4-F4)*0,4;SI(K4="EFECTIVO";(G4-F4)*0,4;SI(K4="";0))))
 * 
 * Lógica:
 * - EFECTIVO: (precioTotal - costoRepuesto) * 0.4
 * - TARJETA: 
 *   1. Descontar 19% (dividir entre 1.19)
 *   2. Descontar 1.99% por comisión de tarjeta
 *   3. Restar el costo del repuesto
 *   4. Calcular el 40% de la ganancia resultante
 * - TRANSFERENCIA:
 *   1. Descontar 19% (dividir entre 1.19)
 *   2. Restar el costo del repuesto
 *   3. Calcular el 40% de la ganancia resultante
 * 
 * La comisión siempre es el 40% de la ganancia neta.
 */
export function calcCommission(params: CommissionParams): number {
  const { paymentMethod, costoRepuesto, precioTotal } = params;
  
  if (!paymentMethod) return 0;
  
  let precioDespuesConversion = precioTotal;
  
  // Para tarjeta/transferencia: aplicar descuentos
  if (paymentMethod === "TARJETA" || paymentMethod === "TRANSFERENCIA") {
    // 1. Descontar 19% (dividir entre 1.19)
    precioDespuesConversion = precioTotal / 1.19;
    
    // 2. Solo para TARJETA: descontar 1.99% por comisión de tarjeta
    if (paymentMethod === "TARJETA") {
      precioDespuesConversion = precioDespuesConversion * (1 - 0.0199);
    }
    // Para TRANSFERENCIA: no se aplica el 1.99%
  }
  // Para efectivo: usar el precio total sin conversión
  
  // Ganancia = precio (después de conversión si aplica) - costo del repuesto
  const ganancia = precioDespuesConversion - costoRepuesto;
  
  // Comisión = 40% de la ganancia neta
  const commission = Math.max(0, ganancia * 0.4);
  
  return commission;
}

