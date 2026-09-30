// El backend guarda y devuelve fechas en UTC SIN zona ("2026-09-30T15:00:00"). Sin la "Z",
// `new Date()` las interpretaría como hora local y se verían corridas varias horas.
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "—";
  return date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export function formatTime(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}
