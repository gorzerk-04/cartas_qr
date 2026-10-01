"use client";

import { useEffect, useRef } from "react";
import { Gift, X } from "lucide-react";
import { PublicLoyalty } from "../../types";
import { useEscapeKey } from "../../hooks/use-escape-key";

// Solo lectura: no pide datos ni registra nada (las visitas se registran en caja).
export default function LoyaltyInfoModal({
  loyalty,
  onClose,
}: {
  loyalty: PublicLoyalty;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscapeKey(onClose, true);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const minHours = loyalty.min_hours_between_visits ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="loyalty-info-title"
        data-testid="loyalty-info-modal"
        className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            <h2 id="loyalty-info-title" className="text-lg font-bold text-gray-900">
              Programa de fidelidad
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-base text-gray-800">
          Acumula <strong>{loyalty.visits_required} visitas</strong> y llévate:{" "}
          <strong>{loyalty.reward_description}</strong>.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
          <li>Da tu número de celular en caja en cada visita.</li>
          {minHours > 0 && (
            <li>
              Una visita cada {minHours} {minHours === 1 ? "hora" : "horas"}.
            </li>
          )}
        </ul>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
