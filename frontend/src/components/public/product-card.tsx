import { PublicProduct } from "../../types";

export default function ProductCard({
  product,
  onSelect,
}: {
  product: PublicProduct;
  onSelect: () => void;
}) {
  const isUnavailable = product.status === "unavailable";
  const hasDiscount =
    !!product.original_price && Number(product.original_price) > Number(product.price);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
        isUnavailable ? "opacity-50" : ""
      }`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900">{product.name}</p>
          {isUnavailable && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              No disponible
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{product.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
            S/ {product.price}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">S/ {product.original_price}</span>
          )}
        </div>
      </div>
    </button>
  );
}
