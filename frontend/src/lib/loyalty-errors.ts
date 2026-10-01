import { getErrorCode, getErrorDetail, getErrorMessage } from "./api-error";
import { formatDateTime } from "./dates";

// Mensajes en español para los códigos de error del backend de fidelización.
const MESSAGES: Record<string, string> = {
  LOYALTY_PROGRAM_INACTIVE: "El programa de fidelización no está activo en este restaurante.",
  CUSTOMER_DATA_REQUIRED: "Es un comensal nuevo: ingresa su nombre y confirma su consentimiento.",
  INSUFFICIENT_VISITS: "Al comensal todavía le faltan visitas para canjear la recompensa.",
  VISIT_ALREADY_REDEEMED: "Esa visita ya fue consumida por un canje. Anula primero el canje.",
  VISIT_ALREADY_VOIDED: "Esa visita ya estaba anulada.",
  REDEMPTION_ALREADY_VOIDED: "Ese canje ya estaba anulado.",
  PHONE_ALREADY_REGISTERED: "Ya existe un comensal con ese celular en este restaurante.",
  INVALID_PHONE: "Celular inválido: usa 9 dígitos que empiecen con 9 (o el formato internacional con +).",
  INVALID_REWARD_PRODUCT: "El producto de la recompensa debe pertenecer a este restaurante.",
  CUSTOMER_NOT_FOUND: "No se encontró al comensal.",
  VISIT_NOT_FOUND: "No se encontró la visita.",
  REDEMPTION_NOT_FOUND: "No se encontró el canje.",
  PROGRAM_NOT_FOUND: "El restaurante todavía no configuró su programa de fidelización.",
};

export function getLoyaltyErrorMessage(error: unknown, fallback: string): string {
  const code = getErrorCode(error);

  if (code === "VISIT_COOLDOWN") {
    const nextAllowed = getErrorDetail(error)?.next_allowed_at;
    const when = typeof nextAllowed === "string" ? formatDateTime(nextAllowed) : null;
    return when
      ? `Ya registró una visita recientemente. Próxima desde: ${when}`
      : "Ya registró una visita recientemente.";
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  return getErrorMessage(error, fallback);
}
