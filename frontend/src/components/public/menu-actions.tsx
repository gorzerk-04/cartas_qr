"use client";

import { useCallback, useState } from "react";
import { Gift, Star } from "lucide-react";
import { PublicLoyalty } from "../../types";
import LoyaltyInfoModal from "./loyalty-info-modal";

// Fila de acciones bajo la dirección (D14): "Programa de fidelidad" y "Déjanos tu reseña".
// El botón de reseña es igual para todos y no se vincula con la fidelización (D16).
// Si ninguno aplica, no se renderiza nada y la carta se ve igual que antes.
const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition hover:opacity-80";
const pillStyle = { borderColor: "var(--color-primary)", color: "var(--color-primary)" };

export default function MenuActions({
  loyalty,
  googleReviewUrl,
}: {
  loyalty?: PublicLoyalty | null;
  googleReviewUrl?: string | null;
}) {
  const [showLoyalty, setShowLoyalty] = useState(false);
  const closeLoyalty = useCallback(() => setShowLoyalty(false), []);

  if (!loyalty && !googleReviewUrl) return null;

  return (
    <>
      <div data-testid="menu-actions" className="mb-4 flex flex-wrap gap-2">
        {loyalty && (
          <button
            type="button"
            onClick={() => setShowLoyalty(true)}
            aria-label="Ver el programa de fidelidad"
            className={pillClass}
            style={pillStyle}
          >
            <Gift className="h-4 w-4" />
            Programa de fidelidad
          </button>
        )}
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Déjanos tu reseña en Google (se abre en una pestaña nueva)"
            className={pillClass}
            style={pillStyle}
          >
            <Star className="h-4 w-4" />
            Déjanos tu reseña
          </a>
        )}
      </div>
      {showLoyalty && loyalty && <LoyaltyInfoModal loyalty={loyalty} onClose={closeLoyalty} />}
    </>
  );
}
