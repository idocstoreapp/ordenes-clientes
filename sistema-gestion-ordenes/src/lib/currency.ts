const clpNumberFormatter = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCLP(
  value: number | null | undefined,
  options?: { withLabel?: boolean }
) {
  const formatted = clpNumberFormatter.format(Number(value ?? 0));
  if (options?.withLabel === false) {
    return formatted;
  }
  return `CLP $${formatted}`;
}

export function formatCLPInput(value: number | "" | null | undefined) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  return clpNumberFormatter.format(Number(value));
}

export function parseCLPInput(raw: string) {
  if (!raw) return 0;
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}



