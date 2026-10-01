import { Gift } from "lucide-react";
import { PublicLoyalty } from "../../types";

// Solo se renderiza si el programa está activo (el backend omite `loyalty` si no lo está).
// Nunca muestra datos de comensales.
export default function LoyaltyBanner({ loyalty }: { loyalty: PublicLoyalty }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-4">
      <div
        data-testid="loyalty-banner"
        className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
        style={{
          borderColor: "var(--color-primary)",
          backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, white)",
        }}
      >
        <Gift className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--color-primary)" }} />
        <p className="text-gray-800">
          <span className="font-semibold">Programa de fidelidad:</span> {loyalty.visits_required} visitas ={" "}
          {loyalty.reward_description}. Pregunta en caja.
        </p>
      </div>
    </div>
  );
}
