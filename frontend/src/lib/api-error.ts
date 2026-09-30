// El backend devuelve `detail` como string cuando es un HTTPException propio
// (ej. "Restaurante no encontrado"), pero como array de objetos Pydantic
// ({type, loc, msg, input, ctx}) cuando es un 422 de validación automática (ej. un
// email con formato inválido). Renderizar ese array directo como texto de React
// crashea con "Objects are not valid as a React child" — este helper normaliza
// ambos casos a un string legible.
export function getErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" ? item.msg : null))
      .filter((msg): msg is string => typeof msg === "string" && msg.length > 0);
    if (messages.length > 0) return messages.join(" — ");
  }

  return fallback;
}
