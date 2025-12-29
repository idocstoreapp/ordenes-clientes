/**
 * Utilidades para calcular semanas de pago
 * 
 * PROBLEMA RESUELTO:
 * Las comisiones deben asignarse según la fecha de pago (paid_at), no la fecha de creación.
 * Una vez que una orden se marca como pagada, su semana de pago se fija permanentemente.
 * 
 * IMPORTANTE:
 * - Las semanas van de sábado (6) a viernes
 * - Una vez asignada, payout_week y payout_year nunca deben recalcularse
 * - Todos los reportes deben filtrar por payout_week/payout_year, NO por created_at
 */

import { startOfWeek, getWeek, getYear, setWeek, startOfYear } from "date-fns";

/**
 * Calcula el inicio de la semana de pago (sábado) para una fecha dada
 * Las semanas van de sábado a viernes
 */
export function getPayoutWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 6 }); // 6 = sábado
}

/**
 * Calcula el número de semana de pago para una fecha
 * Basado en semanas que empiezan en sábado (6)
 * 
 * IMPORTANTE: Debe coincidir con la lógica de calculate_payout_week() en PostgreSQL
 * 
 * @param paidAt - Fecha en que la orden fue pagada
 * @returns Número de semana (1-53) o null si no hay fecha
 */
export function calculatePayoutWeek(paidAt: Date | string | null | undefined): number | null {
  if (!paidAt) return null;
  
  const date = typeof paidAt === 'string' ? new Date(paidAt) : paidAt;
  if (isNaN(date.getTime())) return null;
  
  // Calcular el sábado de inicio de la semana para esta fecha
  // Las semanas van de sábado (6) a viernes
  const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado
  
  // Calcular días hacia atrás hasta el sábado anterior (inicio de semana)
  let daysToSubtract = 0;
  if (dayOfWeek === 6) {
    // Es sábado, no retroceder
    daysToSubtract = 0;
  } else if (dayOfWeek === 0) {
    // Es domingo, retroceder 1 día
    daysToSubtract = 1;
  } else {
    // Es lunes (1) a viernes (5), retroceder (dayOfWeek + 1) días
    daysToSubtract = dayOfWeek + 1;
  }
  
  // Obtener el sábado de inicio de la semana
  const weekStartSaturday = new Date(date);
  weekStartSaturday.setDate(weekStartSaturday.getDate() - daysToSubtract);
  weekStartSaturday.setHours(0, 0, 0, 0);
  
  // Para calcular el número de semana ISO, necesitamos agregar 1 día
  // porque ISO weeks empiezan en lunes, y nuestro sábado es el día antes del lunes
  const adjustedForISO = new Date(weekStartSaturday);
  adjustedForISO.setDate(adjustedForISO.getDate() + 1);
  
  // Calcular número de semana ISO (que cuenta desde lunes)
  return getWeek(adjustedForISO, { weekStartsOn: 1, firstWeekContainsDate: 4 });
}

/**
 * Calcula el año de pago para una fecha
 */
export function calculatePayoutYear(paidAt: Date | string | null | undefined): number | null {
  if (!paidAt) return null;
  
  const date = typeof paidAt === 'string' ? new Date(paidAt) : paidAt;
  if (isNaN(date.getTime())) return null;
  
  return getYear(date);
}

/**
 * Obtiene el rango de fechas (inicio y fin) para una semana de pago específica
 * 
 * @param week - Número de semana (1-53)
 * @param year - Año
 * @returns Objeto con start y end (Date)
 */
export function getPayoutWeekRange(week: number, year: number): { start: Date; end: Date } {
  // Crear fecha del 1 de enero del año
  const yearStart = startOfYear(new Date(year, 0, 1));
  
  // Encontrar el primer sábado del año (o antes si el 1 de enero no es sábado)
  let firstSaturday = new Date(yearStart);
  const firstDayOfYear = firstSaturday.getDay();
  
  // Si el 1 de enero es domingo (0), el sábado anterior es el 31 de diciembre del año anterior
  // Si es lunes (1), el sábado anterior es el 30 de diciembre
  // Si es sábado (6), ya es sábado
  // Calcular días a retroceder para llegar al sábado
  const daysToSubtract = firstDayOfYear === 0 ? 1 : firstDayOfYear === 6 ? 0 : firstDayOfYear + 1;
  firstSaturday.setDate(firstSaturday.getDate() - daysToSubtract);
  
  // Calcular inicio de la semana solicitada (sábado)
  const weekStart = new Date(firstSaturday);
  weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
  
  // El fin es el viernes siguiente
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Obtiene la semana de pago actual (basada en la fecha actual)
 */
export function getCurrentPayoutWeek(): { week: number; year: number } {
  const now = new Date();
  const week = calculatePayoutWeek(now);
  const year = calculatePayoutYear(now);
  
  return {
    week: week ?? 1,
    year: year ?? new Date().getFullYear(),
  };
}

/**
 * Compara si dos semanas de pago son iguales
 */
export function isSamePayoutWeek(
  week1: number | null,
  year1: number | null,
  week2: number | null,
  year2: number | null
): boolean {
  if (!week1 || !year1 || !week2 || !year2) return false;
  return week1 === week2 && year1 === year2;
}

