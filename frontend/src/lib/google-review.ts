// Refleja la normalización del backend (app/core/google_review.py) solo para el botón
// "Probar enlace" del panel: la validación real la hace el backend al guardar.
const PLACE_ID_RE = /^ChIJ[A-Za-z0-9_-]+$/;

export function googleReviewTestUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (PLACE_ID_RE.test(trimmed)) {
    return `https://search.google.com/local/writereview?placeid=${trimmed}`;
  }
  return /^https:\/\//i.test(trimmed) ? trimmed : null;
}
