"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Star } from "lucide-react";
import { useGoogleReviewSettings } from "../../hooks/use-google-reviews";

// Resumen del enlace de reseñas en "Info General". Solo se monta para el admin de
// plataforma (el dueño no ve nada de esta funcionalidad); se edita en "Reseñas de Google".
export default function GoogleReviewSummary({ restaurantId }: { restaurantId: string }) {
  const { data, isLoading, isError } = useGoogleReviewSettings(restaurantId);
  const activeUrl = data?.google_review_url_override || data?.google_review_url || null;

  return (
    <div data-testid="google-review-summary" className="sm:col-span-2 rounded-lg border border-[#2D3147] bg-[#0F1117] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <Star className="h-4 w-4 text-[#6366F1]" />
        Enlace de reseñas de Google
      </div>
      {isLoading ? (
        <Loader2 className="mt-2 h-4 w-4 animate-spin text-gray-500" />
      ) : isError ? (
        <p className="mt-2 text-xs text-red-400">No se pudo cargar el enlace de reseñas.</p>
      ) : activeUrl ? (
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-xs text-[#818CF8] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {activeUrl}
        </a>
      ) : (
        <p className="mt-2 text-xs text-gray-500">Sin enlace: la carta no muestra el botón de reseña.</p>
      )}
      <div className="mt-3">
        <Link
          href={`/admin/google-reviews?restaurant=${restaurantId}`}
          className="inline-flex items-center rounded-lg border border-[#2D3147] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1F2234] hover:text-white transition"
        >
          {activeUrl ? "Cambiar enlace" : "Configurar enlace"}
        </Link>
      </div>
    </div>
  );
}
