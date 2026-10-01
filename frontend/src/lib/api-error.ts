// El backend devuelve `detail` como string cuando es un HTTPException propio
// (ej. "Restaurante no encontrado"), pero como array de objetos Pydantic
// ({type, loc, msg, input, ctx}) cuando es un 422 de validación automática (ej. un
// email con formato inválido). Renderizar ese array directo como texto de React
// crashea con "Objects are not valid as a React child" — este helper normaliza
// ambos casos a un string legible.
export function getErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  // Errores con código: { code, message } (ej. PASSWORD_CHANGE_REQUIRED)
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" ? item.msg : null))
      .filter((msg): msg is string => typeof msg === "string" && msg.length > 0);
    if (messages.length > 0) return messages.join(" — ");
  }

  return fallback;
}

// Mensaje de un 422 de Pydantic para un campo concreto (loc termina en `field`), sin el
// prefijo "Value error, " que agrega Pydantic a los ValueError de los validadores.
export function getFieldErrorMessage(error: unknown, field: string): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
  if (!Array.isArray(detail)) return null;
  for (const item of detail) {
    const loc = item && typeof item === "object" ? (item as { loc?: unknown }).loc : null;
    const msg = item && typeof item === "object" ? (item as { msg?: unknown }).msg : null;
    if (Array.isArray(loc) && loc[loc.length - 1] === field && typeof msg === "string") {
      return msg.replace(/^Value error, /, "");
    }
  }
  return null;
}

// Código identificable del error (detail.code) cuando el backend lo envía.
export function getErrorCode(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const code = (detail as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

// Objeto `detail` completo cuando el backend lo envía como { code, message, ...extra }.
export function getErrorDetail(error: unknown): Record<string, unknown> | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    return detail as Record<string, unknown>;
  }
  return null;
}
