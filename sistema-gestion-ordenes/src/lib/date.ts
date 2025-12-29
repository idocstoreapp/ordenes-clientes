import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export function currentWeekRange(d = new Date()) {
  const start = startOfWeek(d, { weekStartsOn: 6 }); // sábado
  const end = endOfWeek(d, { weekStartsOn: 6 }); // viernes
  return { start, end };
}

export function currentMonthRange(d = new Date()) {
  return { 
    start: startOfMonth(d), 
    end: endOfMonth(d) 
  };
}

export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Validar que la fecha sea válida
  if (isNaN(d.getTime())) {
    return '';
  }
  return format(d, 'dd/MM/yyyy');
}

export function formatDateTime(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '';
  }
  return format(d, 'dd/MM/yyyy HH:mm');
}

export function dateToUTCStart(date: Date): Date {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  ));
}

export function dateToUTCEnd(date: Date): Date {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23, 59, 59, 999
  ));
}



