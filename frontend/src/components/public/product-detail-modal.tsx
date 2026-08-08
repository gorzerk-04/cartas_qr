"use client";

import { X } from "lucide-react";
import { PublicProduct } from "../../types";

export default function ProductDetailModal({
  product,
  whatsapp,
  onClose,
}: {
  product: PublicProduct;
  whatsapp?: string;
  onClose: () => void;
}) {
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola! Me interesa el ${product.name} que vi en su carta digital`
      )}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-56 w-full object-cover" />
          ) : (
            <div className="h-24 w-full bg-gray-100" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
          {product.description && (
            <p className="mt-1 text-sm text-gray-600">{product.description}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
              S/ {product.price}
            </span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through">S/ {product.original_price}</span>
            )}
          </div>

          {product.status === "unavailable" && (
            <p className="mt-2 text-sm font-medium text-amber-600">No disponible por el momento</p>
          )}

          {(product.tags.length > 0 || product.allergens.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
              {product.allergens.map((allergen) => (
                <span key={allergen} className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600">
                  ⚠ {allergen}
                </span>
              ))}
            </div>
          )}

          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Preguntar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
